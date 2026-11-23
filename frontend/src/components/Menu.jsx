import { useState } from 'react';
import useGameStore from '../store/game.js';
import './Menu.css';

export default function Menu() {
  const [view, setView] = useState('main'); // main | ai | multiplayer-create | multiplayer-join | matchmaking
  const [difficulty, setDifficulty] = useState('medium');
  const [myColor, setMyColor] = useState('BLACK');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setLocalRoomCode] = useState('');

  const { 
    startAIGame, 
    startMultiplayerCreate, 
    joinMultiplayer,
    findOpponent,
    roomCode: storeRoomCode,
    playerName: storePlayerName,
    waitingForOpponent,
    setWaitingForOpponent
  } = useGameStore();

  const aiDifficulties = [
    { value: 'easy', label: '初級' },
    { value: 'medium', label: '中級' },
    { value: 'hard', label: '上級' },
  ];

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      startMultiplayerCreate(playerName.trim());
      setView('waiting-create');
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomCode.length === 6) {
      joinMultiplayer(roomCode.toUpperCase(), playerName.trim());
      setView('waiting-join');
    }
  };

  const handleMatchmaking = () => {
    if (playerName.trim()) {
      findOpponent(playerName.trim());
      setView('matchmaking');
    }
  };

  const handleBackToMain = () => {
    setView('main');
    setWaitingForOpponent(false);
  };

  return (
    <div className="menu">
      <h1 className="menu-title">🏁 ブラウザオセロ</h1>
      
      {view === 'main' && (
        <div className="menu-main">
          <button 
            className="menu-btn" 
            onClick={() => setView('ai')}
          >
            🤖 AI対戦
          </button>
          
          <button 
            className="menu-btn" 
            onClick={() => setView('multiplayer-options')}
          >
            👥 マルチプレイ
          </button>
        </div>
      )}

      {view === 'ai' && (
        <div className="menu-ai">
          <h2>🤖 AI対戦</h2>
          
          <div className="form-group">
            <label>難易度を選択</label>
            <div className="difficulty-select">
              {aiDifficulties.map(d => (
                <button
                  key={d.value}
                  className={`diff-btn ${difficulty === d.value ? 'selected' : ''}`}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>石の色を選択</label>
            <div className="color-select">
              <button
                className={`color-btn ${myColor === 'BLACK' ? 'selected' : ''}`}
                onClick={() => setMyColor('BLACK')}
              >
                ⚫ 先手 (黒)
              </button>
              <button
                className={`color-btn ${myColor === 'WHITE' ? 'selected' : ''}`}
                onClick={() => setMyColor('WHITE')}
              >
                ⚪ 後手 (白)
              </button>
            </div>
          </div>

          <div className="menu-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => {
                startAIGame(difficulty, myColor === 'BLACK' ? 1 : 2);
              }}
            >
              ゲーム開始
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleBackToMain}
            >
              戻る
            </button>
          </div>
        </div>
      )}

      {view === 'multiplayer-options' && (
        <div className="menu-multi">
          <h2>👥 マルチプレイ</h2>
          
          <div className="form-group">
            <label>プレイヤー名</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="名前を入力（16文字まで）"
              maxLength={16}
            />
          </div>

          <div className="menu-actions">
            <button 
              className="btn btn-primary" 
              onClick={handleCreateRoom}
            >
              ルーム作成
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setView('multiplayer-join')}
            >
              ルームに参加
            </button>
            <button 
              className="btn btn-matchmaking" 
              onClick={handleMatchmaking}
            >
              🔍 ランダムマッチ
            </button>
          </div>
        </div>
      )}

      {view === 'multiplayer-join' && (
        <div className="menu-multi">
          <h2>👥 ルームに参加</h2>
          
          <div className="form-group">
            <label>プレイヤー名</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="名前を入力（16文字まで）"
              maxLength={16}
            />
          </div>

          <div className="form-group">
            <label>ルームコード</label>
            <input
              type="text"
              value={roomCode}
              onChange={e => setLocalRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="6桁のコード"
              maxLength={6}
              style={{ textTransform: 'uppercase', letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.5rem' }}
            />
          </div>

          <div className="menu-actions">
            <button 
              className="btn btn-primary" 
              onClick={handleJoinRoom}
            >
              参加する
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setView('multiplayer-options')}
            >
              戻る
            </button>
          </div>
        </div>
      )}

      {(view === 'waiting-create' || view === 'waiting-join' || view === 'matchmaking') && (
        <div className="menu-waiting">
          <h2>🔍 {view === 'matchmaking' ? '相手を募集中...' : '相手が入るまでお待ちください'}</h2>
          
          {view === 'waiting-create' && storeRoomCode && (
            <div className="room-code-display">
              <p>ルームコード：</p>
              <div className="room-code-box">
                <span className="room-code">{storeRoomCode}</span>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(storeRoomCode)}
                  title="コピー"
                >
                  📋
                </button>
              </div>
              <p className="hint">このコードを相手に教えてください</p>
            </div>
          )}

          {view === 'matchmaking' && (
            <p>マッチング相手を探しています...</p>
          )}

          {view === 'waiting-join' && (
            <p>ルーム <strong>{roomCode}</strong> に接続しています</p>
          )}

          <div className="spinner" />
          
          <button 
            className="btn btn-secondary" 
            onClick={handleBackToMain}
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}
