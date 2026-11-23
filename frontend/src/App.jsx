import { useEffect, useCallback } from 'react';
import useGameStore, { clearSocketHandlers } from './store/game.js';
import socketService from './services/socket.js';
import Menu from './components/Menu';
import GameBoard from './components/GameBoard';

const store = useGameStore;

function App() {
  const {
    mode, game, setSocketHandlers, notification, setNotification,
    disconnectFromGame, returnToMenu, playerJoined, roomId, roomCode, waitingForOpponent, multiplayerLeft
  } = useGameStore();

  console.log('[App] Rendered - game:', !!game, 'mode:', mode, 'playerJoined:', playerJoined, 'multiplayerLeft:', multiplayerLeft);

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
        notification: { message: 'ルームを作成しました。コードを相手に教えて待ちましょう', timestamp: Date.now() },
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
        notification: { message: `ルーム「${data.roomCode}」に参加しました！`, timestamp: Date.now() },
      });
    }
  }, []);

  const handlePlayerJoined = useCallback((data) => {
    console.log('[App] Player joined:', data);
    if (data && data.isHost) {
      store.setState({ playerJoined: true, notification: { message: '相手が参加しました！ゲーム開始できます', timestamp: Date.now() } });
    } else if (data && !data.isHost) {
      store.setState({ opponentName: data.player, notification: { message: 'ホストがゲームを開始するまでお待ちください', timestamp: Date.now() } });
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
      notification: { message: 'ゲームスタート！', timestamp: Date.now() },
    });
  }, []);

  const handleOpponentMove = useCallback((data) => {
    store.setState({ game: data.newGame });
  }, []);

  const handleStonePlaced = useCallback((data) => {
    store.setState({ game: data.newGame });
  }, []);

  const handleOpponentLeft = useCallback((data) => {
    console.log('[App] Opponent left:', data);
    store.setState({
      notification: { message: data.message || '相手が離脱しました', timestamp: Date.now() },
      multiplayerLeft: true,
    });
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
    console.log('[App] Socket disconnected');
    store.setState({ connected: false });

    // If in active multiplayer game, show disconnect notification
    if (mode === 'multiplayer' && game) {
      store.setState({
        notification: { message: '接続が切断されました。相手の動きは受け付けません', timestamp: Date.now() },
        multiplayerLeft: true,
      });
    } else if (mode === 'multiplayer' && !game) {
      // Was in lobby or waiting - just return to menu
      store.getState().resetMultiplayerState();
      store.setState({ mode: 'menu', showMenu: true });
    }
  }, [mode, game]);

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
      onOpponentLeft: handleOpponentLeft,
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
  }, [setSocketHandlers, handleDisconnect, handleGameEnd]);

  // Determine what to show:
  // - If in menu mode → Menu
  // - If waitingForOpponent → Menu (showing waiting state)
  // - If multiplayerLeft AND game exists → GameBoard (with disconnect banner)
  // - Otherwise (game exists or in AI mode) → GameBoard
  const shouldShowMenu = (mode === 'menu' || waitingForOpponent) && !game;

  if (shouldShowMenu) {
    return <Menu />;
  }

  return <GameBoard />;
}

export default App;
