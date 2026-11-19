import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { criarItem, finalizarLista, marcarPego } from '../lista';

function lista(pegos: number): Lista {
  let l: Lista = {
    id: 'l1',
    nome: 'Compra da semana',
    criadaEm: 1,
    itens: ['arroz', 'feijão', 'café', 'leite'].map((n) => criarItem(n, 1)),
  };
  for (const item of l.itens.slice(0, pegos)) l = marcarPego(l, item.id, true, 5);
  return l;
}

describe('finalizarLista', () => {
  it('manda a lista inteira para o histórico com a data', () => {
    const r = finalizarLista(lista(4), true, 100);
    expect(r.finalizada).toMatchObject({ id: 'l1', finalizadaEm: 100 });
    expect(r.finalizada.itens).toHaveLength(4);
    expect(r.proxima).toBeNull(); // nada pendente
  });

  it('leva os pendentes para a próxima lista, desmarcados', () => {
    const r = finalizarLista(lista(1), true, 100);
    expect(r.proxima?.itens.map((i) => i.nome)).toEqual(['Feijão', 'Café', 'Leite']);
    expect(r.proxima?.itens.every((i) => !i.pego)).toBe(true);
    expect(r.proxima?.id).not.toBe('l1');
    expect(r.proxima?.nome).toBe('Compra da semana');
    expect(r.finalizada.itens.filter((i) => i.pego)).toHaveLength(1);
  });

  it('sem levar pendentes, não há próxima lista', () => {
    expect(finalizarLista(lista(1), false).proxima).toBeNull();
  });
});
