import { useEffect, useCallback } from 'react';
import useGameStore, { clearSocketHandlers, setSocketHandlers as storeSetSocketHandlers } from './store/game.js';
import socketService from './services/socket.js';
import Menu from './components/Menu';
import GameBoard from './components/GameBoard';

function App() {
  const {
    mode, game, notification, setNotification,
    disconnectFromGame, returnToMenu, playerJoined, roomId, roomCode, waitingForOpponent, multiplayerLeft
  } = useGameStore();

  console.log('[App] Rendered - game:', !!game, 'mode:', mode, 'playerJoined:', playerJoined, 'multiplayerLeft:', multiplayerLeft);

  // Show toast notification for a few seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      useGameStore.setState({ notification: null });
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Clear old handlers before setting new ones
  useEffect(() => {
    clearSocketHandlers();
    return () => clearSocketHandlers();
  }, []);

  const handleRoomCreated = useCallback((data) => {
    console.log('[App] Room created:', data);
    if (data && data.roomCode) {
      useGameStore.setState({
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
    console.log('[App] Joined room:', data);
    if (data && data.roomCode) {
      useGameStore.setState({
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
      useGameStore.setState({ playerJoined: true, notification: { message: '相手が参加しました！ゲーム開始できます', timestamp: Date.now() } });
    } else if (data && !data.isHost) {
      useGameStore.setState({ opponentName: data.player, notification: { message: 'ホストがゲームを開始するまでお待ちください', timestamp: Date.now() } });
    }
  }, []);

  const handleGameStart = useCallback((data) => {
    console.log('[App] Game start:', data);
    useGameStore.setState({
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
    useGameStore.setState({ game: data.newGame });
  }, []);

  const handleStonePlaced = useCallback((data) => {
    useGameStore.setState({ game: data.newGame });
  }, []);

  const handleOpponentLeft = useCallback((data) => {
    console.log('[App] Opponent left:', data);
    useGameStore.setState({
      notification: { message: data.message || '相手が離脱しました', timestamp: Date.now() },
      multiplayerLeft: true,
    });
  }, []);

  const handleGameEnd = useCallback((data) => {
    console.log('[App] Game end:', data);
    useGameStore.setState({
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
    useGameStore.setState({ connected: false });

    // If in active multiplayer game, show disconnect notification
    if (mode === 'multiplayer' && game) {
      useGameStore.setState({
        notification: { message: '接続が切断されました。相手の動きは受け付けません', timestamp: Date.now() },
        multiplayerLeft: true,
      });
    } else if (mode === 'multiplayer' && !game) {
      // Was in lobby or waiting - just return to menu
      useGameStore.getState().resetMultiplayerState();
      useGameStore.setState({ mode: 'menu', showMenu: true });
    }
  }, [mode, game]);

  const handleReconnect = useCallback(() => {
    console.log('[App] Socket reconnected');
    useGameStore.setState({ connected: true });
  }, []);

  useEffect(() => {
    storeSetSocketHandlers({
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
  }, [handleDisconnect, handleGameEnd]);

  // Determine what to show:
  // - If in menu mode → Menu
  // - If waitingForOpponent → Menu (showing waiting state)
  // - Otherwise → GameBoard
  const shouldShowMenu = mode === 'menu' || waitingForOpponent;
  console.log('[App] Rendering - shouldShowMenu:', shouldShowMenu, 'mode:', mode, 'waiting:', waitingForOpponent, 'multiplayerLeft:', multiplayerLeft);

  if (shouldShowMenu) {
    return <Menu />;
  }

  return <GameBoard />;
}

export default App;
