import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, '..', 'static');

// Generate a simple SVG icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#4263eb"/>
  <g transform="translate(128, 100) scale(10.5)" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </g>
  <text x="256" y="420" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="bold" font-size="80">HC</text>
</svg>`;

fs.writeFileSync(path.join(staticDir, 'icon.svg'), svg);

// For PWA icons we need actual PNGs. Since we can't generate PNG from Node without deps,
// we'll use the SVG as favicon and create a simple HTML page to generate them.
// For now, we'll copy the existing favicon and note that proper icons should be generated.
console.log('SVG icon generated at static/icon.svg');
console.log('Note: For production, generate icon-192.png and icon-512.png from the SVG.');
