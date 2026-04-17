// Stockfish Web Worker wrapper
// Manages two engine instances: one for the bot (limited strength) and one for analysis (max strength)

import { Chess } from 'chess.js';

class StockfishEngine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.currentEval = 0;
    this.currentDepth = 0;
    this.pvLine = '';
    this._pendingResolve = null;
    this._waitingForBestMove = false;
  }

  async init() {
    // Try different stockfish file paths
    const paths = [
      '/stockfish/stockfish-nnue-16-single.js',
      '/stockfish/stockfish-nnue-16.js',
      '/stockfish/stockfish-16-single.js',
      '/stockfish/stockfish.js'
    ];

    for (const path of paths) {
      try {
        await this._tryLoadWorker(path);
        return; // Success
      } catch (e) {
        continue; // Try next path
      }
    }
    throw new Error('Could not load Stockfish. Make sure to run: npm run setup');
  }

  _tryLoadWorker(path) {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(path);
        let resolved = false;

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            worker.terminate();
            reject(new Error('Timeout loading ' + path));
          }
        }, 8000);

        worker.onerror = (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            worker.terminate();
            reject(err);
          }
        };

        worker.onmessage = (e) => {
          const data = typeof e.data === 'string' ? e.data : '';

          if (!resolved && data.includes('uciok')) {
            resolved = true;
            clearTimeout(timeout);
            this.worker = worker;
            this.ready = true;
            // Set up permanent message handler
            this.worker.onmessage = (ev) => this._onMessage(ev.data);
            resolve();
            return;
          }
        };

        // Send UCI init command
        worker.postMessage('uci');

      } catch (err) {
        reject(err);
      }
    });
  }

  _send(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  _onMessage(data) {
    if (typeof data !== 'string') return;

    // Parse evaluation info
    if (data.startsWith('info') && data.includes('score')) {
      const depthMatch = data.match(/depth (\d+)/);
      const cpMatch = data.match(/score cp (-?\d+)/);
      const mateMatch = data.match(/score mate (-?\d+)/);
      const pvMatch = data.match(/ pv (.+)/);

      if (depthMatch) this.currentDepth = parseInt(depthMatch[1]);
      if (cpMatch) this.currentEval = parseInt(cpMatch[1]);
      if (mateMatch) this.currentEval = parseInt(mateMatch[1]) > 0 ? 10000 : -10000;
      if (pvMatch) this.pvLine = pvMatch[1];
    }

    // Best move found
    if (data.startsWith('bestmove')) {
      const match = data.match(/bestmove (\S+)/);
      if (match && this._pendingResolve) {
        const resolve = this._pendingResolve;
        this._pendingResolve = null;
        resolve({
          move: match[1],
          eval: this.currentEval,
          depth: this.currentDepth,
          pv: this.pvLine
        });
      }
    }
  }

  // Configure for limited-strength play
  setStrength(elo) {
    const clampedElo = Math.max(100, Math.min(3000, elo));
    this._send('setoption name UCI_LimitStrength value true');
    this._send(`setoption name UCI_Elo value ${clampedElo}`);
    // Also set Skill Level (0-20) for additional weakening at low ELOs
    // Stockfish's UCI_Elo floor is ~1320, so Skill Level helps below that
    const skillLevel = Math.max(0, Math.min(20, Math.floor((clampedElo - 100) / 145)));
    this._send(`setoption name Skill Level value ${skillLevel}`);
  }

  // Configure for max strength analysis
  setMaxStrength() {
    this._send('setoption name UCI_LimitStrength value false');
    this._send('setoption name Skill Level value 20');
  }

  // Get best move at current strength setting
  getBestMove(fen, depth = 15) {
    return new Promise((resolve) => {
      this.currentEval = 0;
      this.currentDepth = 0;
      this.pvLine = '';
      this._pendingResolve = resolve;
      this._send('position fen ' + fen);
      this._send('go depth ' + depth);
    });
  }

  // Get evaluation/analysis of a position
  getEvaluation(fen, depth = 18) {
    return new Promise((resolve) => {
      this.currentEval = 0;
      this.currentDepth = 0;
      this.pvLine = '';
      this._pendingResolve = resolve;
      this._send('position fen ' + fen);
      this._send('go depth ' + depth);
    });
  }

  stop() {
    this._send('stop');
  }

  newGame() {
    this._send('ucinewgame');
    this._send('isready'); // Wait for engine to be ready
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Engine manager: creates and manages bot + analyst engines
class EngineManager {
  constructor() {
    this.botEngine = new StockfishEngine();
    this.analystEngine = new StockfishEngine();
    this.initialized = false;
  }

  async init() {
    await Promise.all([
      this.botEngine.init(),
      this.analystEngine.init()
    ]);
    this.analystEngine.setMaxStrength();
    this.initialized = true;
  }

  setElo(elo) {
    this.currentElo = elo;
    this.botEngine.setStrength(elo);
  }

  async getBotMove(fen) {
    // Scale search depth with ELO — low ELO = shallow search = weaker play
    const elo = this.currentElo || 800;
    let depth;
    if (elo <= 200) depth = 1;
    else if (elo <= 400) depth = 2;
    else if (elo <= 600) depth = 3;
    else if (elo <= 800) depth = 5;
    else if (elo <= 1000) depth = 7;
    else if (elo <= 1200) depth = 8;
    else if (elo <= 1500) depth = 10;
    else if (elo <= 2000) depth = 12;
    else if (elo <= 2500) depth = 15;
    else depth = 18;

    // Beginner play: blend random legal moves with engine moves.
    // Stockfish's UCI_LimitStrength floor is ~1320, and even Skill 0 is too
    // strong for true beginners. So below ~1200 we mix in random moves.
    let randomChance = 0;
    if (elo <= 150) randomChance = 0.95;
    else if (elo <= 250) randomChance = 0.85;
    else if (elo <= 400) randomChance = 0.65;
    else if (elo <= 600) randomChance = 0.45;
    else if (elo <= 800) randomChance = 0.25;
    else if (elo <= 1000) randomChance = 0.12;
    else if (elo <= 1200) randomChance = 0.05;

    if (randomChance > 0 && Math.random() < randomChance) {
      const randomMove = this._pickRandomLegalMove(fen, elo);
      if (randomMove) return randomMove;
    }

    return this.botEngine.getBestMove(fen, depth);
  }

  // Pick a random legal move. At slightly higher ELO, bias toward
  // "obvious" moves (captures) so the bot still grabs free pieces sometimes.
  _pickRandomLegalMove(fen, elo) {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) return null;

      // Below ~300 ELO: pure random — beginners hang pieces and miss captures.
      // Above that: 50% chance to prefer a capture if one exists.
      let pick;
      if (elo > 300 && Math.random() < 0.5) {
        const captures = moves.filter(m => m.captured);
        pick = captures.length > 0
          ? captures[Math.floor(Math.random() * captures.length)]
          : moves[Math.floor(Math.random() * moves.length)];
      } else {
        pick = moves[Math.floor(Math.random() * moves.length)];
      }

      const uci = pick.from + pick.to + (pick.promotion || '');
      return { move: uci, eval: 0, depth: 0, pv: uci };
    } catch (e) {
      return null;
    }
  }

  async analyzePosition(fen) {
    this.analystEngine.setMaxStrength();
    return this.analystEngine.getEvaluation(fen, 18);
  }

  newGame() {
    this.botEngine.newGame();
    this.analystEngine.newGame();
  }

  destroy() {
    this.botEngine.destroy();
    this.analystEngine.destroy();
  }
}

export { StockfishEngine, EngineManager };
export default EngineManager;
