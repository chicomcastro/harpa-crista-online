import { describe, it, expect } from 'vitest';
import { caixaNormal, passoRolagem } from './utils.js';

describe('caixaNormal', () => {
  it('normaliza a linha em caixa alta e mantém a primeira letra maiúscula', () => {
    expect(caixaNormal('MANDA-NOS CHUVAS CONSTANTES')).toBe('Manda-nos chuvas constantes');
  });

  it('preserva os nomes próprios do acervo', () => {
    expect(caixaNormal('CHUVAS PEDIMOS SENHOR')).toBe('Chuvas pedimos Senhor');
    expect(caixaNormal('CHUVAS DO CONSOLADOR')).toBe('Chuvas do Consolador');
    expect(caixaNormal('TENHO DE TI, Ó SIÃO')).toBe('Tenho de ti, ó Sião');
  });

  it('não mexe em linha que já está em caixa normal', () => {
    const linha = 'Deus prometeu com certeza';
    expect(caixaNormal(linha)).toBe(linha);
  });

  // Hino 2: o refrão vem em caixa normal no .txt, e tem que continuar assim.
  it('não mexe em linha com poucas maiúsculas', () => {
    expect(caixaNormal('Sim, eu porfiarei')).toBe('Sim, eu porfiarei');
  });

  it('aguenta linha sem letra', () => {
    expect(caixaNormal('—')).toBe('—');
    expect(caixaNormal('')).toBe('');
  });
});

describe('passoRolagem', () => {
  const rodar = (velocidade, dt, frames) => {
    let sobra = 0, total = 0;
    for (let i = 0; i < frames; i++) {
      const r = passoRolagem(velocidade, dt, sobra);
      sobra = r.sobra;
      total += r.px;
    }
    return total;
  };

  it('anda a mesma distância em 60Hz e em 120Hz', () => {
    const a60 = rodar(2, 1 / 60, 60);   // 1 segundo
    const a120 = rodar(2, 1 / 120, 120); // 1 segundo
    // 1px de folga: somar 60 vezes 32/60 em float fecha em 31,9999…
    expect(a60).toBeGreaterThanOrEqual(31);
    expect(a60).toBeLessThanOrEqual(32);
    expect(Math.abs(a60 - a120)).toBeLessThanOrEqual(1);
  });

  it('acumula a fração em vez de perdê-la', () => {
    // 18px/s a 60fps é 0,3px por frame: sem acumular, não sairia do lugar.
    expect(rodar(1, 1 / 60, 60)).toBeGreaterThanOrEqual(17);
  });

  it('limita o salto quando a aba volta do segundo plano', () => {
    expect(passoRolagem(5, 10, 0).px).toBe(Math.floor(110 * 0.25));
  });

  it('cai no nível 2 se a velocidade for inválida', () => {
    expect(passoRolagem(99, 1, 0).px).toBe(passoRolagem(2, 1, 0).px);
  });
});
