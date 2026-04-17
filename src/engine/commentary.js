// Commentary generator
// Analyzes positions using max-strength Stockfish and generates
// coach-personality-appropriate commentary for each move.

import { Chess } from 'chess.js';

// Classify how good a player's move was based on evaluation change.
// Thresholds are intentionally lenient — a move only gets tagged as a blunder
// if the eval actually swings meaningfully against the player. At low bot
// ELOs, the eval often spikes after a bot mistake, and a "fine but not
// optimal" player response looks artificially bad with tight thresholds.
function classifyMove(evalBefore, evalAfter, isPlayerWhite) {
  // Normalize: positive = good for player
  const before = isPlayerWhite ? evalBefore : -evalBefore;
  const after = isPlayerWhite ? evalAfter : -evalAfter;

  // Clamp mate-score sentinels (±10000) so a non-mate move near a mate
  // doesn't register as a -10000 cp blunder.
  const clampedBefore = Math.max(-1500, Math.min(1500, before));
  const clampedAfter = Math.max(-1500, Math.min(1500, after));
  const delta = clampedAfter - clampedBefore;

  // If the player is still clearly winning after the move, it's at worst an
  // inaccuracy — you haven't "blundered" if you're still up a piece.
  if (clampedAfter > 250) {
    if (delta > 60) return 'brilliant';
    if (delta > -120) return 'good';
    if (delta > -350) return 'inaccuracy';
    return 'mistake';
  }

  if (delta > 120) return 'brilliant';
  if (delta > -60) return 'good';
  if (delta > -150) return 'inaccuracy';
  if (delta > -300) return 'mistake';
  return 'blunder';
}

// Detect tactical and positional features of a move
function detectFeatures(chess, move, evalData) {
  const features = [];

  if (!move) return features;

  // Basic move properties
  if (move.captured) {
    features.push({ type: 'capture', piece: move.piece, captured: move.captured, square: move.to });
  }
  if (move.san && move.san.includes('+')) {
    features.push({ type: 'check' });
  }
  if (move.san && move.san.includes('#')) {
    features.push({ type: 'checkmate' });
  }
  if (move.flags && move.flags.includes('k')) {
    features.push({ type: 'castle', side: 'kingside' });
  }
  if (move.flags && move.flags.includes('q')) {
    features.push({ type: 'castle', side: 'queenside' });
  }
  if (move.flags && move.flags.includes('p')) {
    features.push({ type: 'promotion', promoteTo: move.promotion });
  }

  // Detect piece development (moves from back rank in opening)
  const backRank = move.color === 'w' ? '1' : '8';
  if (move.from && move.from[1] === backRank && ['n', 'b'].includes(move.piece)) {
    features.push({ type: 'development', piece: move.piece });
  }

  // Detect pawn structure changes
  if (move.piece === 'p') {
    // Center pawn advance
    if (['d4', 'd5', 'e4', 'e5'].includes(move.to)) {
      features.push({ type: 'center_control' });
    }
  }

  // Detect forks by checking which enemy pieces the moved piece now attacks
  try {
    const forkTargets = detectFork(chess, move);
    if (forkTargets.length >= 2) {
      const targetNames = forkTargets.map(t => t.type);
      const isKingQueenFork = targetNames.includes('k') && targetNames.includes('q');
      const isRoyalFork = targetNames.includes('k');
      features.push({
        type: 'fork',
        attacker: move.piece,
        targets: forkTargets.length,
        targetPieces: forkTargets,
        isKingQueenFork,
        isRoyalFork
      });
    }
  } catch (e) {
    // Position analysis failed, skip
  }

  return features;
}

// Detect forks: a piece attacks 2+ valuable enemy pieces simultaneously
function detectFork(chess, move) {
  const attackedPieces = [];
  const opponentColor = move.color === 'w' ? 'b' : 'w';

  // Get all squares the moved piece can now attack
  // We use chess.js moves() from the new position but filter for the attacking piece
  const board = chess.board();
  const movedPiece = chess.get(move.to);
  if (!movedPiece) return [];

  // For each square on the board, check if our piece could move there (attack it)
  const files = 'abcdefgh';
  const ranks = '12345678';

  for (let fi = 0; fi < 8; fi++) {
    for (let ri = 0; ri < 8; ri++) {
      const targetSquare = files[fi] + ranks[ri];
      if (targetSquare === move.to) continue;

      const targetPiece = chess.get(targetSquare);
      if (!targetPiece || targetPiece.color !== opponentColor) continue;

      // Check if our piece attacks this square
      if (doesPieceAttack(movedPiece.type, move.to, targetSquare, chess)) {
        attackedPieces.push({ type: targetPiece.type, square: targetSquare });
      }
    }
  }

  // Filter to only "valuable" targets (not pawns unless attacking king+anything)
  const hasKing = attackedPieces.some(p => p.type === 'k');
  if (hasKing) {
    // Royal fork - king + anything is valuable
    return attackedPieces.filter(p => ['k', 'q', 'r', 'b', 'n'].includes(p.type));
  }

  // Otherwise, only count pieces (not pawns)
  return attackedPieces.filter(p => ['q', 'r', 'b', 'n'].includes(p.type));
}

// Check if a piece type at fromSquare attacks toSquare
function doesPieceAttack(pieceType, fromSquare, toSquare, chess) {
  const fc = fromSquare.charCodeAt(0) - 97; // file 0-7
  const fr = parseInt(fromSquare[1]) - 1;    // rank 0-7
  const tc = toSquare.charCodeAt(0) - 97;
  const tr = parseInt(toSquare[1]) - 1;
  const df = tc - fc;
  const dr = tr - fr;

  switch (pieceType) {
    case 'n': // Knight
      return (Math.abs(df) === 2 && Math.abs(dr) === 1) ||
             (Math.abs(df) === 1 && Math.abs(dr) === 2);

    case 'b': // Bishop
      if (Math.abs(df) !== Math.abs(dr) || df === 0) return false;
      return isPathClear(fc, fr, tc, tr, chess);

    case 'r': // Rook
      if (df !== 0 && dr !== 0) return false;
      return isPathClear(fc, fr, tc, tr, chess);

    case 'q': // Queen
      if (df !== 0 && dr !== 0 && Math.abs(df) !== Math.abs(dr)) return false;
      return isPathClear(fc, fr, tc, tr, chess);

    case 'p': // Pawn
      const pawnDir = chess.get(fromSquare).color === 'w' ? 1 : -1;
      return dr === pawnDir && Math.abs(df) === 1;

    case 'k': // King
      return Math.abs(df) <= 1 && Math.abs(dr) <= 1;

    default:
      return false;
  }
}

// Check if the path between two squares is clear (for sliding pieces)
function isPathClear(fc, fr, tc, tr, chess) {
  const files = 'abcdefgh';
  const stepF = Math.sign(tc - fc);
  const stepR = Math.sign(tr - fr);
  let cf = fc + stepF;
  let cr = fr + stepR;

  while (cf !== tc || cr !== tr) {
    const sq = files[cf] + (cr + 1);
    if (chess.get(sq)) return false; // Blocked
    cf += stepF;
    cr += stepR;
  }
  return true;
}

const pieceNames = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'
};

function pieceName(p) {
  return pieceNames[p] || p;
}

// Detect if the player left a piece hanging (undefended and attackable)
function detectHangingPiece(chessBefore, chessAfter, move, isPlayerWhite) {
  if (!move) return null;
  // If the bot can capture the piece we just moved, and the eval dropped, it's hanging
  const playerColor = isPlayerWhite ? 'w' : 'b';
  const botColor = isPlayerWhite ? 'b' : 'w';

  // Check if the moved piece can be captured on its new square
  const botMoves = chessAfter.moves({ verbose: true });
  const captures = botMoves.filter(m => m.to === move.to && m.captured);
  if (captures.length > 0 && move.piece !== 'p') {
    return { piece: move.piece, square: move.to };
  }

  // Check if we moved a piece that was defending something
  // (simplified: check if any of our pieces are now attacked and undefended)
  return null;
}

// Generate piece-specific blunder commentary
function generateBlunderComment(move, features, chessBefore, chessAfter, isPlayerWhite) {
  const hanging = detectHangingPiece(chessBefore, chessAfter, move, isPlayerWhite);

  if (hanging) {
    return pickRandom([
      `You blundered your ${pieceName(hanging.piece)} on ${hanging.square}! Be more careful with it next time!`,
      `Your ${pieceName(hanging.piece)} on ${hanging.square} is hanging! That's going to cost you.`,
      `Oops, your ${pieceName(hanging.piece)} is undefended on ${hanging.square}. Watch out for that!`,
      `That ${pieceName(hanging.piece)} move to ${hanging.square} leaves it vulnerable. Protect your pieces!`
    ]);
  }

  // Check if we walked into a capture
  for (const feat of features) {
    if (feat.type === 'capture' && feat.captured) {
      // This shouldn't happen for blunders (player capturing is usually good)
      // unless the recapture is worse
    }
  }

  // Generic piece-aware blunder messages
  return pickRandom([
    `That ${pieceName(move.piece)} move to ${move.to} was a serious mistake. Be more careful!`,
    `Moving your ${pieceName(move.piece)} there was a blunder. Think about what your opponent can do!`,
    `Your ${pieceName(move.piece)} is in trouble after that move. Always check for threats!`,
    `That was a bad spot for your ${pieceName(move.piece)}. Look before you leap!`
  ]);
}

// Generate specific tactical commentary based on features
function generateTacticalComment(features, move, coach) {
  for (const feat of features) {
    switch (feat.type) {
      case 'fork':
        if (feat.isKingQueenFork) {
          return pickRandom([
            `Incredible! Your ${pieceName(move.piece)} is forking the king and queen! That's devastating!`,
            `ROYAL FORK! Your ${pieceName(move.piece)} attacks both the king and queen \u2014 the queen is lost!`,
            `That's a king-queen fork with your ${pieceName(move.piece)}! You're winning the queen!`,
            `Brilliant! A fork on the king and queen \u2014 that ${pieceName(move.piece)} is doing serious damage!`
          ]);
        }
        if (feat.isRoyalFork) {
          return pickRandom([
            `Your ${pieceName(move.piece)} is forking the king! The other piece is as good as yours!`,
            `Fork with check! Your ${pieceName(move.piece)} attacks the king and wins material!`,
            `That's a fork involving the king \u2014 guaranteed material gain!`
          ]);
        }
        return pickRandom([
          `Nice job, you found a fork with your ${pieceName(move.piece)}!`,
          `That's a fork! Your ${pieceName(move.piece)} is attacking ${feat.targets} pieces at once!`,
          `Excellent tactic \u2014 that's a double attack with your ${pieceName(move.piece)}!`,
          `Your ${pieceName(move.piece)} is forking ${feat.targets} pieces! Something's gotta give!`
        ]);
      case 'checkmate':
        return pickRandom([
          'Checkmate! Brilliant finish!',
          'That\'s checkmate! Game over!',
          'Checkmate! Well played!'
        ]);
      case 'check':
        return pickRandom([
          `Check! That puts pressure on the king.`,
          `Check! Keep the attack going.`,
          `That's a check \u2014 the king must move.`
        ]);
      case 'castle':
        return pickRandom([
          `Good, castling ${feat.side}. Your king is safer now.`,
          `Smart \u2014 get that king to safety with a ${feat.side} castle.`,
          `Castling is almost always a good idea. King safety first!`
        ]);
      case 'promotion':
        return pickRandom([
          `Promotion! That pawn earned its crown!`,
          `A new queen is born! That changes everything.`,
          `Promotion \u2014 the pawn's dream comes true!`
        ]);
      case 'capture':
        if (['q', 'r'].includes(feat.captured)) {
          return pickRandom([
            `Great capture! Taking the ${pieceName(feat.captured)} is a big win.`,
            `You grabbed the ${pieceName(feat.captured)}! That's a major material gain.`,
            `Excellent \u2014 winning the ${pieceName(feat.captured)} on ${feat.square}.`
          ]);
        }
        break;
      case 'development':
        return pickRandom([
          `That opens up your ${pieceName(move.piece)} for development.`,
          `Good \u2014 developing your ${pieceName(move.piece)} early is important.`,
          `Nice development move. Get those pieces into the game!`
        ]);
      case 'center_control':
        return pickRandom([
          `Claiming the center \u2014 that's fundamental.`,
          `Good pawn move. Controlling the center is key.`,
          `Center control! That's the right idea in the opening.`
        ]);
    }
  }
  return null;
}

// Generate commentary for the bot's own move
function generateBotMoveComment(move, features, evalData, coach) {
  // Check for specific tactical situations
  for (const feat of features) {
    if (feat.type === 'check') {
      return pickRandom([
        `Check! I'm putting pressure on your king.`,
        `Check! You'll need to deal with this.`,
        `I'm checking your king \u2014 be careful.`
      ]);
    }
    if (feat.type === 'capture') {
      return pickRandom([
        `I'm taking your ${pieceName(feat.captured)} on ${feat.square}.`,
        `I'll grab that ${pieceName(feat.captured)}. Thank you!`,
        `Capturing the ${pieceName(feat.captured)} \u2014 that helps my position.`
      ]);
    }
    if (feat.type === 'fork') {
      if (feat.isKingQueenFork) {
        return pickRandom([
          `I'm forking your king and queen with my ${pieceName(move.piece)}! Your queen is mine!`,
          `Royal fork! My ${pieceName(move.piece)} attacks your king and queen \u2014 you're losing the queen.`,
          `Check! And I'm also attacking your queen. King-queen fork!`
        ]);
      }
      return pickRandom([
        `My ${pieceName(move.piece)} is attacking multiple pieces now. What will you save?`,
        `That's a fork \u2014 you'll have to choose what to save.`,
        `Double attack with my ${pieceName(move.piece)}! Pick your poison.`
      ]);
    }
    if (feat.type === 'castle') {
      return pickRandom([
        `I'm castling to keep my king safe.`,
        `Time to get my king tucked away.`,
        `Castling \u2014 safety first, even for me.`
      ]);
    }
  }

  // Positional commentary based on the piece moved
  if (move.piece === 'p') {
    return pickRandom([
      `I'm advancing my pawn to ${move.to}.`,
      `Pawn to ${move.to} \u2014 building my structure.`,
      `I'm pushing to ${move.to}, claiming some space.`
    ]);
  }

  return pickRandom([
    `I'm playing ${pieceName(move.piece)} to ${move.to}.`,
    `${pieceName(move.piece).charAt(0).toUpperCase() + pieceName(move.piece).slice(1)} to ${move.to}.`,
    `I'm developing my ${pieceName(move.piece)}.`
  ]);
}

// Advice based on the analysis of the position
function generateAdvice(chess, evalData, isPlayerWhite) {
  const eval_ = isPlayerWhite ? evalData.eval : -evalData.eval;

  if (eval_ > 300) {
    return pickRandom([
      "You're winning! Look for a way to simplify and trade pieces.",
      "Great position! Keep up the pressure and convert your advantage.",
      "You're well ahead. Don't get careless now!"
    ]);
  }
  if (eval_ > 100) {
    return pickRandom([
      "You have a nice edge. Keep playing accurately.",
      "Slight advantage for you. Stay focused.",
      "The position favors you. Look for improvements."
    ]);
  }
  if (eval_ > -100) {
    return pickRandom([
      "The position is about equal. Keep fighting!",
      "It's a balanced game. Look for opportunities.",
      "Even position \u2014 the next few moves are critical."
    ]);
  }
  if (eval_ > -300) {
    return pickRandom([
      "I'm slightly better here. Be careful.",
      "You're a bit worse. Look for counterplay.",
      "The position is tricky for you. Stay alert."
    ]);
  }
  return pickRandom([
    "You're in trouble. Try to complicate the position!",
    "Tough position. Look for any chance to fight back.",
    "Don't give up \u2014 swindles happen at every level!"
  ]);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Piece values for simple material math.
const pieceValue = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

// A capture is "safe" if it wins material outright or trades up. Used to
// avoid flagging obviously-good captures (like taking an attacker) as blunders
// when the eval classifier is over-sensitive.
function isSafeCapture(move, chessBefore, chessAfter) {
  if (!move || !move.captured) return false;
  const gained = pieceValue[move.captured] || 0;
  const risked = pieceValue[move.piece] || 0;
  if (gained >= risked) return true;
  // Otherwise, safe only if the capturing piece can't be recaptured.
  const recaptures = chessAfter.moves({ verbose: true })
    .filter(m => m.to === move.to && m.captured);
  return recaptures.length === 0;
}

// Main commentary generation function
export function generateCommentary({
  chess,
  chessBefore,
  move,
  isPlayerMove,
  isPlayerWhite,
  evalBefore,
  evalAfter,
  coach,
  moveNumber
}) {
  const features = detectFeatures(chess, move, { eval: evalAfter });

  if (isPlayerMove) {
    // Comment on the player's move quality
    let quality = classifyMove(evalBefore, evalAfter, isPlayerWhite);

    // Never flag castling or a safe capture as a mistake/blunder — these are
    // almost always good moves, and false-positive alerts confuse learners.
    const isCastle = features.some(f => f.type === 'castle');
    const safeCapture = move.captured && isSafeCapture(move, chessBefore, chess);
    if ((isCastle || safeCapture) && (quality === 'blunder' || quality === 'mistake' || quality === 'inaccuracy')) {
      quality = 'good';
    }

    // For blunders and mistakes, use piece-specific commentary
    if ((quality === 'blunder' || quality === 'mistake') && chessBefore) {
      const blunderComment = generateBlunderComment(move, features, chessBefore, chess, isPlayerWhite);
      const personalityComment = pickRandom(coach.moveTemplates[quality]);
      // Combine personality + specific feedback
      return `${personalityComment} ${blunderComment}`;
    }

    // Try tactical commentary first
    const tacticalComment = generateTacticalComment(features, move, coach);
    if (tacticalComment && Math.random() > 0.3) {
      // Combine tactical comment with quality assessment
      const qualityComment = pickRandom(coach.moveTemplates[quality]);
      return `${qualityComment} ${tacticalComment}`;
    }

    // Fall back to quality-based template commentary
    const baseComment = pickRandom(coach.moveTemplates[quality]);

    // Add positional advice sometimes
    if (Math.random() > 0.6) {
      const advice = generateAdvice(chess, { eval: evalAfter }, isPlayerWhite);
      return `${baseComment} ${advice}`;
    }

    return baseComment;
  } else {
    // Comment on the bot's own move
    const botPersonality = pickRandom(coach.moveTemplates.botMove);

    // Try specific bot move commentary
    const botSpecific = generateBotMoveComment(move, features, { eval: evalAfter }, coach);
    if (botSpecific && Math.random() > 0.4) {
      return botSpecific;
    }

    return botPersonality;
  }
}

// Generate a greeting when the game starts
export function generateGreeting(coach) {
  return pickRandom(coach.greetings);
}

// Generate game-over commentary
export function generateGameOverComment(result, coach) {
  switch (result) {
    case 'checkmate-win':
      return pickRandom([
        "Checkmate! Congratulations, you played a great game!",
        "Checkmate! You won! Brilliantly done!",
        "That's checkmate \u2014 you crushed it!"
      ]);
    case 'checkmate-loss':
      return pickRandom([
        "Checkmate! Better luck next time. Let's review what happened.",
        "I got you this time. Want to try again?",
        "Checkmate. Don't worry, every loss is a lesson!"
      ]);
    case 'stalemate':
      return pickRandom([
        "Stalemate! It's a draw. So close!",
        "Stalemate \u2014 nobody wins this one.",
        "A draw by stalemate. Interesting finish!"
      ]);
    case 'draw':
      return pickRandom([
        "It's a draw! A hard-fought game.",
        "Draw! You held your ground well.",
        "Neither side could break through. Good game!"
      ]);
    case 'resign':
      return pickRandom([
        "You resigned. No shame in it \u2014 every game teaches something.",
        "Game over. Let's start a new one when you're ready!",
        "Sometimes it's wise to resign and start fresh."
      ]);
    default:
      return "Game over! Want to play again?";
  }
}
