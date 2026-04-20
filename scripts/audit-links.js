#!/usr/bin/env node
/**
 * Audit candidate URLs and auto-pick verified ones into data/links.json.
 *
 *   node scripts/audit-links.js [--overwrite]
 *
 * Preserves any existing manually-curated entries unless --overwrite is passed.
 *
 * Heuristics per source:
 *   - cifraclub: valid URL keeps slug after /harpa-crista/; invalid redirects
 *     to the index (/harpa-crista/).
 *   - cifras.com.br: valid final URL contains /cifra/harpa-crista/.
 *   - superpartituras: returns a proper 404 for missing slugs.
 *
 * Runs a small parallel batch with a short delay between requests to be polite.
 */
import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const overwrite = process.argv.includes('--overwrite');

const candidates = JSON.parse(fs.readFileSync('data/candidates.json', 'utf8'));
const existing = JSON.parse(fs.readFileSync('data/links.json', 'utf8'));
const links = { ...existing };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, init = {}) {
  try {
    return await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', ...init });
  } catch { return null; }
}

async function checkCifraClub(url) {
  const res = await fetchSafe(url);
  if (!res || res.status !== 200) return false;
  return /\/harpa-crista\/[^/]+\/?$/.test(res.url);
}

async function checkCifras(url) {
  const res = await fetchSafe(url);
  if (!res || res.status !== 200) return false;
  return res.url.includes('/cifra/harpa-crista/');
}

async function checkSuperPartituras(url) {
  const res = await fetchSafe(url, { method: 'HEAD' });
  return !!res && res.status === 200;
}

function pickCandidate(list, id) { return list.find(c => c.source === id); }

async function auditHymn(number, hymnCandidates) {
  const prev = existing[number] || {};
  const result = { ...prev };
  const log = { number, chord: null, sheet: null, skipped: [] };

  // Chord
  if (!prev.chord || overwrite) {
    const cifraclub = pickCandidate(hymnCandidates.chords, 'cifraclub');
    const cifras = pickCandidate(hymnCandidates.chords, 'cifras');
    if (cifraclub && await checkCifraClub(cifraclub.url)) {
      result.chord = cifraclub.url;
      log.chord = 'cifraclub';
    } else if (cifras && await checkCifras(cifras.url)) {
      result.chord = cifras.url;
      log.chord = 'cifras';
    } else {
      log.chord = 'not-found';
    }
  } else log.skipped.push('chord');

  // Sheet
  if (!prev.sheet || overwrite) {
    const sp = pickCandidate(hymnCandidates.sheets, 'superpartituras');
    if (sp && await checkSuperPartituras(sp.url)) {
      result.sheet = sp.url;
      log.sheet = 'superpartituras';
    } else {
      log.sheet = 'not-found';
    }
  } else log.skipped.push('sheet');

  if (!result.chord && !result.sheet) delete links[number];
  else links[number] = result;
  return log;
}

const numbers = Object.keys(candidates).map(Number).sort((a, b) => a - b);
const stats = { total: numbers.length, chordFound: 0, sheetFound: 0, chordMissing: 0, sheetMissing: 0, skipped: 0 };
const CONCURRENCY = 6;
const DELAY_MS = 150;

async function run() {
  let idx = 0;
  const running = new Set();
  async function worker() {
    while (idx < numbers.length) {
      const n = numbers[idx++];
      const log = await auditHymn(n, candidates[n]);
      if (log.skipped.includes('chord') && log.skipped.includes('sheet')) stats.skipped++;
      if (log.chord === 'not-found') stats.chordMissing++;
      else if (log.chord) stats.chordFound++;
      if (log.sheet === 'not-found') stats.sheetMissing++;
      else if (log.sheet) stats.sheetFound++;
      const pct = (((idx) / numbers.length) * 100).toFixed(1);
      process.stdout.write(`\r[${pct}%] #${String(n).padStart(3, ' ')} chord:${log.chord || '-'} sheet:${log.sheet || '-'}   `);
      // Persist every 20
      if (idx % 20 === 0) fs.writeFileSync('data/links.json', JSON.stringify(links, null, 2));
      await sleep(DELAY_MS);
    }
  }
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  fs.writeFileSync('data/links.json', JSON.stringify(links, null, 2));
  process.stdout.write('\n');
  console.log(`Done. chord: ${stats.chordFound} ok / ${stats.chordMissing} missing, sheet: ${stats.sheetFound} ok / ${stats.sheetMissing} missing, skipped (manual): ${stats.skipped}`);
}

run();
