import { useState, useRef } from 'react';
import useGameStore from '../store/game.js';
import './GameBoard.css';

const BOARD_SIZE = 8;
const BLACK = 1;
const WHITE = 2;

export default function GameBoard() {
  const {
    game, myColor, mode, playerName, opponentName, leaveGame, notification, clearNotification,
    multiplayerLeft, connected, disconnectFromGame
  } = useGameStore();
  const [hoverPos, setHoverPos] = useState(null);

  // Track board changes for animation re-triggering
  const prevBoardRef = useRef(game.board.map(row => [...row]));
  const isNewCacheRef = useRef(null);

  function isNewCell(row, col) {
    if (isNewCacheRef.current === null) {
      const prev = prevBoardRef.current;
      const cur = game.board;
      const cache = new Set();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (prev[r][c] !== cur[r][c]) {
            cache.add(`${r}-${c}`);
          }
        }
      }
      isNewCacheRef.current = cache;
      prevBoardRef.current = game.board.map(row => [...row]);
    }
    return isNewCacheRef.current.has(`${row}-${col}`);
  }

  if (!game) return null;

  const isMyTurn = game.currentPlayer === myColor && !game.gameOver;
  const isAI = mode === 'ai' && game.currentPlayer !== myColor;

  // プレイヤー名の決定
  const myName = playerName || 'You';
  const oppName = opponentName || (mode === 'multiplayer' ? 'Opponent' : 'AI');

  let blackName = myColor === BLACK ? myName : oppName;
  let whiteName = myColor === WHITE ? myName : oppName;

  const handleCellClick = (row, col) => {
    if (!isMyTurn || isAI) return;
    const canPlace = game.validMoves.some(m => m.row === row && m.col === col);
    if (canPlace) {
      useGameStore.getState().placeStone(row, col);
    }
  };

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

    const hasStone = value === BLACK || value === WHITE;
    const isNew = isNewCell(row, col);

    // Inline animation style to re-trigger on new stone placement
    const animStyle = hasStone && isNew ? { animation: 'placeStone 0.25s ease-out' } : undefined;

    return (
      <div
        key={`${row}-${col}`}
        className={cellClass}
        style={animStyle}
        onClick={() => handleCellClick(row, col)}
        onMouseEnter={() => setHoverPos({ row, col })}
        onMouseLeave={() => setHoverPos(null)}
        aria-label={`Row ${row + 1}, Column ${col + 1}, ${value === BLACK ? 'Black' : value === WHITE ? 'White' : 'Empty'}`}
      >
        {isValidMove && !value && <span className="move-hint" />}
      </div>
    );
  };

  const renderGrid = () => {
    const cells = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        cells.push(renderCell(r, c));
      }
    }
    return cells;
  };

  const blackCount = game.score[BLACK];
  const whiteCount = game.score[WHITE];

  // Determine game result text
  let resultText = '';
  if (game.gameOver) {
    if (game.winner === myColor) {
      resultText = '勝ちました！';
    } else if (game.winner !== null && game.winner !== undefined) {
      resultText = '負けました...';
    } else {
      resultText = '引き分けです！';
    }
  }

  // Check if disconnected message should be shown
  const showDisconnectBanner = multiplayerLeft && !game.gameOver;

  return (
    <div className="game-board">
      {/* Header */}
      <div className="board-header">
        {notification && !showDisconnectBanner && (
          <div className="notification" onClick={clearNotification}>
            <span>{notification.message}</span>
            <button className="close-btn" aria-label="閉じる">×</button>
          </div>
        )}

        {/* Disconnect banner for multiplayer */}
        {showDisconnectBanner && (
          <div className="disconnect-banner">
            <span>相手が接続を切断しました</span>
            <button
              className="close-btn"
              onClick={() => disconnectFromGame()}
              aria-label="閉じる"
            >×</button>
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
            <span className="stone-icon black" aria-hidden="true" />
            <span className="count">{blackCount}</span>
            {mode === 'multiplayer' && (
              <span className="player-name">{blackName || 'Black'}</span>
            )}
          </div>
          <span className="vs">VS</span>
          <div className={`player-score ${game.currentPlayer === WHITE ? 'active' : ''}`}>
            <span className="stone-icon white" aria-hidden="true" />
            <span className="count">{whiteCount}</span>
            {mode === 'multiplayer' && (
              <span className="player-name">{whiteName || 'White'}</span>
            )}
          </div>
        </div>

        {/* Turn indicator */}
        <div className="turn-indicator">
          {game.gameOver ? (
            <span className="game-over">ゲーム終了！</span>
          ) : isMyTurn ? (
            <>
              <span className={`turn-dot ${game.currentPlayer === BLACK ? 'black' : 'white'}`} aria-hidden="true" />
              あなたのターンです
            </>
          ) : (
            <>
              <span className={`turn-dot ${game.currentPlayer === BLACK ? 'black' : 'white'}`} aria-hidden="true" />
              {isAI ? 'AIが考えています...' : '相手のターンです'}
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

      {/* Game over overlay - always shows when game ends, persists for result review */}
      {game.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>ゲーム終了</h2>
            <div className="final-score">
              <div className={`final-player black`}>
                <span className="stone-icon black large" aria-hidden="true" />
                <span>{blackCount} 石</span>
              </div>
              <div className={`final-result ${game.winner === BLACK ? 'winner' : ''}`}>
                {resultText}
              </div>
              <div className={`final-player white`}>
                <span className="stone-icon white large" aria-hidden="true" />
                <span>{whiteCount} 石</span>
              </div>
              <div className={`final-result ${game.winner === WHITE ? 'winner' : ''}`}>
                {resultText}
              </div>
            </div>

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
          終了する
        </button>
      </div>
    </div>
  );
}
