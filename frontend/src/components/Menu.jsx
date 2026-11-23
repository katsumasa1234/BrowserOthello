import { useState } from 'react';
import useGameStore from '../store/game.js';
import './Menu.css';

export default function Menu() {
  const [view, setView] = useState('main'); // main | ai | multiplayer-create | multiplayer-join
  const [difficulty, setDifficulty] = useState('medium');
  const [myColor, setMyColor] = useState('BLACK');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const startAIGame = useGameStore(s => s.startAIGame);
  const startMultiplayerCreate = useGameStore(s => s.startMultiplayerCreate);
  const joinMultiplayer = useGameStore(s => s.joinMultiplayer);

  const aiDifficulties = [
    { value: 'easy', label: '初級' },
    { value: 'medium', label: '中級' },
    { value: 'hard', label: '上級' },
  ];

  return (
    <div className="menu">
      <h1>🏁 Browser Othello</h1>
      
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
            onClick={() => setView('multiplayer-create')}
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
              onClick={() => setView('main')}
            >
              戻る
            </button>
          </div>
        </div>
      )}

      {view === 'multiplayer-create' && (
        <div className="menu-multi">
          <h2>👥 マルチプレイ</h2>
          
          <div className="form-group">
            <label>プレイヤー名</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="名前を入力"
              maxLength={16}
            />
          </div>

          <div className="menu-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (playerName.trim()) {
                  startMultiplayerCreate(playerName.trim());
                }
              }}
            >
              ルーム作成
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setView('multiplayer-join')}
            >
              参加する
            </button>
          </div>
        </div>
      )}

      {view === 'multiplayer-join' && (
        <div className="menu-multi">
          <h2>👥 マルチプレイ</h2>
          
          <div className="form-group">
            <label>プレイヤー名</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="名前を入力"
              maxLength={16}
            />
          </div>

          <div className="form-group">
            <label>ルームコード</label>
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="6桁のコード"
              maxLength={6}
              style={{ textTransform: 'uppercase', letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.5rem' }}
            />
          </div>

          <div className="menu-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (playerName.trim() && roomCode.length === 6) {
                  joinMultiplayer(roomCode.toUpperCase(), playerName.trim());
                }
              }}
            >
              参加する
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setView('multiplayer-create')}
            >
              ルーム作成
            </button>
          </div>
        </div>
      )}

      {view === 'waiting' && (
        <div className="menu-waiting">
          <h2>🔍 相手を募集中...</h2>
          <p>相手が入るまでお待ちください。</p>
          <div className="spinner" />
          <button 
            className="btn btn-secondary" 
            onClick={() => setView('main')}
          >
            キャンセル
          </button>
        </div>
      )}

      {view === 'waiting-join' && (
        <div className="menu-waiting">
          <h2>🔍 接続中...</h2>
          <p>ルーム <strong>{roomCode}</strong> に接続しています</p>
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
