import { applyMove, getValidMoves, cloneGame } from '../engine/othello.js';

// Position weights - corner and edge positions are valuable
const POSITION_WEIGHTS = [
  [100, -20, 10,  5,  5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [ 10,  -2,  5,  1,  1,  5,  -2,  10],
  [  5,  -2,  1,  1,  1,  1,  -2,   5],
  [  5,  -2,  1,  1,  1,  1,  -2,   5],
  [ 10,  -2,  5,  1,  1,  5,  -2,  10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10,  5,  5, 10, -20, 100]
];

/**
 * Evaluate the board for the current player (higher is better)
 */
export function evaluateBoard(board, player) {
  const opponent = player === 1 ? 2 : 1;
  let score = 0;

  // Mobility (number of valid moves)
  const mobilityBonus = 5;

  // Positional weights
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === player) {
        score += POSITION_WEIGHTS[r][c];
      } else if (board[r][c] === opponent) {
        score -= POSITION_WEIGHTS[r][c];
      }
    }
  }

  return score;
}

/**
 * Minimax with alpha-beta pruning
 */
export function minimax(game, depth, alpha, beta, isMaximizing, player) {
  if (depth === 0 || game.gameOver) {
    // Prefer more discs on the board at endgame
    return evaluateBoard(game.board, player);
  }

  const moves = game.validMoves;
  
  // If no moves, skip turn
  if (moves.length === 0) {
    const passGame = { ...game, currentPlayer: game.currentPlayer };
    // Temporarily allow move to check next state
    return minimax(passGame, depth - 1, alpha, beta, isMaximizing, player);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    
    // Sort moves by weight for better pruning
    const sortedMoves = [...moves].sort((a, b) => {
      return POSITION_WEIGHTS[b.row][b.col] - POSITION_WEIGHTS[a.row][a.col];
    });

    for (const move of sortedMoves) {
      const newGame = applyMove(game, move);
      if (newGame.currentPlayer === player) continue; // opponent passed
      
      const eval_ = minimax(newGame, depth - 1, alpha, beta, false, player);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    
    return maxEval === -Infinity ? evaluateBoard(game.board, player) : maxEval;
  } else {
    let minEval = Infinity;

    const sortedMoves = [...moves].sort((a, b) => {
      return POSITION_WEIGHTS[b.row][b.col] - POSITION_WEIGHTS[a.row][a.col];
    });

    for (const move of sortedMoves) {
      const newGame = applyMove(game, move);
      if (newGame.currentPlayer === player) continue; // opponent passed
      
      const eval_ = minimax(newGame, depth - 1, alpha, beta, true, player);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    
    return minEval === Infinity ? evaluateBoard(game.board, player) : minEval;
  }
}

/**
 * Get AI move based on difficulty level
 * @param {object} game - current game state
 * @param {number} player - AI player (1=BLACK or 2=WHITE)
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {object} { row, col } of chosen move
 */
export function getAIMove(game, player, difficulty = 'medium') {
  const moves = game.validMoves;

  if (moves.length === 0) return null;

  // Easy: random valid move
  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Medium: shallow search with some randomness
  // Hard: deeper search with positional weights
  
  const depth = difficulty === 'medium' ? 3 : 5;
  let bestMove = null;
  let bestScore = -Infinity;

  // Shuffle moves slightly for medium to add variety
  const sortedMoves = [...moves].sort((a, b) => {
    const scoreA = POSITION_WEIGHTS[a.row][a.col];
    const scoreB = POSITION_WEIGHTS[b.row][b.col];
    return difficulty === 'medium' 
      ? scoreB - scoreA + (Math.random() * 20 - 10)
      : scoreB - scoreA;
  });

  for (const move of sortedMoves) {
    const newGame = applyMove(game, move);
    
    // Skip if opponent passes on this turn (AI's move was skipped by previous pass)
    if (newGame.currentPlayer === player) continue;
    
    const score = minimax(newGame, depth - 1, -Infinity, Infinity, false, player);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove || moves[0];
}
