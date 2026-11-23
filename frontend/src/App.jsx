import { useEffect } from 'react';
import useGameStore, { clearSocketHandlers } from './store/game.js';
import Menu from './components/Menu';
import GameBoard from './components/GameBoard';
import './styles/index.css';

const store = useGameStore;

function App() {
  const { 
    mode, game, setSocketHandlers, playerName, 
    setRoomCode, leaveGame 
  } = useGameStore();

  useEffect(() => {
    setSocketHandlers({
      onRoomCreated: (data) => {
        setRoomCode(data.roomCode);
        store.setState({ roomId: data.roomId });
        window.location.hash = `room/${data.roomCode}`;
      },
      onJoinedRoom: (data) => {
        store.setState({ 
          roomId: data.roomId,
          opponentName: data.opponentName,
          waitingForOpponent: true 
        });
      },
      onPlayerJoined: () => {},
      onGameStart: (data) => {
        store.setState({ 
          game: data.game, 
          myColor: data.myColor,
          opponentName: data.opponentName,
          roomId: data.roomId,
          waitingForOpponent: false 
        });
      },
      onOpponentMove: (data) => {
        store.setState({ game: data.newGame });
      },
      onStonePlaced: (data) => {
        store.setState({ game: data.newGame });
      },
      onGameEnd: (data) => {
        store.setState({ 
          game: data.game,
          _endReason: data.reason || null,
          _winnerName: data.winnerName || null,
        });
      },
      onError: (data) => {
        alert(data.message);
      },
    });

    return () => {
      clearSocketHandlers();
    };
  }, [setSocketHandlers, setRoomCode, leaveGame]);

  // Hash routing for room codes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#room/')) {
        const code = hash.replace('#room/', '');
        setRoomCode(code);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setRoomCode]);

  if (mode === 'menu') {
    return <Menu />;
  }

  return <GameBoard />;
}

export default App;
