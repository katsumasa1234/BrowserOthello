import { useEffect, useCallback } from 'react';
import useGameStore, { clearSocketHandlers } from './store/game.js';
import socketService from './services/socket.js';
import Menu from './components/Menu';
import GameBoard from './components/GameBoard';

const store = useGameStore;

function App() {
  const {
    mode, game, setSocketHandlers, notification, setNotification,
    disconnectFromGame, returnToMenu, playerJoined, roomId, roomCode
  } = useGameStore();

  console.log('[App] Rendered - game:', !!game, 'mode:', mode, 'playerJoined:', playerJoined);

  // Show toast notification for a few seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      store.setState({ notification: null });
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Clear old handlers before setting new ones
  useEffect(() => {
    clearSocketHandlers();
    return () => clearSocketHandlers();
  }, []);

  const handleRoomCreated = useCallback((data) => {
    console.log('[App] ✅ Room created:', data);
    if (data && data.roomCode) {
      store.setState({
        roomId: data.roomId,
        roomCode: data.roomCode,
        isHost: true,
        playerJoined: false,
        waitingForOpponent: true,
      });
    }
  }, []);

  const handleJoinedRoom = useCallback((data) => {
    console.log('[App] ✅ Joined room:', data);
    if (data && data.roomCode) {
      store.setState({
        roomId: data.roomId,
        roomCode: data.roomCode,
        opponentName: data.opponentName,
        waitingForOpponent: true,
      });
    }
  }, []);

  const handlePlayerJoined = useCallback((data) => {
    console.log('[App] Player joined:', data);
    if (data && data.isHost) {
      store.setState({ playerJoined: true });
    } else if (data && !data.isHost) {
      store.setState({ opponentName: data.player });
    }
  }, []);

  const handleGameStart = useCallback((data) => {
    console.log('[App] Game start:', data);
    store.setState({
      game: data.game,
      myColor: data.myColor,
      opponentName: data.opponentName,
      roomId: data.roomId,
      waitingForOpponent: false,
      playerJoined: false,
      notification: null,
    });
  }, []);

  const handleOpponentMove = useCallback((data) => {
    store.setState({ game: data.newGame });
  }, []);

  const handleStonePlaced = useCallback((data) => {
    store.setState({ game: data.newGame });
  }, []);

  const handleGameEnd = useCallback((data) => {
    console.log('[App] Game end:', data);
    store.setState({
      game: data.game,
      waitingForOpponent: false,
      playerJoined: false,
    });
  }, []);

  const handleError = useCallback((data) => {
    if (data && data.message) {
      setNotification({ message: data.message, timestamp: Date.now() });
    }
  }, [setNotification]);

  const handleDisconnect = useCallback(() => {
    // Socket physically disconnected
    console.log('[App] Socket disconnected');
    store.setState({ connected: false });
  }, []);

  const handleReconnect = useCallback(() => {
    console.log('[App] Socket reconnected');
    store.setState({ connected: true });
  }, []);

  useEffect(() => {
    setSocketHandlers({
      onRoomCreated: handleRoomCreated,
      onJoinedRoom: handleJoinedRoom,
      onPlayerJoined: handlePlayerJoined,
      onGameStart: handleGameStart,
      onOpponentMove: handleOpponentMove,
      onStonePlaced: handleStonePlaced,
      onGameEnd: handleGameEnd,
      onError: handleError,
    });

    // Handle disconnection events separately
    const socket = socketService.getSocket();
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);

    return () => {
      clearSocketHandlers();
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
    };
  }, [setSocketHandlers]);

  // Determine what to show:
  // - If in menu mode → Menu
  // - If game exists (even if over) → GameBoard (to show result)
  // - If waitingForOpponent but no game → Menu (showing waiting state)
  // - If disconnected from game → Menu (showing disconnect message)
  const shouldShowMenu = mode === 'menu' || (!game && (mode !== 'multiplayer' || store.getState().waitingForOpponent));

  if (shouldShowMenu) {
    return <Menu />;
  }

  return <GameBoard />;
}

export default App;
