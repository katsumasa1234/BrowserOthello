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

export function clearSocketHandlers() {
  registeredListeners.forEach(({ eventName, handler }) => {
    socket.off(eventName, handler);
  });
  registeredListeners.length = 0;
}

function addListener(eventName, handler) {
  socket.on(eventName, handler);
  registeredListeners.push({ eventName, handler });
}

export function setSocketHandlers(handlers) {
  const eventMap = {
    onRoomCreated: 'room-created',
    onJoinedRoom: 'joined-room',
    onPlayerJoined: 'player-joined',
    onGameStart: 'game-start',
    onOpponentMove: 'opponent-move',
    onStonePlaced: 'stone-placed',
    onGameEnd: 'game-end',
    onError: 'error',
  };

  for (const [handlerName, eventName] of Object.entries(eventMap)) {
    const handler = handlers[handlerName];
    if (handler) {
      socket.off(eventName); // remove existing first
      socket.on(eventName, handler);
      registeredListeners.push({ eventName, handler });
    }
  }

  return () => {};
}

// Helper: ensure socket is connected, wait up to 10 seconds
function connectSocketAndWait() {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve(socket);
      return;
    }

    socket.connect();

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('接続がタイムアウトしました'));
    }, 10000);

    function onConnect() {
      clearTimeout(timeout);
      cleanup();
      resolve(socket);
    }

    function onError(err) {
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
  gameResult: null, // { winnerColor, blackScore, whiteScore, isDraw } - stored even after game ends
  mode: 'menu',
  difficulty: 'medium',
  myColor: BLACK,
  roomId: null,
  roomCode: null,
  isHost: false,
  opponentName: null,
  playerJoined: false, // host: has opponent joined?
  waitingForOpponent: false,
  playerName: '',
  showMenu: true,
  notification: null,
  multiplayerLeft: false, // track if current player left the game (not disconnect)
  connected: socket.connected,

  setNotification: (notif) => set({ notification: notif }),

  setWaitingForOpponent: (value) => set({ waitingForOpponent: value }),

  resetMultiplayerState: () => {
    set({
      roomId: null,
      roomCode: null,
      isHost: false,
      opponentName: null,
      playerJoined: false,
      waitingForOpponent: false,
      multiplayerLeft: false,
    });
  },

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
      gameResult: null,
      multiplayerLeft: false,
    });

    if (color === WHITE) {
      setTimeout(() => aiMove(), 500);
    }
  },

  startMultiplayerCreate: async (playerName) => {
    try {
      const sock = await connectSocketAndWait();

      set({
        mode: 'multiplayer',
        playerName,
        isHost: true,
        waitingForOpponent: true,
        showMenu: false,
        notification: null,
        roomId: null,
        roomCode: null,
        opponentName: null,
        playerJoined: false,
        gameResult: null,
        multiplayerLeft: false,
      });

      sock.emit('create-room', { playerName });
    } catch (err) {
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

      set({
        mode: 'multiplayer',
        playerName,
        roomCode,
        isHost: false,
        waitingForOpponent: true,
        showMenu: false,
        notification: null,
        gameResult: null,
        multiplayerLeft: false,
      });

      sock.emit('join-room', { roomCode, playerName });
    } catch (err) {
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

      set({
        mode: 'multiplayer',
        playerName,
        isHost: false,
        waitingForOpponent: true,
        showMenu: false,
        roomId: null,
        roomCode: null,
        gameResult: null,
        multiplayerLeft: false,
      });

      sock.emit('find-opponent', { playerName });
    } catch (err) {
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
      useGameStore.setState({ game: cloneGame(newGame), notification: null });

      // AI's turn
      if (newGame.currentPlayer !== state.myColor && !newGame.gameOver) {
        setTimeout(() => aiMove(), 300);
      }
    } else {
      // Multiplayer mode - send to server
      const isValid = state.game.validMoves.some(m => m.row === row && m.col === col);
      if (!isValid) return;

      socket.emit('place-stone', {
        roomId: state.roomId,
        move: { row, col }
      });
    }
  },

  leaveGame: () => {
    const state = get();

    if (state.mode === 'ai') {
      // AI game - just return to menu
      set({
        mode: 'menu',
        game: null,
        showMenu: true,
        roomId: null,
        roomCode: null,
        waitingForOpponent: false,
      });
    } else if (state.mode === 'multiplayer' && state.game) {
      // Multiplayer game in progress - notify server of disconnect
      if (socket.connected) {
        socket.emit('leave-room');
      }
      set({ multiplayerLeft: true, showMenu: true });
    } else if (state.mode === 'multiplayer') {
      // Was in lobby/waiting - just reset
      useGameStore.getState().resetMultiplayerState();
      set({ mode: 'menu', showMenu: true });
    }
  },

  disconnectFromGame: () => {
    const state = get();
    if (state.mode === 'multiplayer' && state.game) {
      // Opponent disconnected - keep game result visible
      set({
        notification: { message: '相手が接続を切断しました', timestamp: Date.now() },
        multiplayerLeft: true,
        showMenu: true,
      });
    } else if (state.mode === 'multiplayer') {
      useGameStore.getState().resetMultiplayerState();
      set({ mode: 'menu', showMenu: true });
    }
  },

  returnToMenu: () => {
    // Safe way to return to main menu from any state
    useGameStore.getState().resetMultiplayerState();
    set({
      mode: 'menu',
      game: null,
      gameResult: null,
      showMenu: true,
    });
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
