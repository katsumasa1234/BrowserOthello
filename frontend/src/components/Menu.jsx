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
    acceptGame,
    roomCode: storeRoomCode,
    waitingForOpponent,
    playerName: storePlayerName,
    playerJoined,
    setWaitingForOpponent,
    mode,
    roomId: storeRoomId,
    resetMultiplayerState,
    returnToMenu,
    notification,
    clearNotification,
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
    setView('waiting-create');
    startMultiplayerCreate(playerName.trim());
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || roomCodeInput.length !== 6) return;
    setView('waiting-join');
    joinMultiplayer(roomCodeInput.toUpperCase(), playerName.trim());
  };

  const handleMatchmaking = () => {
    if (!playerName.trim()) return;
    setView('matchmaking');
    findOpponent(playerName.trim());
  };

  const handleBack = () => {
    // マッチングキャンセル時はサーバーにも通知してキューから解除
    if (view === 'matchmaking' && waitingForOpponent) {
      useGameStore.cancelMatchmaking();
    } else if (waitingForOpponent || storeRoomCode) {
      // 部屋作成中・参加中は leave-room を送信
      const socket = useGameStore.getState()._getSocket?.();
      if (socket && socket.connected) {
        socket.emit('leave-room');
      }
      useGameStore.getState().resetMultiplayerState();
      setWaitingForOpponent(false);
    }
    
    setView('main');
  };

  const handleHome = () => {
    // メインメニューに戻る（マルチプレイ状態も完全にリセット）
    returnToMenu();
    setView('main');
  };

  return (
    <div className="menu">
      {/* Toast notification */}
      {notification && view === 'main' && (
        <div className="notification" onClick={clearNotification}>
          {typeof notification === 'string' ? notification : notification.message}
          <button className="close-btn" onClick={(e) => { e.stopPropagation(); clearNotification(); }}>&times;</button>
        </div>
      )}

      <h1 className="menu-title">Othello</h1>

      {/* メインメニュー */}
      {view === 'main' && (
        <div className="menu-main">
          <button className="menu-btn" onClick={() => setView('ai')}>
            AI対戦
          </button>
          <button className="menu-btn" onClick={() => setView('multiplayer-options')}>
            マルチプレイ
          </button>
        </div>
      )}

      {/* AI対戦設定 */}
      {view === 'ai' && (
        <div className="menu-section">
          <h2>AI対戦</h2>

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
          <h2>マルチプレイ</h2>

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
              ルームを作成する
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setView('multiplayer-join')}
            >
              ルームに参加する
            </button>
            <button className="btn btn-matchmaking" onClick={handleMatchmaking}>
              ランダムマッチ
            </button>
          </div>

          <button className="btn-home" onClick={handleHome}>
            ホームに戻る
          </button>
        </div>
      )}

      {/* ルーム参加 */}
      {view === 'multiplayer-join' && (
        <div className="menu-section">
          <h2>ルームに参加</h2>

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
        <div className="menu-section waiting-view">
          {((view === 'waiting-create' && playerJoined) || (view === 'matchmaking')) && storeRoomCode ? (
            <>
              {(view === 'waiting-create' && !playerJoined) && (
                <h2>相手を迎えています</h2>
              )}
              {((view === 'waiting-create' && playerJoined) || view === 'matchmaking') && (
                <h2>準備完了！ゲーム開始します</h2>
              )}
              {view !== 'matchmaking' && (
                <div className="room-code-display">
                  <p>ルームコード</p>
                  <div className="code-box">
                    <span className="code-text">{storeRoomCode}</span>
                    <button
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(storeRoomCode);
                      }}
                    >
                      コピー
                    </button>
                  </div>
                </div>
              )}
              <button
                className="btn btn-primary start-game-btn"
                onClick={() => {
                  acceptGame(storeRoomCode);
                }}
              >
                ゲーム開始する
              </button>
            </>
          ) : view === 'waiting-create' && storeRoomCode ? (
            <>
              <h2>相手を迎えています</h2>
              <div className="room-code-display">
                <p>ルームコード</p>
                <div className="code-box">
                  <span className="code-text">{storeRoomCode}</span>
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(storeRoomCode);
                    }}
                  >
                    コピー
                  </button>
                </div>
                <p className="hint">このコードを相手に伝えてください</p>
              </div>
            </>
          ) : view === 'waiting-create' ? (
            <>
              <h2>ルームを作成中...</h2>
              <p className="info-text">少しお待ちください</p>
            </>
          ) : view === 'waiting-join' && !storeRoomCode ? (
            <>
              <h2>部屋に参加しています</h2>
              <p className="info-text">相手の準備を整えたら、ゲームが始まります</p>
            </>
          ) : view === 'matchmaking' ? (
            <>
              <h2>マッチ相手を探しています...</h2>
              <p className="info-text">少しお待ちください</p>
            </>
          ) : (
            <>
              <h2>相手と接続しています</h2>
              <p className="info-text">ゲームが始まるまでお待ちください</p>
            </>
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
