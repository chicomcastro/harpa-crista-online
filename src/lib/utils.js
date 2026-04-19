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
  ctx.fillText('harpacrista.online', W / 2, H - 120);
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

/** Render a verse to a 1:1 canvas for sharing. */
export function verseToImage({ title, number, lines, darkMode = false }) {
  const width = 1080;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const bg = darkMode ? '#111827' : '#fffbeb';
  const fg = darkMode ? '#f9fafb' : '#1f2937';
  const accent = darkMode ? '#fbbf24' : '#b45309';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Harpa Cristã #${number}`, 80, 120);
  ctx.fillStyle = fg;
  ctx.font = 'bold 44px Georgia, serif';
  wrapText(ctx, title, 80, 200, width - 160, 56);
  ctx.font = '40px Georgia, serif';
  let y = 360;
  for (const line of lines) {
    const rows = wrapText(ctx, line, 80, y, width - 160, 56);
    y += 56 * rows;
  }
  ctx.fillStyle = accent;
  ctx.font = '24px system-ui, -apple-system, sans-serif';
  ctx.fillText('harpacrista.online', 80, height - 60);
  return canvas;
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
