import { useState } from 'react';
import useGameStore from '../store/game.js';
import './GameBoard.css';

const BOARD_SIZE = 8;
const BLACK = 1;
const WHITE = 2;

export default function GameBoard() {
  const { 
    game, myColor, mode, playerName, opponentName, leaveGame, notification, clearNotification 
  } = useGameStore();
  const [hoverPos, setHoverPos] = useState(null);

  if (!game) return null;

  const isMyTurn = game.currentPlayer === myColor && !game.gameOver;
  const isAI = mode === 'ai' && game.currentPlayer !== myColor;

  // Determine player names for score display
  const myName = playerName;
  const oppName = opponentName || (mode === 'multiplayer' ? 'Opponent' : null);
  
  // Black's displayed name and White's displayed name
  let blackName = myColor === BLACK ? myName : oppName;
  let whiteName = myColor === WHITE ? myName : oppName;

  const handleCellClick = (row, col) => {
    if (!isMyTurn || isAI) return;
    const canPlace = game.validMoves.some(m => m.row === row && m.col === col);
    if (canPlace) {
      useGameStore.getState().placeStone(row, col);
    }
  };

  // Render board cell
  const renderCell = (row, col) => {
    const value = game.board[row][col];
    const isValidMove = isMyTurn && game.validMoves.some(m => m.row === row && m.col === col);
    const isLastMove = game.lastMove?.row === row && game.lastMove?.col === col;
    const isHover = hoverPos?.row === row && hoverPos?.col === col;

    let cellClass = 'cell';
    if (value === BLACK) cellClass += ' black-stone';
    else if (value === WHITE) cellClass += ' white-stone';
    if (isValidMove && !value) cellClass += ' valid-move';
    if (isLastMove) cellClass += ' last-move';
    if (isValidMove && isHover && !value) cellClass += ' hover-preview';

    return (
      <div
        key={`${row}-${col}`}
        className={cellClass}
        onClick={() => handleCellClick(row, col)}
        onMouseEnter={() => setHoverPos({ row, col })}
        onMouseLeave={() => setHoverPos(null)}
      >
        {isValidMove && !value && <span className="move-hint" />}
      </div>
    );
  };

  // Render grid with intersection dots for stone placement hint
  const renderGrid = () => {
    const cells = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        cells.push(renderCell(r, c));
      }
    }
    return cells;
  };

  // Score display
  const blackCount = game.score[BLACK];
  const whiteCount = game.score[WHITE];

  return (
    <div className="game-board">
      {/* Header */}
      <div className="board-header">
        {notification && (
          <div className="notification" onClick={clearNotification}>
            {notification.message}
            <button className="close-btn">×</button>
          </div>
        )}

        {/* Mode info */}
        <div className="mode-info">
          {mode === 'ai' && (
            <span className="mode-badge ai-mode">AI対戦</span>
          )}
          {mode === 'multiplayer' && (
            <span className="mode-badge mp-mode">マルチプレイ</span>
          )}
        </div>

        {/* Score */}
        <div className="score-display">
          <div className={`player-score ${game.currentPlayer === BLACK ? 'active' : ''}`}>
            <span className="stone-icon black" />
            <span className="count">{blackCount}</span>
            {mode === 'multiplayer' && (
              <span className="player-name">{blackName || 'Black'}</span>
            )}
          </div>
          <span className="vs">VS</span>
          <div className={`player-score ${game.currentPlayer === WHITE ? 'active' : ''}`}>
            <span className="stone-icon white" />
            <span className="count">{whiteCount}</span>
            {mode === 'multiplayer' && (
              <span className="player-name">{whiteName || 'White'}</span>
            )}
          </div>
        </div>

        {/* Turn indicator */}
        <div className="turn-indicator">
          {game.gameOver ? (
            <span className="game-over">🏆 ゲーム終了！</span>
          ) : (
            <>
              <span className={`turn-dot ${game.currentPlayer === BLACK ? 'black' : 'white'}`} />
              {isAI ? 'AIが考えています...' : 
                isMyTurn ? 'あなたのターンです' :
                mode === 'multiplayer' ? '相手のターンです' :
                'あなたのターン'}
            </>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="board-container">
        <div className="board">
          {renderGrid()}
        </div>
      </div>

      {/* Game over overlay */}
      {game.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>🏆 ゲーム終了！</h2>
            <div className="final-score">
              <div className={`final-player black`}>
                <span className="stone-icon black large" />
                <span>{blackCount} 石</span>
              </div>
              <span>=</span>
              <div className={`final-player white`}>
                <span className="stone-icon white large" />
                <span>{whiteCount} 石</span>
              </div>
            </div>
            
            {game.winner === myColor ? (
              <p className="win-text">🎉 おめでとうございます！勝ちました！</p>
            ) : game.winner !== null ? (
              <p className="lose-text">😢 負けました...</p>
            ) : (
              <p className="draw-text">⚖️ 引き分けです！</p>
            )}

            <div className="game-over-actions">
              <button className="btn btn-primary" onClick={leaveGame}>
                メニューに戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="board-footer">
        <button className="btn btn-secondary" onClick={leaveGame}>
          ✕ 終了する
        </button>
      </div>
    </div>
  );
}
