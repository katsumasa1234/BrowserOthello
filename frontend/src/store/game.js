import { create } from 'zustand';
import { createGame, cloneGame, applyMove } from '../engine/othello.js';
import { getAIMove } from '../ai/ai.js';
import { getSocket } from '../services/socket.js';

const BLACK = 1;
const WHITE = 2;

// Track all socket listeners for cleanup
const registeredListeners = [];

function registerListener(eventName, handler) {
  const socket = getSocket();
  socket.on(eventName, handler);
  registeredListeners.push({ eventName, handler });
}

export function clearSocketHandlers() {
  registeredListeners.forEach(({ eventName, handler }) => {
    getSocket().off(eventName, handler);
  });
  registeredListeners.length = 0;
}

const useGameStore = create((set, get) => ({
  game: null,
  mode: 'menu',
  difficulty: 'medium',
  myColor: BLACK,
  roomId: null,
  roomCode: null,
  isHost: false,
  waitingForOpponent: false,
  playerName: '',
  opponentName: null,
  showMenu: true,
  notification: null,

  setRoomCode: (code) => set({ roomCode: code }),
  setWaitingForOpponent: (val) => set({ waitingForOpponent: val }),

  startAIGame: (difficulty, color = BLACK) => {
    set({ 
      mode: 'ai',
      game: cloneGame(createGame()),
      difficulty,
      myColor: color,
      showMenu: false,
      notification: null,
    });

    if (color === WHITE) {
      setTimeout(() => aiMove(), 500);
    }
  },

  startMultiplayerCreate: (playerName) => {
    const socket = getSocket();
    set({ 
      mode: 'multiplayer',
      playerName,
      isHost: true,
      waitingForOpponent: true,
      showMenu: false,
    });
    socket.emit('create-room', { playerName });
  },

  joinMultiplayer: (roomCode, playerName) => {
    const socket = getSocket();
    set({ 
      mode: 'multiplayer',
      playerName,
      roomCode,
      isHost: false,
      waitingForOpponent: true,
      showMenu: false,
    });
    socket.emit('join-room', { roomCode, playerName });
  },

  findOpponent: (playerName) => {
    const socket = getSocket();
    // Store player name in socket data for matchmaking
    socket.data = { playerName };
    set({ 
      mode: 'multiplayer',
      playerName,
      isHost: false,
      waitingForOpponent: true,
      showMenu: false,
    });
    socket.emit('find-opponent', { playerName });
  },

  acceptGame: (roomCode) => {
    const socket = getSocket();
    socket.emit('accept-game', { roomCode });
  },

  placeStone: (row, col) => {
    const { game, mode, myColor } = get();
    if (!game || game.gameOver) return;

    if (mode === 'ai') {
      if (game.currentPlayer !== myColor) return;
      const isValid = game.validMoves.some(m => m.row === row && m.col === col);
      if (!isValid) return;
      
      const newGame = applyMove(game, { row, col });
      set({ game: cloneGame(newGame), notification: null });

      if (!newGame.gameOver && newGame.currentPlayer !== myColor) {
        setTimeout(() => aiMove(), 300);
      }
    } else if (mode === 'multiplayer') {
      const socket = getSocket();
      socket.emit('place-stone', { 
        roomId: get().roomId, 
        move: { row, col }
      });
    }
  },

  leaveGame: () => {
    clearSocketHandlers();
    const socket = getSocket();
    socket.emit('leave-room');
    set({ 
      mode: 'menu',
      game: null,
      roomId: null,
      roomCode: null,
      isHost: false,
      waitingForOpponent: false,
      opponentName: null,
      showMenu: true,
      notification: null,
    });
  },

  setSocketHandlers: (handlers) => {
    // Clear previous listeners first to prevent duplicates
    clearSocketHandlers();
    
    if (handlers.onRoomCreated) registerListener('room-created', handlers.onRoomCreated);
    if (handlers.onJoinedRoom) registerListener('joined-room', handlers.onJoinedRoom);
    if (handlers.onPlayerJoined) registerListener('player-joined', handlers.onPlayerJoined);
    if (handlers.onGameStart) registerListener('game-start', handlers.onGameStart);
    if (handlers.onOpponentMove) registerListener('opponent-move', handlers.onOpponentMove);
    if (handlers.onStonePlaced) registerListener('stone-placed', handlers.onStonePlaced);
    if (handlers.onGameEnd) registerListener('game-end', handlers.onGameEnd);
    if (handlers.onError) registerListener('error', handlers.onError);
    if (handlers.onOpponentLeft) registerListener('opponent-left', handlers.onOpponentLeft);
    if (handlers.onHostDisconnected) registerListener('host-disconnected', handlers.onHostDisconnected);
  },

  clearNotification: () => set({ notification: null }),
}));

// Module-level AI move function uses getState() which is available on the created store
function aiMove() {
  const state = useGameStore.getState();
  const { game, mode, myColor, difficulty } = state;
  if (!game || mode !== 'ai' || game.gameOver) return;

  const aiColor = myColor === BLACK ? WHITE : BLACK;
  if (game.currentPlayer !== aiColor) return;

  const move = getAIMove(game, aiColor, difficulty);
  
  if (move) {
    const newGame = applyMove(game, move);
    useGameStore.setState({ game: cloneGame(newGame), notification: null });
    
    // If AI played and now it's again the AI's turn (auto-pass by opponent), keep going
    if (newGame.currentPlayer === aiColor && !newGame.gameOver) {
      setTimeout(() => aiMove(), 300);
    }
  }
}

export default useGameStore;
