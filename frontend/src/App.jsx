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
    setRoomCode(data.roomCode);
    store.setState({ roomId: data.roomId });
    window.location.hash = `room/${data.roomCode}`;
  }, [setRoomCode]);

  const handleJoinedRoom = useCallback((data) => {
    store.setState({ 
      roomId: data.roomId,
      opponentName: data.opponentName,
      waitingForOpponent: true 
    });
  }, []);

  const handleGameStart = useCallback((data) => {
    store.setState({ 
      game: data.game, 
      myColor: data.myColor,
      opponentName: data.opponentName,
      roomId: data.roomId,
      waitingForOpponent: false 
    });
  }, []);

  const handleOpponentMove = useCallback((data) => {
    store.setState({ game: data.newGame });
  }, []);

  const handleStonePlaced = useCallback((data) => {
    store.setState({ game: data.newGame });
  }, []);

  const handleGameEnd = useCallback((data) => {
    store.setState({ 
      game: data.game,
      _endReason: data.reason || null,
      _winnerName: data.winnerName || null,
    });
  }, []);

  const handleError = useCallback((data) => {
    alert(data.message);
  }, []);

  const handlePlayerJoined = useCallback(() => {}, []);
  const handleOpponentLeft = useCallback(() => {}, []);
  const handleHostDisconnected = useCallback(() => {}, []);

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
      onOpponentLeft: handleOpponentLeft,
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
