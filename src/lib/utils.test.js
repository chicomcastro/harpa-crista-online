import { describe, it, expect } from 'vitest';
import { caixaNormal } from './utils.js';

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
