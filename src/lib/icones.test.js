import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/*
 * O service worker guarda uma cópia literal da URL da fonte de ícones do app.html, para conseguir
 * pré-cachear a fonte. Se as duas divergirem, o cache não casa e os ícones somem offline — foi o
 * que aconteceu ao adicionar `campaign` em #10, que entrou só no app.html.
 */
const url = (arquivo) => readFileSync(arquivo, 'utf8').match(/icon_names=[^'"]+/)?.[0];

describe('fonte de ícones', () => {
  it('app.html e service-worker.js pedem exatamente os mesmos ícones', () => {
    const noHtml = url('src/app.html');
    const noSw = url('src/service-worker.js');
    expect(noHtml).toBeTruthy();
    expect(noSw).toBe(noHtml);
  });

  // Pega só os nomes escritos literalmente no markup. Ícone escolhido por expressão
  // ({rolando ? 'pause' : 'arrow_downward'}) escapa — para esses, a rede de segurança é a primeira
  // asserção mais o olho na tela, porque o que falta aparece como a palavra em caixa alta.
  it('inclui todo ícone literal usado nos componentes', () => {
    const lista = new Set(url('src/app.html').replace('icon_names=', '').split(','));
    const fontes = ['src/routes', 'src/lib'];
    const usados = new Set();
    const { execSync } = require('node:child_process');
    const saida = execSync(`grep -rhoE 'class="mi[^"]*">[a-z_]+' ${fontes.join(' ')} || true`).toString();
    for (const m of saida.split('\n')) {
      const nome = m.split('>').pop();
      if (nome) usados.add(nome);
    }
    const faltando = [...usados].filter(i => !lista.has(i));
    expect(faltando).toEqual([]);
  });
});
