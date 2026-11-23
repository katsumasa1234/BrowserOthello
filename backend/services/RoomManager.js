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
    
    // Only host can accept
    if (socket.id !== room.hostId) return;

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
          // Check if host left - remaining player wins
          if (socket.id === room.hostId) {
            this.io.to(otherPlayer.socket.id).emit('game-end', {
              winner: otherPlayer.color,
              winnerName: otherPlayer.name + ' (勝利：相手が離脱)',
              scores: null,
            });
            this.rooms.delete(roomId);
          } else {
            // Player left, tell host they win
            const hostEntry = room.sockets.get(room.hostId);
            if (hostEntry) {
              this.io.to(room.hostId).emit('game-end', {
                winner: hostEntry.color,
                winnerName: hostEntry.name + ' (勝利：相手が離脱)',
                scores: null,
              });
              this.rooms.delete(roomId);
            } else {
              // Host also gone
              this.rooms.delete(roomId);
            }
          }
        } else {
          this.rooms.delete(roomId);
        }
        break;
      }
    }
  }

  handleDisconnect(socket) {
    for (const [roomId, room] of this.rooms) {
      if (room.sockets.has(socket.id)) {
        const otherPlayers = Array.from(room.sockets.values()).filter(
          e => e.socket.id !== socket.id
        );

        if (socket.id === room.hostId && otherPlayers[0]) {
          // Host disconnected, remaining player wins
          this.io.to(otherPlayers[0].socket.id).emit('game-end', {
            winner: otherPlayers[0].color,
            winnerName: otherPlayers[0].name + ' (勝利：相手が切断)',
            scores: null,
            reason: 'host-disconnected',
          });
          this.rooms.delete(roomId);
        } else if (otherPlayers[0] && socket.id !== room.hostId) {
          // Player disconnected, host wins
          const hostSocket = this.io.sockets.sockets.get(room.hostId);
          if (hostSocket) {
            const hostEntry = room.sockets.get(room.hostId);
            if (hostEntry) {
              this.io.to(room.hostId).emit('game-end', {
                winner: hostEntry.color,
                winnerName: hostEntry.name + ' (勝利：相手が切断)',
                scores: null,
                reason: 'opponent-disconnected',
              });
              this.rooms.delete(roomId);
            } else {
              // Host socket also gone — remove room
              this.rooms.delete(roomId);
            }
          }
        } else if (otherPlayers.length === 0) {
          // Only player in room disconnected
          this.rooms.delete(roomId);
        }

        break;
      }
    }
  }

  findOpponent(socket) {
    // Find an available room
    for (const [roomId, room] of this.rooms) {
      if (room.status === 'waiting' && !room.sockets.has(socket.id)) {
        const sockets = Array.from(room.sockets.values());
        if (sockets.length >= 2) continue;

        const hostEntry = room.sockets.get(room.hostId);
        if (!hostEntry) continue;

        // Join the room
        this.joinRoom(socket, room.roomCode, socket.data?.playerName || 'Player');
        return;
      }
    }

    socket.emit('error', { message: '現在、利用可能な部屋がありません。' });
  }
}

export default RoomManager;
