/**
 * Parse hymn content into verses.
 * Each verse is an array of lines.
 * Returns: { lines: string[], isChorus: boolean }[]
 */
export function parseVerses(content) {
  const blocks = content.split(/\n\s*\n/);
  return blocks
    .map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length === 0) return null;
      const isChorus = !/^\d/.test(lines[0]);
      return { lines, isChorus };
    })
    .filter(Boolean);
}

/**
 * Build presentation sequence: each verse followed by the chorus.
 * If there's no chorus, returns verses unchanged.
 */
/** Short haptic feedback if supported. */
export function haptic(pattern = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
}

const MAX_LINES_PER_SLIDE = 2;

function splitBlock(block) {
  if (!block.lines || block.lines.length <= MAX_LINES_PER_SLIDE) return [block];
  const chunks = [];
  for (let i = 0; i < block.lines.length; i += MAX_LINES_PER_SLIDE) {
    chunks.push({ ...block, lines: block.lines.slice(i, i + MAX_LINES_PER_SLIDE) });
  }
  return chunks;
}

export function buildPresentationSequence(verses, titleMeta = null) {
  const chorus = verses.find(v => v.isChorus);
  let body = [];
  if (!chorus) {
    for (const v of verses) body.push(...splitBlock(v));
  } else {
    const verseBlocks = verses.filter(v => !v.isChorus);
    const chorusChunks = splitBlock(chorus);
    if (verseBlocks.length === 0) {
      body = chorusChunks;
    } else {
      for (const v of verseBlocks) {
        body.push(...splitBlock(v));
        body.push(...chorusChunks);
      }
    }
  }
  return titleMeta
    ? [{ isTitle: true, number: titleMeta.number, title: titleMeta.title }, ...body]
    : body;
}

/**
 * Get a short preview (first verse lines) from content.
 */
export function getPreview(content, maxLines = 2) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l !== '');
  // Skip the number prefix line label if present
  const preview = lines
    .filter(l => !/^\d+\.\s*$/.test(l))
    .slice(0, maxLines)
    .map(l => l.replace(/^\d+\.\s*/, ''))
    .join(' / ');
  return preview;
}

/**
 * Highlight search matches in text, returning HTML string.
 */
export function highlightMatch(text, query) {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 rounded px-0.5">$1</mark>');
}

/**
 * Search songs with ranking: title match > number match > content match.
 * Returns { song, snippet } where snippet is a short content excerpt with the match.
 */
export function searchSongs(songs, query) {
  const q = query.trim().toLowerCase();
  if (!q) return songs.map(song => ({ song, snippet: null }));
  const qNum = q.replace(/[^\d]/g, '');
  const results = [];
  for (const song of songs) {
    const title = song.title.toLowerCase();
    const content = song.content.toLowerCase();
    let score = 0;
    let snippet = null;
    if (title === q) score = 1000;
    else if (title.startsWith(q)) score = 500;
    else if (title.includes(q)) score = 300;
    if (qNum && String(song.number) === qNum) score = Math.max(score, 800);
    else if (qNum && String(song.number).startsWith(qNum)) score = Math.max(score, 150);
    if (score === 0) {
      const idx = content.indexOf(q);
      if (idx >= 0) {
        score = 100 - Math.min(idx / 10, 50);
        const start = Math.max(0, idx - 30);
        const end = Math.min(content.length, idx + q.length + 30);
        snippet = (start > 0 ? '…' : '') + song.content.slice(start, end).replace(/\r?\n/g, ' ') + (end < content.length ? '…' : '');
      }
    }
    if (score > 0) results.push({ song, snippet, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Deterministic hymn-of-the-day based on date + total count */
export function hymnOfTheDay(songs) {
  if (!songs.length) return null;
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return songs[seed % songs.length];
}

/** Encode a list of numbers into a compact URL-safe string. */
export function encodeNumbers(numbers) {
  return btoa(JSON.stringify(numbers)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeNumbers(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const parsed = JSON.parse(atob(padded));
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(n => Number.isInteger(n));
  } catch { return null; }
}

export function encodePlaylist(playlist) {
  const data = { n: playlist.name, s: playlist.numbers };
  return btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePlaylist(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const parsed = JSON.parse(atob(padded));
    if (!parsed || typeof parsed.n !== 'string' || !Array.isArray(parsed.s)) return null;
    return { name: parsed.n, numbers: parsed.s.filter(n => Number.isInteger(n)) };
  } catch { return null; }
}

/** Copy a PNG Blob to the OS clipboard. */
async function copyBlobToClipboard(blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Clipboard não suporta imagens');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

/**
 * Share a canvas as PNG. Tries in order:
 *   1. Web Share API (with File) — if the user cancels, fall through to clipboard.
 *   2. Copy to clipboard.
 *   3. Download as blob URL.
 * Resolves with { method: 'share' | 'clipboard' | 'download' }.
 */
export function shareOrDownloadCanvas(canvas, filename, title) {
  return new Promise((resolve, reject) => {
    if (!canvas?.toBlob) return reject(new Error('Canvas não suportado'));
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('Falha ao gerar PNG'));
      const file = new File([blob], filename, { type: 'image/png' });

      // 1) Web Share
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title });
          return resolve({ method: 'share' });
        } catch (err) {
          if (err?.name !== 'AbortError') {
            // Real error — fall through to clipboard
          }
          // Both cancel and real error fall through
        }
      }

      // 2) Clipboard
      try {
        await copyBlobToClipboard(blob);
        return resolve({ method: 'clipboard' });
      } catch {
        // fall through
      }

      // 3) Download
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve({ method: 'download' });
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}

/** Render a 9:16 "hino do dia" story-format canvas. */
export function dailyHymnImage({ number, title, content }) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background: brand gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1e1b4b');
  grad.addColorStop(0.5, '#3730a3');
  grad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath(); ctx.arc(W - 100, 200, 260, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(150, H - 300, 340, 0, Math.PI * 2); ctx.fill();

  // Label
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HINO DO DIA', W / 2, 240);

  // Big number
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 360px Georgia, serif';
  ctx.fillText(String(number), W / 2, 620);

  // Title
  ctx.fillStyle = '#f9fafb';
  ctx.font = 'bold 72px Georgia, serif';
  wrapCentered(ctx, title, W / 2, 760, W - 160, 84);

  // First lines of content
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .filter(l => !/^(\d+\.|[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{4,}$)/.test(l) || /\d+\./.test(l) === false)
    .slice(0, 4);
  ctx.fillStyle = '#e0e7ff';
  ctx.font = 'italic 44px Georgia, serif';
  ctx.textAlign = 'center';
  let y = 1180;
  for (const line of lines) {
    const rows = wrapCentered(ctx, line.replace(/^\d+\.\s*/, ''), W / 2, y, W - 200, 64);
    y += 64 * rows + 8;
    if (y > H - 260) break;
  }

  // Footer brand
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '36px system-ui, -apple-system, sans-serif';
  ctx.fillText('chicomcastro.github.io/harpa-crista-online', W / 2, H - 120);
  ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('HARPA CRISTÃ', W / 2, H - 70);

  return canvas;
}

function wrapCentered(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const rows = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      rows.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) rows.push(line);
  rows.forEach((r, i) => ctx.fillText(r, cx, y + i * lineHeight));
  return rows.length;
}

export const VERSE_TEMPLATES = [
  { id: 'cream', name: 'Clássico' },
  { id: 'night', name: 'Noturno' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'sunset', name: 'Gradiente' }
];

export const VERSE_FORMATS = [
  { id: 'story', name: 'Story', w: 1080, h: 1920 },
  { id: 'square', name: 'Post', w: 1080, h: 1080 }
];

/** Render a verse to a canvas using the selected template, format and optional font scale. */
export function verseToImage({ title, number, lines }, template = 'cream', format = 'story', scale = 1) {
  const fmt = VERSE_FORMATS.find(f => f.id === format) || VERSE_FORMATS[0];
  const W = fmt.w, H = fmt.h;
  const isSquare = format === 'square';
  const padX = 80;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const pal = getVersePalette(template);
  paintBackground(ctx, W, H, pal);

  // Decorative quote marks (subtle, top-left and bottom-right of the canvas)
  if (pal.showQuote) {
    const qSize = isSquare ? 220 : 300;
    ctx.fillStyle = pal.quote;
    ctx.font = `bold ${qSize}px Georgia, serif`;
    ctx.textBaseline = 'alphabetic';
    // Opening — high up, just below the header
    ctx.textAlign = 'left';
    ctx.fillText('\u201C', 30, isSquare ? 420 : 620);
    // Closing — near the bottom, above the brand footer
    ctx.textAlign = 'right';
    ctx.fillText('\u201D', W - 30, H - (isSquare ? 70 : 100));
  }

  const badgeSize = isSquare ? 24 : 30;
  const titleSize = isSquare ? 42 : 56;
  const badgeY = isSquare ? 90 : 130;
  const titleY = isSquare ? 150 : 210;
  const titleLineH = Math.round(titleSize * 1.15);

  // Top badge
  ctx.fillStyle = pal.accent;
  ctx.font = `600 ${badgeSize}px system-ui, -apple-system, Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`HARPA CRISTÃ  ·  Nº ${number}`, padX, badgeY);

  ctx.fillStyle = pal.ink;
  ctx.font = `700 ${titleSize}px Georgia, serif`;
  const titleRows = wrapTextLeft(ctx, title.toUpperCase(), padX, titleY, W - padX * 2, titleLineH);

  // Accent divider
  const dividerY = titleY + titleRows * titleLineH + (isSquare ? 12 : 20);
  if (pal.showDivider) {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(padX, dividerY, 72, 3);
  }

  // Strip "1. " prefixes
  const cleanLines = lines.map(l => l.replace(/^\s*\d+\.\s*/, '')).filter(Boolean);

  // Reserve fixed zones → predictable layout
  const footerH = isSquare ? 110 : 160;
  const verseTop = dividerY + (isSquare ? 40 : 70);
  const verseBottom = H - footerH;
  const verseAreaH = verseBottom - verseTop;
  const verseAreaW = W - padX * 2;

  // Auto-fit font: pick the largest size (within caps) that fits both width and height
  const maxFont = isSquare ? 64 : 80;
  const minFont = isSquare ? 28 : 34;
  let autoFit = minFont;
  for (let s = maxFont; s >= minFont; s -= 2) {
    ctx.font = `400 ${s}px Georgia, serif`;
    const w = cleanLines.map(l => computeWrap(ctx, l, verseAreaW));
    const lh = Math.round(s * 1.45);
    const rows = w.reduce((acc, r) => acc + r.length, 0);
    const gaps = (cleanLines.length - 1) * (lh * 0.35);
    const h = rows * lh + gaps;
    if (h <= verseAreaH) { autoFit = s; break; }
    autoFit = s; // fallback: smallest if nothing fits
  }

  // Apply user scale, clamp to sensible range
  let fontSize = Math.round(autoFit * (scale || 1));
  fontSize = Math.max(20, Math.min(maxFont + 20, fontSize));
  ctx.font = `400 ${fontSize}px Georgia, serif`;
  const wrapped = cleanLines.map(l => computeWrap(ctx, l, verseAreaW));
  const lineH = Math.round(fontSize * 1.45);
  const rows = wrapped.reduce((acc, r) => acc + r.length, 0);
  const gaps = (cleanLines.length - 1) * (lineH * 0.35);
  const blockH = rows * lineH + gaps;

  // Vertically center in reserved area
  ctx.fillStyle = pal.ink;
  ctx.textAlign = 'center';
  ctx.font = `400 ${fontSize}px Georgia, serif`;
  let y = verseTop + (verseAreaH - blockH) / 2 + fontSize; // fontSize ≈ baseline offset
  for (const rows of wrapped) {
    for (const r of rows) { ctx.fillText(r, W / 2, y); y += lineH; }
    y += lineH * 0.35;
  }

  // Footer
  ctx.textAlign = 'left';
  ctx.fillStyle = pal.dim;
  ctx.font = `500 ${isSquare ? 22 : 28}px system-ui, -apple-system, Inter, sans-serif`;
  ctx.fillText('chicomcastro.github.io/harpa-crista-online', padX, H - (isSquare ? 55 : 80));

  return canvas;
}

function getVersePalette(id) {
  switch (id) {
    case 'night':
      return {
        type: 'linear', bg1: '#0b0b12', bg2: '#1a1423',
        ink: '#f4efe7', dim: '#9b9289', accent: '#e6b872',
        quote: '#e6b87222', showQuote: true, showDivider: true
      };
    case 'minimal':
      return {
        type: 'solid', bg: '#ffffff',
        ink: '#111111', dim: '#888888', accent: '#111111',
        showQuote: false, showDivider: true
      };
    case 'sunset':
      return {
        type: 'diagonal', bg1: '#3b0a4b', bg2: '#b03a6a', bg3: '#ff8a65',
        ink: '#ffffff', dim: 'rgba(255,255,255,0.7)', accent: '#ffe0a3',
        quote: 'rgba(255,255,255,0.12)', showQuote: true, showDivider: true
      };
    case 'cream':
    default:
      return {
        type: 'linear', bg1: '#fbf6ee', bg2: '#f0e4d0',
        ink: '#1a1625', dim: '#6b6257', accent: '#b45309',
        quote: 'rgba(180,83,9,0.13)', showQuote: true, showDivider: true
      };
  }
}

function paintBackground(ctx, W, H, pal) {
  if (pal.type === 'solid') {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (pal.type === 'diagonal') {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, pal.bg1);
    grad.addColorStop(0.5, pal.bg2);
    grad.addColorStop(1, pal.bg3);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, pal.bg1);
  grad.addColorStop(1, pal.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function computeWrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const rows = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxWidth && line) {
      rows.push(line);
      line = w;
    } else line = t;
  }
  if (line) rows.push(line);
  return rows;
}

function wrapTextLeft(ctx, text, x, y, maxWidth, lineHeight) {
  const rows = computeWrap(ctx, text, maxWidth);
  rows.forEach((r, i) => ctx.fillText(r, x, y + i * lineHeight));
  return rows.length;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let rows = 0;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + rows * lineHeight);
      line = word;
      rows++;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, y + rows * lineHeight); rows++; }
  return Math.max(1, rows);
}

/**
 * Share via Web Share API or fallback to clipboard.
 */
export async function shareSong(number, title, baseUrl) {
  const url = `${baseUrl}/song/${number}`;
  const text = `Harpa Cristã #${number} - ${title}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: text, url });
      return true;
    } catch {
      // User cancelled or error
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return true;
  } catch {
    return false;
  }
}
