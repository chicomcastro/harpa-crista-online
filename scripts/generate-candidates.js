#!/usr/bin/env node
/**
 * Generate candidate chord/sheet URLs for each hymn (pattern-based).
 * Does NOT scrape — just builds URLs the user can click through to audit.
 *
 *   node scripts/generate-candidates.js
 *
 * Writes data/candidates.json:
 *   {
 *     "<hymnNumber>": {
 *       "chords":   [{ source, url, note }],
 *       "sheets":   [{ source, url, note }],
 *       "searches": [{ source, url }]       // generic web searches
 *     }
 *   }
 */
import fs from 'node:fs';
import path from 'node:path';

const songs = JSON.parse(fs.readFileSync('src/lib/songs.json', 'utf8'));

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function entry(song) {
  const slug = slugify(song.title);
  const n = song.number;
  const q = encodeURIComponent(`"Harpa Cristã" "${n}" "${song.title}"`);

  const chords = [
    {
      source: 'cifraclub',
      url: `https://www.cifraclub.com.br/harpa-crista/${slug}/`,
      note: 'Pattern por slug — confirme que abre a página certa'
    },
    {
      source: 'cifras',
      url: `https://www.cifras.com.br/cifra/harpa-crista/${slug}`,
      note: 'Pattern por slug'
    },
    {
      source: 'letras',
      url: `https://www.letras.mus.br/harpa-crista/${slug}/`,
      note: 'Tem acordes quando disponíveis'
    }
  ];

  const sheets = [
    {
      source: 'superpartituras',
      url: `https://www.superpartituras.com.br/harpa-crista/${slug}`,
      note: 'Pattern por slug'
    },
    {
      source: 'archive-1941',
      url: `https://archive.org/details/harpa-crista-1941`,
      note: 'Edição 1941 completa — busque pela página'
    }
  ];

  const searches = [
    { source: 'google-cifra',     url: `https://www.google.com/search?q=${q}+cifra` },
    { source: 'google-partitura', url: `https://www.google.com/search?q=${q}+partitura+pdf` },
    { source: 'google-pdf',       url: `https://www.google.com/search?q=${q}+filetype:pdf` },
    { source: 'ddg-cifra',        url: `https://duckduckgo.com/?q=${q}+cifra` }
  ];

  return { chords, sheets, searches };
}

const out = {};
for (const s of songs) out[s.number] = entry(s);

const outPath = path.join('data', 'candidates.json');
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Gerado ${outPath} com ${Object.keys(out).length} hinos`);
