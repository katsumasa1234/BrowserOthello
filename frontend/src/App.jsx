import { useEffect, useCallback } from 'react';
import useGameStore, { clearSocketHandlers } from './store/game.js';
import Menu from './components/Menu';
import GameBoard from './components/GameBoard';
import './styles/index.css';

const store = useGameStore;

function App() {
  const {
    mode, game, setSocketHandlers, playerName,
    setRoomCode, leaveGame, roomCode, waitingForOpponent
  } = useGameStore();

  const handleRoomCreated = useCallback((data) => {
    console.log('Room created:', data);
    setRoomCode(data.roomCode);
    store.setState({
      roomId: data.roomId,
      roomCode: data.roomCode,
      waitingForOpponent: true,
    });
  }, [setRoomCode]);

  const handleJoinedRoom = useCallback((data) => {
    console.log('Joined room:', data);
    store.setState({
      roomId: data.roomId,
      roomCode: data.roomCode,
      opponentName: data.opponentName,
      waitingForOpponent: true,
    });
  }, []);

  const handlePlayerJoined = useCallback((data) => {
    console.log('Player joined:', data);
    // Host notified that a player joined - can auto-start or wait for accept
  }, []);

  const handleGameStart = useCallback((data) => {
    console.log('Game start:', data);
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
    console.log('Game end:', data);
    store.setState({
      game: data.game,
      waitingForOpponent: false,
    });
  }, []);

  const handleError = useCallback((data) => {
    console.error('Error:', data);
    alert(data.message || 'エラーが発生しました');
  }, []);

  const handlePlayerLeft = useCallback((data) => {
    console.log('Player left:', data);
    store.setState({ waitingForOpponent: false });
  }, []);

  const handleHostDisconnected = useCallback(() => {
    alert('ホストが切断されました');
    store.setState({ waitingForOpponent: false, mode: 'menu' });
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
      onOpponentLeft: handlePlayerLeft,
      onHostDisconnected: handleHostDisconnected,
    });

    return () => {
      clearSocketHandlers();
    };
  }, [setSocketHandlers]);

  if (mode === 'menu') {
    return <Menu />;
  }

  return <GameBoard />;
}

export default App;
