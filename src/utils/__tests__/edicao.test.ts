import { describe, expect, it } from '@jest/globals';

import { aplicarEdicao, criarItem } from '../lista';
import { lerQuantidade } from '../quantidade';

describe('lerQuantidade', () => {
  it.each([
    ['1', 1],
    ['1,5', 1.5],
    [' 0.5 ', 0.5],
    ['200', 200],
  ])('"%s" -> %s', (texto, esperado) => {
    expect(lerQuantidade(texto)).toBe(esperado);
  });

  it.each(['', 'abc', '0', '-1', '1,2,3', '1.'])('"%s" é inválido', (texto) => {
    expect(lerQuantidade(texto)).toBeNull();
  });
});

describe('aplicarEdicao', () => {
  const item = criarItem('arroz', 1);

  it('aplica nome, quantidade, unidade, categoria e observação', () => {
    const editado = aplicarEdicao(item, {
      nome: '  Arroz   integral ',
      quantidade: 2,
      unidade: 'pct',
      categoria: 'outros',
      emoji: '🛒',
      observacao: ' marca X ',
    });
    expect(editado).toMatchObject({
      id: item.id,
      nome: 'Arroz integral',
      quantidade: 2,
      unidade: 'pct',
      categoria: 'outros',
      emoji: '🛒',
      observacao: 'marca X',
      criadoEm: item.criadoEm,
    });
  });

  it('não aceita nome vazio nem quantidade inválida', () => {
    const editado = aplicarEdicao(item, { ...item, nome: '   ', quantidade: 0 });
    expect(editado.nome).toBe('Arroz');
    expect(editado.quantidade).toBe(item.quantidade);
  });

  it('observação vazia some', () => {
    const comObs = { ...item, observacao: 'integral' };
    expect(aplicarEdicao(comObs, { ...comObs, observacao: '  ' }).observacao).toBeUndefined();
  });
});
