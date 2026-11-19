import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { criarItem, removerDaLista, restaurarNaLista } from '../lista';

function lista(): Lista {
  return { id: 'l1', nome: 'T', criadaEm: 1, itens: ['arroz', 'feijão', 'café'].map((n) => criarItem(n, 1)) };
}

describe('removerDaLista e restaurarNaLista', () => {
  it('remove o item e guarda a posição', () => {
    const l = lista();
    const r = removerDaLista(l, l.itens[1].id);
    expect(r?.lista.itens.map((i) => i.nome)).toEqual(['Arroz', 'Café']);
    expect(r?.removido).toMatchObject({ indice: 1, listaId: 'l1', item: { nome: 'Feijão' } });
  });

  it('desfazer devolve o item na mesma posição', () => {
    const l = lista();
    const r = removerDaLista(l, l.itens[1].id)!;
    expect(restaurarNaLista(r.lista, r.removido).itens.map((i) => i.nome)).toEqual(['Arroz', 'Feijão', 'Café']);
  });

  it('se a lista encolheu, devolve no fim', () => {
    const l = lista();
    const r = removerDaLista(l, l.itens[2].id)!;
    const menor = removerDaLista(r.lista, r.lista.itens[0].id)!.lista;
    expect(restaurarNaLista(menor, r.removido).itens.map((i) => i.nome)).toEqual(['Feijão', 'Café']);
  });

  it('não restaura em outra lista nem duplica', () => {
    const l = lista();
    const r = removerDaLista(l, l.itens[0].id)!;
    expect(restaurarNaLista({ ...r.lista, id: 'outra' }, r.removido).itens).toHaveLength(2);
    const restaurada = restaurarNaLista(r.lista, r.removido);
    expect(restaurarNaLista(restaurada, r.removido).itens).toHaveLength(3);
  });

  it('item inexistente não remove nada', () => {
    expect(removerDaLista(lista(), 'nao-existe')).toBeNull();
  });
});
