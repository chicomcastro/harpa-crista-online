/*
 * Gera src/lib/nomes-proprios.json a partir do próprio acervo.
 *
 * Usado por `caixaNormal()` (src/lib/utils.js) para normalizar refrões em CAIXA ALTA sem
 * minusculizar "Senhor", "Consolador", "Sião". A lista não é escrita à mão: sai das estrofes que
 * já estão em caixa normal, onde a capitalização no meio da linha é informação real.
 *
 * Critério: a palavra aparece capitalizada no meio da linha em ≥80% das suas ocorrências e ao
 * menos 5 vezes. O início da linha é sempre maiúsculo, então não conta.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const PALAVRA = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]*/g;

const ehCaixaAlta = (linha) => {
  const letras = linha.match(/[A-Za-zÀ-ÿ]/g);
  if (!letras) return false;
  return letras.filter((c) => c === c.toUpperCase()).length / letras.length > 0.9;
};

const cap = new Map(), low = new Map(), grafia = new Map();
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

for (const arquivo of readdirSync(join(raiz, 'data')).filter((f) => f.endsWith('.txt'))) {
  const texto = readFileSync(join(raiz, 'data', arquivo), 'utf8');
  for (const linha of texto.split('\n')) {
    for (const p of linha.match(PALAVRA) || []) {
      if (p[0] === p[0].toUpperCase() && p !== p.toUpperCase()) bump(grafia, p);
    }
    if (!linha.trim() || ehCaixaAlta(linha)) continue;
    const palavras = linha.match(PALAVRA) || [];
    palavras.slice(1).forEach((p) => bump(p[0] === p[0].toUpperCase() ? cap : low, p.toLowerCase()));
  }
}

const eleitas = new Set(
  [...cap].filter(([p, n]) => p.length >= 3 && n >= 5 && n / (n + (low.get(p) || 0)) >= 0.8).map(([p]) => p)
);

// Para cada eleita, a grafia acentuada mais comum no acervo.
const saida = {};
for (const [p, n] of [...grafia].sort((a, b) => b[1] - a[1])) {
  const k = p.toLowerCase();
  if (eleitas.has(k) && !saida[k]) saida[k] = p;
}

const ordenado = Object.fromEntries(Object.keys(saida).sort().map((k) => [k, saida[k]]));
writeFileSync(join(raiz, 'src/lib/nomes-proprios.json'), JSON.stringify(ordenado, null, 1) + '\n');
console.log(`${Object.keys(ordenado).length} nomes próprios → src/lib/nomes-proprios.json`);
