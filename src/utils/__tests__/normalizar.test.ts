import { describe, expect, it } from '@jest/globals';

import { chaveBusca, normalizar, singularizar } from '../normalizar';

describe('normalizar', () => {
  it('remove acentos, maiúsculas e pontuação', () => {
    expect(normalizar('  Pão-de-Açúcar!! ')).toBe('pao de acucar');
    expect(normalizar('LIMÃO')).toBe('limao');
    expect(normalizar('Água   com   gás')).toBe('agua com gas');
  });
});

describe('singularizar', () => {
  it.each([
    ['ovos', 'ovo'],
    ['bananas', 'banana'],
    ['limoes', 'limao'],
    ['paes', 'pao'],
    ['tomates', 'tomate'],
    ['colheres', 'colher'],
    ['pudins', 'pudim'],
  ])('%s -> %s', (plural, singular) => {
    expect(singularizar(plural)).toBe(singular);
  });

  it('não mexe em palavras curtas ou que terminam em -is/-us/-ss', () => {
    expect(singularizar('sal')).toBe('sal');
    expect(singularizar('gas')).toBe('gas');
    expect(singularizar('brocolis')).toBe('brocolis');
    expect(singularizar('arroz')).toBe('arroz');
  });
});

describe('chaveBusca', () => {
  it('normaliza, singulariza e ignora palavras com números', () => {
    expect(chaveBusca('Limões')).toBe('limao');
    expect(chaveBusca('Arroz 5kg')).toBe('arroz');
    expect(chaveBusca('2 Ovos Caipiras')).toBe('ovo caipira');
  });
});
