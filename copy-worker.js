import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source: inside node_modules
const source = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
// Destination: inside public folder
const destDir = path.join(__dirname, 'public');
const dest = path.join(destDir, 'pdf.worker.min.mjs');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

fs.copyFileSync(source, dest);
console.log('SUCCESS: Worker file copied to public/pdf.worker.min.mjs');
