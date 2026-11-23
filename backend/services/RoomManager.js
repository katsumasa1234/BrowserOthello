import { v4 as uuidv4 } from 'uuid';
import { createGame, applyMove, cloneGame } from '../../shared/othello.js';

// Generate 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

class RoomManager {
  constructor(io) {
    this.io = io;
    // roomId -> { room, socket1, socket2, game, started, playerNames }
    this.rooms = new Map();
    // Matchmaking queue for random matching
    this.matchQueue = [];
  }

  createRoom(socket, playerName) {
    const roomCode = generateRoomCode();
    const roomId = uuidv4();
    
    const room = {
      roomId,
      roomCode,
      status: 'waiting', // waiting, playing, finished
      hostId: socket.id,
    };

    this.rooms.set(roomId, {
      ...room,
      game: null,
      playerNames: [playerName],
      sockets: new Map([[socket.id, { socket, name: playerName, color: 1 }]])
    });

    socket.join(roomId);
    socket.to(roomId).emit('player-joined', { 
      player: playerName, 
      isHost: false 
    });

    socket.emit('room-created', { roomCode, roomId });
  }

  joinRoom(socket, roomCode, playerName) {
    // Find room by code
    let targetRoom = null;
    for (const [roomId, room] of this.rooms) {
      if (room.roomCode === roomCode && room.status !== 'finished') {
        targetRoom = { roomId, ...room };
        break;
      }
    }

    if (!targetRoom) {
      socket.emit('error', { message: 'ルームが見つかりません。' });
      return;
    }

    const { roomId } = targetRoom;
    const room = this.rooms.get(roomId);

    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'ゲームはすでに開始されています。' });
      return;
    }

    // Find host socket and rejoin if disconnected
    let hostSocket = null;
    if (room.sockets.has(room.hostId)) {
      hostSocket = room.sockets.get(room.hostId).socket;
    } else {
      // Host may have been using old socket id, find by looking at namespace
      hostSocket = this.io.sockets.sockets.get(room.hostId);
    }

    if (!hostSocket) {
      socket.emit('error', { message: 'ホストが切断されました。' });
      return;
    }

    room.sockets.set(socket.id, { socket, name: playerName, color: 2 });
    room.playerNames.push(playerName);

    // Tell host a player joined
    hostSocket.emit('player-joined', { 
      player: playerName, 
      isHost: true 
    });

    // Tell joining player they joined successfully
    socket.join(roomId);
    socket.emit('joined-room', { roomCode, roomId, opponentName: room.playerNames[0] });
  }

  acceptGame(socket, roomCode) {
    let targetRoom = null;
    for (const [roomId, room] of this.rooms) {
      if (room.roomCode === roomCode) {
        targetRoom = { roomId, ...room };
        break;
      }
    }

    if (!targetRoom || targetRoom.status !== 'waiting') return;

    const room = this.rooms.get(targetRoom.roomId);
    
    // Check both players are connected
    const sockets = Array.from(room.sockets.values());
    if (sockets.length < 2) return;

    // Start game
    room.game = cloneGame(createGame());
    room.status = 'playing';

    const socket1 = room.sockets.get(sockets[0].socket.id);
    const socket2 = room.sockets.get(sockets[1].socket.id);

    // Each player gets their color info
    this.io.to(sockets[0].socket.id).emit('game-start', {
      game: room.game,
      myColor: 1,
      opponentName: socket2.name,
      roomId: targetRoom.roomId,
    });

    this.io.to(sockets[1].socket.id).emit('game-start', {
      game: room.game,
      myColor: 2,
      opponentName: socket1.name,
      roomId: targetRoom.roomId,
    });
  }

  placeStone(socket, roomId, move) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    const gameState = room.game;
    
    // Validate move
    const isValid = gameState.validMoves.some(m => m.row === move.row && m.col === move.col);
    if (!isValid) {
      socket.emit('error', { message: 'その場所は合法な手ではありません。' });
      return;
    }

    const newGame = applyMove(gameState, move);
    room.game = newGame;

    // Find the other player
    const mySocketEntry = room.sockets.get(socket.id);
    if (!mySocketEntry) return;

    let otherPlayer = null;
    for (const [, entry] of room.sockets) {
      if (entry.socket.id !== socket.id) {
        otherPlayer = entry;
        break;
      }
    }

    if (!otherPlayer) return;

    // Send updated game state to both players
    this.io.to(otherPlayer.socket.id).emit('opponent-move', {
      move: { row: move.row, col: move.col },
      newGame: newGame,
    });

    socket.emit('stone-placed', {
      move,
      newGame,
    });

    // Game over?
    if (newGame.gameOver) {
      room.status = 'finished';
      const winnerName = newGame.winner === 1 ? mySocketEntry.name : 
                         newGame.winner === 2 ? otherPlayer.name : null;
      
      this.io.to(roomId).emit('game-end', {
        game: newGame,
        winner: newGame.winner,
        winnerName: winnerName || '引き分け',
        scores: newGame.score,
      });
    }
  }

  leaveRoom(socket) {
    for (const [roomId, room] of this.rooms) {
      if (room.sockets.has(socket.id)) {
        const myEntry = room.sockets.get(socket.id);
        room.sockets.delete(socket.id);
        
        const otherPlayer = Array.from(room.sockets.values())[0];
        
        if (otherPlayer) {
          // Notify the remaining player that the opponent left
          this.io.to(otherPlayer.socket.id).emit('opponent-left', {
            message: '相手がゲームから離脱しました',
          });
          // Leave the room open so the remaining player can see the result
        } else {
          this.rooms.delete(roomId);
        }
        break;
      }
    }
  }

  handleDisconnect(socket) {
    // Remove from matchmaking queue
    this.removeFromQueue(socket);

    for (const [roomId, room] of this.rooms) {
      if (room.sockets.has(socket.id)) {
        const otherPlayers = Array.from(room.sockets.values()).filter(
          e => e.socket.id !== socket.id
        );

        if (otherPlayers[0]) {
          // Notify the remaining player that the opponent disconnected
          this.io.to(otherPlayers[0].socket.id).emit('opponent-left', {
            message: '相手が接続を切断しました',
          });
        } else if (room.status === 'waiting') {
          // Only player in room disconnected while waiting
          const hostSocket = this.io.sockets.sockets.get(room.hostId);
          if (hostSocket && hostSocket.id !== socket.id) {
            this.io.to(hostSocket.id).emit('error', { message: '相手が切断されました' });
          }
          this.rooms.delete(roomId);
        } else {
          // Only player in room disconnected during playing
          this.rooms.delete(roomId);
        }

        break;
      }
    }
  }

  findOpponent(socket, playerName) {
    // Save playerName on socket for future use
    if (playerName) {
      socket.data.playerName = playerName;
    }

    // Add to matching queue
    const queueEntry = { socket, name: playerName || 'Player' };
    this.matchQueue.push(queueEntry);

    // Try to find a match in the queue
    if (this.matchQueue.length >= 2) {
      const player1 = this.matchQueue.shift();
      const player2 = this.matchQueue.shift();

      // Create a new room for the matched players
      const roomCode = generateRoomCode();
      const roomId = uuidv4();

      const room = {
        roomId,
        roomCode,
        status: 'waiting',
        hostId: player1.socket.id,
        game: null,
        playerNames: [player1.name, player2.name],
        sockets: new Map([
          [player1.socket.id, { socket: player1.socket, name: player1.name, color: 1 }],
          [player2.socket.id, { socket: player2.socket, name: player2.name, color: 2 }],
        ]),
      };

      this.rooms.set(roomId, room);

      // Join both players to the room
      player1.socket.join(roomId);
      player2.socket.join(roomId);

      // Notify host (player1)
      player1.socket.emit('room-created', { roomCode, roomId });

      // Notify host that the second player has joined
      player1.socket.emit('player-joined', { 
        player: player2.name, 
        isHost: true 
      });

      // Notify joiner (player2) - now with real opponent name
      player2.socket.emit('joined-room', { roomCode, roomId, opponentName: player1.name });
    }
  }

  removeFromQueue(socket) {
    const idx = this.matchQueue.findIndex(entry => entry.socket.id === socket.id);
    if (idx !== -1) {
      this.matchQueue.splice(idx, 1);
    }
  }
}

export default RoomManager;
