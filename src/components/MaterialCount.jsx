import React, { useMemo } from 'react';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const PIECE_SYMBOLS = {
  wp: '\u2659', wn: '\u2658', wb: '\u2657', wr: '\u2656', wq: '\u2655',
  bp: '\u265F', bn: '\u265E', bb: '\u265D', br: '\u265C', bq: '\u265B'
};

// bottom = true renders the player's captured pieces (below the board)
// bottom = false renders the opponent's captured pieces (above the board)
export default function MaterialCount({ game, playerColor, bottom }) {
  const { advantage, capturedByPlayer, capturedByOpponent } = useMemo(() => {
    let wMat = 0, bMat = 0;
    const wPieces = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const bPieces = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    const board = game.board();
    for (const row of board) {
      for (const sq of row) {
        if (!sq || sq.type === 'k') continue;
        if (sq.color === 'w') { wMat += PIECE_VALUES[sq.type] || 0; wPieces[sq.type]++; }
        else { bMat += PIECE_VALUES[sq.type] || 0; bPieces[sq.type]++; }
      }
    }

    const start = { p: 8, n: 2, b: 2, r: 2, q: 1 };

    // What the player captured (opponent's lost pieces)
    const pColor = playerColor === 'w' ? bPieces : wPieces;
    const oColor = playerColor === 'w' ? wPieces : bPieces;
    const capturedByPlayer = {};
    const capturedByOpponent = {};

    for (const t of ['q', 'r', 'b', 'n', 'p']) {
      const oppLost = start[t] - pColor[t];
      if (oppLost > 0) capturedByPlayer[t] = oppLost;
      const playerLost = start[t] - oColor[t];
      if (playerLost > 0) capturedByOpponent[t] = playerLost;
    }

    const adv = playerColor === 'w' ? wMat - bMat : bMat - wMat;
    return { advantage: adv, capturedByPlayer, capturedByOpponent };
  }, [game, playerColor]);

  const captured = bottom ? capturedByPlayer : capturedByOpponent;
  const showAdvantage = bottom ? (advantage > 0) : (advantage < 0);
  const advValue = Math.abs(advantage);

  // Pieces this side captured (shown as the opponent's piece color)
  const pieceColor = bottom
    ? (playerColor === 'w' ? 'b' : 'w')   // player captured opponent's pieces
    : (playerColor === 'w' ? 'w' : 'b');   // opponent captured player's pieces — show player's color

  // Actually: above board = opponent side. Show pieces the opponent captured (player's pieces).
  // Below board = player side. Show pieces the player captured (opponent's pieces).
  const displayCaptured = bottom ? capturedByPlayer : capturedByOpponent;
  const displayColor = bottom
    ? (playerColor === 'w' ? 'b' : 'w')   // player captured black/white pieces
    : playerColor;                          // opponent captured player's pieces

  const pieces = [];
  for (const type of ['q', 'r', 'b', 'n', 'p']) {
    if (displayCaptured[type]) {
      for (let i = 0; i < displayCaptured[type]; i++) {
        pieces.push(
          <span key={`${type}${i}`} className="captured-piece">
            {PIECE_SYMBOLS[displayColor + type]}
          </span>
        );
      }
    }
  }

  return (
    <div className={`material-row ${bottom ? 'material-bottom' : 'material-top'}`}>
      <div className="captured-pieces">{pieces}</div>
      {showAdvantage && advValue > 0 && (
        <span className="advantage-badge">+{advValue}</span>
      )}
    </div>
  );
}
