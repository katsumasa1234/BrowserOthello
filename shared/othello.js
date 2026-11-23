// ===== Othello Game Engine ===== (shared between frontend and backend)

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

const BOARD_SIZE = 8;

export function createGame() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  const mid = BOARD_SIZE / 2;
  board[mid - 1][mid - 1] = WHITE;
  board[mid][mid] = WHITE;
  board[mid - 1][mid] = BLACK;
  board[mid][mid - 1] = BLACK;

  return {
    board,
    currentPlayer: BLACK,
    validMoves: getValidMoves(board, BLACK),
    gameOver: false,
    winner: null,
    score: { [BLACK]: 2, [WHITE]: 2 },
    lastMove: null,
    moveHistory: []
  };
}

export function cloneGame(game) {
  return JSON.parse(JSON.stringify(game));
}

export function getValidMoves(board, player) {
  const opponent = player === BLACK ? WHITE : BLACK;
  const moves = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) continue;

      for (const [dr, dc] of DIRECTIONS) {
        let nr = r + dr;
        let nc = c + dc;
        let foundOpponent = false;

        while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          if (board[nr][nc] === opponent) {
            foundOpponent = true;
          } else if (board[nr][nc] === player) {
            if (foundOpponent) {
              moves.push({ row: r, col: c });
            }
            break;
          } else {
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    }
  }

  return moves;
}

export function applyMove(game, move) {
  const { board, currentPlayer: movedPlayer } = game;
  const opponent = movedPlayer === BLACK ? WHITE : BLACK;
  const newBoard = board.map(row => [...row]);
  const toFlip = [];

  newBoard[move.row][move.col] = movedPlayer;

  for (const [dr, dc] of DIRECTIONS) {
    let nr = move.row + dr;
    let nc = move.col + dc;
    const potentialFlips = [];

    while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
      if (newBoard[nr][nc] === opponent) {
        potentialFlips.push({ row: nr, col: nc });
      } else if (newBoard[nr][nc] === movedPlayer) {
        if (potentialFlips.length > 0) {
          toFlip.push(...potentialFlips);
        }
        break;
      } else {
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  for (const flip of toFlip) {
    newBoard[flip.row][flip.col] = movedPlayer;
  }

  // Count discs
  const score = { [BLACK]: 0, [WHITE]: 0 };
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (newBoard[r][c] === BLACK) score[BLACK]++;
      else if (newBoard[r][c] === WHITE) score[WHITE]++;
    }
  }

  // Check who plays next - handle auto-pass if current player has no moves
  let finalPlayer = opponent;
  let finalValidMoves = getValidMoves(newBoard, finalPlayer);
  let gameOver = false;
  let winner = null;

  if (finalValidMoves.length === 0) {
    // Opponent has no moves — switch to the player who just moved
    finalPlayer = movedPlayer;
    finalValidMoves = getValidMoves(newBoard, finalPlayer);

    if (finalValidMoves.length === 0) {
      // Neither can move — game over
      gameOver = true;
      if (score[BLACK] > score[WHITE]) winner = BLACK;
      else if (score[WHITE] > score[BLACK]) winner = WHITE;
    }
  }

  return {
    board: newBoard,
    currentPlayer: gameOver ? null : finalPlayer,
    validMoves: finalValidMoves,
    gameOver,
    winner,
    score,
    lastMove: { row: move.row, col: move.col },
    moveHistory: [...game.moveHistory, { 
      row: move.row, col: move.col, player: movedPlayer, toFlip 
    }]
  };
}
