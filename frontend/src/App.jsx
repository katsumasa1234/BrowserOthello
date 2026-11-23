import { useEffect, useCallback } from 'react';
import useGameStore, { clearSocketHandlers } from './store/game.js';
import socketService from './services/socket.js';
import Menu from './components/Menu';
import GameBoard from './components/GameBoard';
import './styles/index.css';

const store = useGameStore;

function App() {
  const {
    mode, game, setSocketHandlers, playerName,
    setRoomCode, leaveGame, roomCode, waitingForOpponent, notification, setNotification
  } = useGameStore();

  // Show toast notification for a few seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      store.setState({ notification: null });
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleRoomCreated = useCallback((data) => {
    console.log('✅ Room created:', data);
    if (data && data.roomCode) {
      setRoomCode(data.roomCode);
      store.setState({
        roomId: data.roomId,
        roomCode: data.roomCode,
        waitingForOpponent: true,
      });
    } else {
      console.error('Invalid room-created event:', data);
    }
  }, [setRoomCode]);

  const handleJoinedRoom = useCallback((data) => {
    console.log('✅ Joined room:', data);
    if (data && data.roomCode) {
      store.setState({
        roomId: data.roomId,
        roomCode: data.roomCode,
        opponentName: data.opponentName,
        waitingForOpponent: true,
      });
    } else {
      console.error('Invalid joined-room event:', data);
    }
  }, []);

  const handlePlayerJoined = useCallback((data) => {
    console.log('✅ Player joined:', data);
  }, []);

  const handleGameStart = useCallback((data) => {
    console.log('✅ Game start:', data);
    store.setState({
      game: data.game,
      myColor: data.myColor,
      opponentName: data.opponentName,
      roomId: data.roomId,
      waitingForOpponent: false,
    });
  }, []);

  const handleOpponentMove = useCallback((data) => {
    store.setState({ game: data.newGame });
  }, []);

  const handleStonePlaced = useCallback((data) => {
    store.setState({ game: data.newGame });
  }, []);

  const handleGameEnd = useCallback((data) => {
    console.log('✅ Game end:', data);
    store.setState({
      game: data.game,
      waitingForOpponent: false,
    });
  }, []);

  const handleError = useCallback((data) => {
    console.error('❌ Error from server:', data);
    if (data && data.message) {
      setNotification({ message: data.message, timestamp: Date.now() });
    }
  }, [setNotification]);

  const handlePlayerLeft = useCallback(() => {
    console.log('Opponent left');
    store.setState({ waitingForOpponent: false });
  }, []);

  const handleHostDisconnected = useCallback(() => {
    setNotification({ message: 'ホストが切断されました', timestamp: Date.now() });
    store.setState({ waitingForOpponent: false, mode: 'menu' });
  }, [setNotification]);

  useEffect(() => {
    // Set up socket connection first
    const socket = socketService.getSocket();

    // Check if socket is actually connected
    console.log('🔌 Socket connected:', socket.connected);
    console.log('🔌 Socket id:', socket.id);

    setSocketHandlers({
      onRoomCreated: handleRoomCreated,
      onJoinedRoom: handleJoinedRoom,
      onPlayerJoined: handlePlayerJoined,
      onGameStart: handleGameStart,
      onOpponentMove: handleOpponentMove,
      onStonePlaced: handleStonePlaced,
      onGameEnd: handleGameEnd,
      onError: handleError,
      onOpponentLeft: handlePlayerLeft,
      onHostDisconnected: handleHostDisconnected,
    });

    return () => {
      clearSocketHandlers();
    };
  }, [setSocketHandlers]);

  // Show menu if no game started yet OR in multiplayer waiting state
  const shouldShowMenu = !game;

  if (shouldShowMenu) {
    return <Menu />;
  }

  return <GameBoard />;
}

export default App;
