import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import EngineManager from '../engine/stockfish.js';
import { generateCommentary, generateGreeting, generateGameOverComment } from '../engine/commentary.js';

export default function useChessGame() {
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('start');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [commentary, setCommentary] = useState([]);
  const [playerColor, setPlayerColor] = useState('w');
  const [gameStatus, setGameStatus] = useState('idle'); // idle, playing, gameover
  const [gameResult, setGameResult] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [currentElo, setCurrentElo] = useState(800);
  const [currentCoach, setCurrentCoach] = useState(null);
  const [engineReady, setEngineReady] = useState(false);
  const [evalBefore, setEvalBefore] = useState(0);
  const [promotionPending, setPromotionPending] = useState(null); // { from, to } when player needs to pick a piece

  const engineRef = useRef(null);
  const gameRef = useRef(game);

  // Keep ref in sync
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Initialize engine
  useEffect(() => {
    const engine = new EngineManager();
    engineRef.current = engine;

    engine.init().then(() => {
      setEngineReady(true);
      console.log('Stockfish engines ready');
    }).catch(err => {
      console.error('Failed to init Stockfish:', err);
    });

    return () => engine.destroy();
  }, []);

  // Add a commentary message
  const addCommentary = useCallback((text, type = 'coach') => {
    setCommentary(prev => [...prev, { text, type, timestamp: Date.now() }]);
  }, []);

  // Check game over conditions
  const checkGameOver = useCallback((g) => {
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'b' : 'w';
      const result = winner === playerColor ? 'checkmate-win' : 'checkmate-loss';
      setGameStatus('gameover');
      setGameResult(result);
      if (currentCoach) {
        addCommentary(generateGameOverComment(result, currentCoach));
      }
      return true;
    }
    if (g.isStalemate()) {
      setGameStatus('gameover');
      setGameResult('stalemate');
      if (currentCoach) addCommentary(generateGameOverComment('stalemate', currentCoach));
      return true;
    }
    if (g.isDraw()) {
      setGameStatus('gameover');
      setGameResult('draw');
      if (currentCoach) addCommentary(generateGameOverComment('draw', currentCoach));
      return true;
    }
    return false;
  }, [playerColor, currentCoach, addCommentary]);

  // Make the bot move
  const makeBotMove = useCallback(async (g) => {
    if (!engineRef.current?.initialized) return;

    setIsThinking(true);

    try {
      // Get evaluation before bot move
      const preAnalysis = await engineRef.current.analyzePosition(g.fen());
      const prevEval = preAnalysis.eval;

      // Get bot's move at limited strength
      const result = await engineRef.current.getBotMove(g.fen());

      if (!result?.move) {
        setIsThinking(false);
        return;
      }

      // Parse UCI move (e.g., "e2e4") to chess.js format
      const from = result.move.substring(0, 2);
      const to = result.move.substring(2, 4);
      const promotion = result.move.length > 4 ? result.move[4] : undefined;

      const newGame = new Chess(g.fen());
      const move = newGame.move({ from, to, promotion });

      if (!move) {
        setIsThinking(false);
        return;
      }

      // Get evaluation after bot move
      const postAnalysis = await engineRef.current.analyzePosition(newGame.fen());
      const newEval = postAnalysis.eval;

      setGame(newGame);
      setPosition(newGame.fen());
      setLastMove({ from, to });
      setMoveHistory(prev => [...prev, move]);
      setEvalBefore(newEval);

      // Generate bot move commentary
      if (currentCoach) {
        const comment = generateCommentary({
          chess: newGame,
          move,
          isPlayerMove: false,
          isPlayerWhite: playerColor === 'w',
          evalBefore: prevEval,
          evalAfter: newEval,
          coach: currentCoach,
          moveNumber: newGame.moveNumber()
        });
        addCommentary(comment);
      }

      checkGameOver(newGame);
    } catch (err) {
      console.error('Bot move error:', err);
    }

    setIsThinking(false);
  }, [playerColor, currentCoach, addCommentary, checkGameOver]);

  // Complete a player move (used both for regular moves and after the user
  // picks a promotion piece). Handles eval, commentary, and scheduling the
  // bot reply.
  const executePlayerMove = useCallback(async (from, to, promotion) => {
    const g = gameRef.current;
    const fenBefore = g.fen();
    const newGame = new Chess(fenBefore);
    const move = newGame.move({ from, to, promotion });
    if (!move) return;

    let newEval = 0;
    try {
      const postAnalysis = await engineRef.current.analyzePosition(newGame.fen());
      newEval = postAnalysis.eval;
    } catch (e) {
      // Engine might not be ready
    }

    setGame(newGame);
    setPosition(newGame.fen());
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove({ from, to });
    setMoveHistory(prev => [...prev, move]);

    const chessBefore = new Chess(fenBefore);
    if (currentCoach) {
      const comment = generateCommentary({
        chess: newGame,
        chessBefore,
        move,
        isPlayerMove: true,
        isPlayerWhite: playerColor === 'w',
        evalBefore,
        evalAfter: newEval,
        coach: currentCoach,
        moveNumber: newGame.moveNumber()
      });
      addCommentary(comment);
    }

    setEvalBefore(newEval);

    if (checkGameOver(newGame)) return;
    setTimeout(() => makeBotMove(newGame), 300);
  }, [playerColor, currentCoach, evalBefore, addCommentary, checkGameOver, makeBotMove]);

  // Called from the promotion modal with the piece the user picked ('q','r','b','n').
  const choosePromotion = useCallback(async (piece) => {
    if (!promotionPending) return;
    const { from, to } = promotionPending;
    setPromotionPending(null);
    await executePlayerMove(from, to, piece);
  }, [promotionPending, executePlayerMove]);

  // Handle square click for player moves
  const handleSquareClick = useCallback(async (square) => {
    if (gameStatus !== 'playing' || isThinking) return;

    const g = gameRef.current;
    if (g.turn() !== playerColor) return;

    const piece = g.get(square);

    // If clicking on own piece, select it
    if (piece && piece.color === playerColor) {
      setSelectedSquare(square);
      const moves = g.moves({ square, verbose: true });
      setLegalMoves(moves.map(m => m.to));
      return;
    }

    // If a piece is selected and clicking on a legal move target
    if (selectedSquare && legalMoves.includes(square)) {
      // Check for promotion — defer the move and let the user pick a piece.
      const movingPiece = g.get(selectedSquare);
      const isPromotion = movingPiece?.type === 'p' &&
        ((movingPiece.color === 'w' && square[1] === '8') ||
         (movingPiece.color === 'b' && square[1] === '1'));

      if (isPromotion) {
        setPromotionPending({ from: selectedSquare, to: square });
        return;
      }

      await executePlayerMove(selectedSquare, square, undefined);
    } else {
      // Deselect
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [gameStatus, isThinking, playerColor, selectedSquare, legalMoves, executePlayerMove]);

  // Start a new game
  const startGame = useCallback((coach, elo, color) => {
    const newGame = new Chess();
    setGame(newGame);
    setPosition(newGame.fen());
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setCommentary([]);
    setPlayerColor(color);
    setCurrentElo(elo);
    setCurrentCoach(coach);
    setGameStatus('playing');
    setGameResult(null);
    setIsThinking(false);
    setEvalBefore(0);
    setPromotionPending(null);

    if (engineRef.current?.initialized) {
      engineRef.current.newGame();
      engineRef.current.setElo(elo);
    }

    // Add greeting
    addCommentary(generateGreeting(coach));

    // If player is black, bot moves first
    if (color === 'b') {
      setTimeout(() => makeBotMove(newGame), 500);
    }
  }, [addCommentary, makeBotMove]);

  // Resign
  const resign = useCallback(() => {
    setGameStatus('gameover');
    setGameResult('resign');
    if (currentCoach) {
      addCommentary(generateGameOverComment('resign', currentCoach));
    }
  }, [currentCoach, addCommentary]);

  // Undo last move pair (player + bot)
  const undoMove = useCallback(() => {
    // Rebuild the game from move history minus last 2 moves
    const movesToKeep = moveHistory.slice(0, -2);
    const newGame = new Chess();
    for (const m of movesToKeep) {
      newGame.move(m.san);
    }
    setGame(newGame);
    setPosition(newGame.fen());
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(movesToKeep.length > 0 ? {
      from: movesToKeep[movesToKeep.length - 1].from,
      to: movesToKeep[movesToKeep.length - 1].to
    } : null);
    setMoveHistory(movesToKeep);
    setPromotionPending(null);
    addCommentary("Move taken back. Let's try a different approach!");
  }, [moveHistory, addCommentary]);

  return {
    position,
    game,
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
    engineReady,
    promotionPending,
    choosePromotion,
    handleSquareClick,
    startGame,
    resign,
    undoMove,
    setCurrentElo: (elo) => {
      setCurrentElo(elo);
      if (engineRef.current?.initialized) {
        engineRef.current.setElo(elo);
      }
    }
  };
}
