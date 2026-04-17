import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, unlinkSync, mkdirSync } from 'fs';
import { EdgeTTS } from 'node-edge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Prevent unhandled errors from crashing the server
process.on('uncaughtException', (err) => {
  console.error('[CRASH PREVENTED] Uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH PREVENTED] Unhandled rejection:', reason?.message || reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Create temp directory for TTS audio files
const tmpDir = join(__dirname, '.tts-cache');
mkdirSync(tmpDir, { recursive: true });

app.use(express.json());

// Serve static files from the built frontend
app.use(express.static(join(__dirname, 'dist')));

// Serve stockfish files from public directory
app.use('/stockfish', express.static(join(__dirname, 'public', 'stockfish')));

// TTS endpoint using Microsoft Edge's neural voices (free, no API key)
let requestCounter = 0;

app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const audioFile = join(tmpDir, `tts-${Date.now()}-${requestCounter++}.mp3`);

  try {
    const tts = new EdgeTTS({
      voice: voice || 'en-US-GuyNeural',
      lang: 'en-US',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      pitch: '+0Hz',
      rate: '+0%',
      volume: '+0%'
    });

    // Timeout TTS after 10 seconds to prevent hung connections
    await Promise.race([
      tts.ttsPromise(text, audioFile),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TTS timeout')), 10000))
    ]);

    const audio = readFileSync(audioFile);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audio.length,
      'Cache-Control': 'no-cache'
    });
    res.send(audio);

    // Clean up temp file
    try { unlinkSync(audioFile); } catch {}
  } catch (err) {
    console.error('TTS error:', err.message || JSON.stringify(err));
    // Clean up on error too
    try { unlinkSync(audioFile); } catch {}
    res.status(500).json({ error: 'TTS generation failed' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Chess Coach is running at:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://0.0.0.0:${PORT}`);
  console.log(`  TTS:     Edge neural voices (requires internet)`);
});
