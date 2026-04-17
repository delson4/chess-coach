// Copies Stockfish WASM files from node_modules to public/stockfish
import { cpSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, 'node_modules', 'stockfish', 'src');
const dest = join(__dirname, 'public', 'stockfish');

if (!existsSync(src)) {
  console.error('Stockfish not found in node_modules. Run npm install first.');
  process.exit(1);
}

console.log('Copying Stockfish engine files...');
const files = readdirSync(src);
for (const file of files) {
  const fullPath = join(src, file);
  // Only copy .js and .wasm files, skip directories
  if (file.endsWith('.js') || file.endsWith('.wasm')) {
    cpSync(fullPath, join(dest, file));
    console.log(`  Copied: ${file}`);
  }
}
console.log('Stockfish files ready.');
