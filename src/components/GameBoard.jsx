import React from 'react';
import ChessBoard from './ChessBoard.jsx';
import CoachPanel from './CoachPanel.jsx';
import MoveHistory from './MoveHistory.jsx';
import MaterialCount from './MaterialCount.jsx';

export default function GameBoard({
  game,
  position,
  selectedSquare,
  legalMoves,
  lastMove,
  moveHistory,
  commentary,
  playerColor,
  gameStatus,
  gameResult,
  isThinking,
  currentElo,
  currentCoach,
  handleSquareClick,
  resign,
  undoMove,
  onNewGame,
  onOpenSettings,
  settings
}) {
  const canUndo = moveHistory.length >= 2 && gameStatus === 'playing' && !isThinking;

  const getStatusText = () => {
    if (gameStatus === 'gameover') {
      switch (gameResult) {
        case 'checkmate-win': return 'You win by checkmate!';
        case 'checkmate-loss': return 'You lost by checkmate.';
        case 'stalemate': return 'Draw by stalemate.';
        case 'draw': return 'Draw.';
        case 'resign': return 'You resigned.';
        default: return 'Game over.';
      }
    }
    if (isThinking) return `${currentCoach?.name || 'Bot'} is thinking...`;
    if (game.turn() === playerColor) return 'Your turn';
    return 'Opponent\'s turn';
  };

  return (
    <div className="game-board-layout">
      <div className="game-left">
        <div className="game-top-bar">
          <div className="game-info">
            <span className="coach-badge" style={{ color: currentCoach?.color }}>
              {currentCoach?.piece} {currentCoach?.name}
            </span>
            <span className="elo-badge">ELO {currentElo}</span>
          </div>
          <div className="game-status">
            {getStatusText()}
          </div>
        </div>

        <MaterialCount game={game} playerColor={playerColor} />

        <ChessBoard
          game={game}
          playerColor={playerColor}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          lastMove={lastMove}
          onSquareClick={handleSquareClick}
          isThinking={isThinking}
          gameStatus={gameStatus}
        />

        <MaterialCount game={game} playerColor={playerColor} bottom={true} />

        <div className="game-controls">
          {gameStatus === 'playing' && (
            <>
              <button className="control-btn" onClick={undoMove} disabled={!canUndo}>
                &#8630; Undo
              </button>
              <button className="control-btn resign-btn" onClick={resign}>
                &#9873; Resign
              </button>
            </>
          )}
          {gameStatus === 'gameover' && (
            <button className="control-btn new-game-btn" onClick={onNewGame}>
              &#9654; New Game
            </button>
          )}
          <button className="control-btn" onClick={onOpenSettings} title="Settings">
            &#9881;
          </button>
        </div>
      </div>

      <div className="game-right">
        <CoachPanel
          coach={currentCoach}
          commentary={commentary}
          isThinking={isThinking}
          voiceEnabled={settings?.voiceEnabled}
        />
        <MoveHistory
          moveHistory={moveHistory}
          playerColor={playerColor}
        />
      </div>
    </div>
  );
}
