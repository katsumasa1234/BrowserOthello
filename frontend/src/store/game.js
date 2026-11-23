import { create } from 'zustand';
import { createGame, cloneGame, applyMove } from '../engine/othello.js';
import { getAIMove } from '../ai/ai.js';
import socketService from '../services/socket.js';

const BLACK = 1;
const WHITE = 2;

// Direct socket reference - no getter indirection
const socket = socketService.getSocket();

// Track all socket listeners for cleanup
const registeredListeners = [];

function registerListener(eventName, handler) {
  console.log('[Store] Registering listener:', eventName);
  socket.on(eventName, handler);
  registeredListeners.push({ eventName, handler });
}

export function clearSocketHandlers() {
  console.log('[Store] Clearing all', registeredListeners.length, 'listeners');
  registeredListeners.forEach(({ eventName, handler }) => {
    socket.off(eventName, handler);
  });
  registeredListeners.length = 0;
}

// Helper: ensure socket is connected, wait up to 10 seconds
function connectSocketAndWait() {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      console.log('[Store] Socket already connected:', socket.id);
      resolve(socket);
      return;
    }

    console.log('[Store] Connecting socket...');
    // Start connection if not already started
    socket.connect();

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Socket connection timed out'));
    }, 10000);

    function onConnect() {
      console.log('[Store] Socket connected:', socket.id);
      clearTimeout(timeout);
      cleanup();
      resolve(socket);
    }

    function onError(err) {
      console.error('[Store] Socket connection error:', err.message);
      clearTimeout(timeout);
      cleanup();
      reject(err);
    }

    function cleanup() {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    }

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
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
  setNotification: (notif) => set({ notification: notif }),

  startAIGame: (difficulty, color = BLACK) => {
    set({
      mode: 'ai',
      game: cloneGame(createGame()),
      difficulty,
      myColor: color,
      showMenu: false,
      notification: null,
      waitingForOpponent: false,
      roomId: null,
      roomCode: null,
    });

    if (color === WHITE) {
      setTimeout(() => aiMove(), 500);
    }
  },

  startMultiplayerCreate: async (playerName) => {
    try {
      console.log('[Store] >>> startMultiplayerCreate called, socket.connected:', socket.connected);
      const sock = await connectSocketAndWait();
      console.log('[Store] >>> Socket connected via connectSocketAndWait, emitting create-room...');
      
      set({
        mode: 'multiplayer',
        playerName,
        isHost: true,
        waitingForOpponent: true,
        showMenu: false,
        notification: null,
      });
      
      sock.emit('create-room', { playerName });
      console.log('[Store] >>> create-room emitted successfully');
    } catch (err) {
      console.error('[Store] startMultiplayerCreate error:', err.message);
      set({
        waitingForOpponent: false,
        mode: 'menu',
        notification: { message: `接続エラー: サーバーに接続できません`, timestamp: Date.now() },
      });
    }
  },

  joinMultiplayer: async (roomCode, playerName) => {
    try {
      const sock = await connectSocketAndWait();
      console.log('[Store] Emitting join-room:', roomCode);
      
      set({
        mode: 'multiplayer',
        playerName,
        roomCode,
        isHost: false,
        waitingForOpponent: true,
        showMenu: false,
        notification: null,
      });
      
      sock.emit('join-room', { roomCode, playerName });
    } catch (err) {
      console.error('[Store] joinMultiplayer error:', err.message);
      set({
        waitingForOpponent: false,
        mode: 'menu',
        notification: { message: `接続エラー: サーバーに接続できません`, timestamp: Date.now() },
      });
    }
  },

  findOpponent: async (playerName) => {
    try {
      const sock = await connectSocketAndWait();
      console.log('[Store] Emitting find-opponent');
      
      set({
        mode: 'multiplayer',
        playerName,
        isHost: false,
        waitingForOpponent: true,
        showMenu: false,
        roomId: null,
        roomCode: null,
        notification: null,
      });
      
      sock.emit('find-opponent', { playerName });
    } catch (err) {
      console.error('[Store] findOpponent error:', err.message);
      set({
        waitingForOpponent: false,
        mode: 'menu',
        notification: { message: `接続エラー: サーバーに接続できません`, timestamp: Date.now() },
      });
    }
  },

  acceptGame: async (roomCode) => {
    try {
      const sock = await connectSocketAndWait();
      console.log('[Store] Emitting accept-game:', roomCode);
      sock.emit('accept-game', { roomCode });
    } catch (err) {
      set({ notification: { message: '接続に失敗しました', timestamp: Date.now() } });
    }
  },

  placeStone: (row, col) => {
    const state = get();
    if (!state.game || state.game.gameOver) return;

    if (state.mode === 'ai') {
      if (state.game.currentPlayer !== state.myColor) return;
      const isValid = state.game.validMoves.some(m => m.row === row && m.col === col);
      if (!isValid) return;

      const newGame = applyMove(state.game, { row, col });
      set({ game: cloneGame(newGame), notification: null });

      if (!newGame.gameOver && newGame.currentPlayer !== state.myColor) {
        setTimeout(() => aiMove(), 300);
      }
    } else if (state.mode === 'multiplayer') {
      console.log('[Store] Emitting place-stone:', { roomId: state.roomId, move: { row, col } });
      socket.emit('place-stone', {
        roomId: state.roomId,
        move: { row, col }
      });
    }
  },

  leaveGame: () => {
    clearSocketHandlers();
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

    if (handlers.onRoomCreated) {
      registerListener('room-created', (data) => {
        console.log('[Store] onRoomCreated event received:', data);
        handlers.onRoomCreated(data);
      });
    }
    if (handlers.onJoinedRoom) {
      registerListener('joined-room', (data) => {
        console.log('[Store] onJoinedRoom event received:', data);
        handlers.onJoinedRoom(data);
      });
    }
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
