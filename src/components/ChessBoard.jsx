import React, { useMemo } from 'react';
import PieceSVG from './PieceSVG.jsx';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessBoard({
  game,
  playerColor,
  selectedSquare,
  legalMoves,
  lastMove,
  onSquareClick,
  isThinking,
  gameStatus
}) {
  const flipped = playerColor === 'b';

  const board = useMemo(() => {
    const squares = [];
    const displayFiles = flipped ? [...FILES].reverse() : FILES;
    const displayRanks = flipped ? [...RANKS].reverse() : RANKS;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const file = displayFiles[f];
        const rank = displayRanks[r];
        const square = file + rank;
        const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
        const piece = game.get(square);

        const isSelected = square === selectedSquare;
        const isLegal = legalMoves.includes(square);
        const isLastMoveFrom = lastMove?.from === square;
        const isLastMoveTo = lastMove?.to === square;
        const isInCheck = piece?.type === 'k' && piece.color === game.turn() && game.isCheck();

        let className = `square ${isLight ? 'light' : 'dark'}`;
        if (isSelected) className += ' selected';
        if (isLastMoveFrom || isLastMoveTo) className += ' last-move';
        if (isInCheck) className += ' in-check';

        squares.push(
          <div
            key={square}
            className={className}
            onClick={() => onSquareClick(square)}
            data-square={square}
          >
            {piece && (
              <PieceSVG piece={piece.type} color={piece.color} />
            )}
            {isLegal && (
              <div className={`legal-dot ${piece ? 'legal-capture' : ''}`} />
            )}
            {f === 0 && (
              <span className="rank-label">{rank}</span>
            )}
            {r === 7 && (
              <span className="file-label">{file}</span>
            )}
          </div>
        );
      }
    }
    return squares;
  }, [game, flipped, selectedSquare, legalMoves, lastMove]);

  return (
    <div className="chess-board-container">
      <div className={`chess-board ${isThinking ? 'thinking' : ''}`}>
        {board}
      </div>
      {isThinking && (
        <div className="thinking-indicator">
          <div className="thinking-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      )}
    </div>
  );
}
