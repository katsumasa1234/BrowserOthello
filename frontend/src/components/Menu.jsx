import { useState, useEffect } from 'react';
import useGameStore from '../store/game.js';
import './Menu.css';

export default function Menu() {
  const [view, setView] = useState('main');
  const [difficulty, setDifficulty] = useState('medium');
  const [myColor, setMyColor] = useState('BLACK');
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  const {
    startAIGame,
    startMultiplayerCreate,
    joinMultiplayer,
    findOpponent,
    roomCode: storeRoomCode,
    waitingForOpponent,
    playerName: storePlayerName,
    setWaitingForOpponent,
    mode,
  } = useGameStore();

  const aiDifficulties = [
    { value: 'easy', label: '初級' },
    { value: 'medium', label: '中級' },
    { value: 'hard', label: '上級' },
  ];

  // プレイヤー名の同期
  useEffect(() => {
    if (storePlayerName && !playerName) {
      setPlayerName(storePlayerName);
    }
  }, [storePlayerName, playerName]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    // まず待機画面を表示（UX向上）
    setView('waiting-create');
    startMultiplayerCreate(playerName.trim());
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || roomCodeInput.length !== 6) return;
    // まず待機画面を表示
    setView('waiting-join');
    joinMultiplayer(roomCodeInput.toUpperCase(), playerName.trim());
  };

  const handleMatchmaking = () => {
    if (!playerName.trim()) return;
    // まず待機画面を表示
    setView('matchmaking');
    findOpponent(playerName.trim());
  };

  const handleBack = () => {
    setView('main');
    setWaitingForOpponent(false);
  };

  // マッチング待ち状態の判定（表示用）
  const isMatchmaking = waitingForOpponent || (mode === 'multiplayer' && !storeRoomCode && view !== 'main');

  return (
    <div className="menu">
      <h1 className="menu-title">🏁 ブラウザオセロ</h1>

      {/* メインメニュー */}
      {view === 'main' && (
        <div className="menu-main">
          <button className="menu-btn" onClick={() => setView('ai')}>
            🤖 AI対戦
          </button>
          <button className="menu-btn" onClick={() => setView('multiplayer-options')}>
            👥 マルチプレイ
          </button>
        </div>
      )}

      {/* AI対戦設定 */}
      {view === 'ai' && (
        <div className="menu-section">
          <h2>🤖 AI対戦</h2>

          <div className="form-group">
            <label>難易度</label>
            <div className="difficulty-select">
              {aiDifficulties.map((d) => (
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
            <label>石の色</label>
            <div className="color-select">
              <button
                className={`color-btn ${myColor === 'BLACK' ? 'selected' : ''}`}
                onClick={() => setMyColor('BLACK')}
              >
                ⚫ 先手（黒）
              </button>
              <button
                className={`color-btn ${myColor === 'WHITE' ? 'selected' : ''}`}
                onClick={() => setMyColor('WHITE')}
              >
                ⚪ 後手（白）
              </button>
            </div>
          </div>

          <div className="menu-actions">
            <button
              className="btn btn-primary"
              onClick={() => startAIGame(difficulty, myColor === 'BLACK' ? 1 : 2)}
            >
              ゲーム開始
            </button>
            <button className="btn btn-secondary" onClick={handleBack}>
              戻る
            </button>
          </div>
        </div>
      )}

      {/* マルチプレイオプション */}
      {view === 'multiplayer-options' && (
        <div className="menu-section">
          <h2>👥 マルチプレイ</h2>

          <div className="form-group">
            <label>プレイヤー名</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="名前を入力（16文字まで）"
              maxLength={16}
            />
          </div>

          <div className="menu-actions vertical">
            <button className="btn btn-primary" onClick={handleCreateRoom}>
              🏠 ルームを作成する
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setView('multiplayer-join')}
            >
              🔑 ルームに参加する
            </button>
            <button className="btn btn-matchmaking" onClick={handleMatchmaking}>
              ⚡ ランダムマッチ
            </button>
          </div>
        </div>
      )}

      {/* ルーム参加 */}
      {view === 'multiplayer-join' && (
        <div className="menu-section">
          <h2>🔑 ルームに参加</h2>

          <div className="form-group">
            <label>プレイヤー名</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="名前を入力"
              maxLength={16}
            />
          </div>

          <div className="form-group">
            <label>ルームコード（6桁）</label>
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              className="code-input"
            />
          </div>

          <div className="menu-actions">
            <button
              className="btn btn-primary"
              onClick={handleJoinRoom}
              disabled={playerName.trim().length === 0 || roomCodeInput.length !== 6}
            >
              参加する
            </button>
            <button className="btn btn-secondary" onClick={() => setView('multiplayer-options')}>
              戻る
            </button>
          </div>
        </div>
      )}

      {/* マッチング待ち / ルーム作成待ち */}
      {(view === 'waiting-create' || view === 'waiting-join' || view === 'matchmaking') && (
        <div className="menu-section">
          <h2>🔍 接続中...</h2>

          {view === 'waiting-create' && storeRoomCode && (
            <div className="room-code-display">
              <p>あなたのルームコード：</p>
              <div className="code-box">
                <span className="code-text">{storeRoomCode}</span>
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(storeRoomCode);
                  }}
                >
                  📋 コピー
                </button>
              </div>
              <p className="hint">このコードを相手に伝えてください</p>
            </div>
          )}

          {view === 'waiting-join' && (
            <p>相手が見つかるまでお待ちください...</p>
          )}

          {view === 'matchmaking' && (
            <p>マッチ相手を探しています...</p>
          )}

          <div className="spinner" />

          <button className="btn btn-secondary" onClick={handleBack}>
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}
