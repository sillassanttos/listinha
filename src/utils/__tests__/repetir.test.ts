import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { criarItem, marcarPego, repetirCompra } from '../lista';

function anterior(): Lista {
  const itens = ['arroz', 'café', 'banana'].map((n) => criarItem(n, 1));
  itens[0] = { ...itens[0], quantidade: 5, unidade: 'kg', observacao: 'tipo 1', preco: 25 };
  let l: Lista = { id: 'ant', nome: 'Compra de quarta', criadaEm: 1, finalizadaEm: 2, itens };
  l = marcarPego(l, itens[0].id, true, 3);
  return l;
}

describe('repetirCompra', () => {
  it('sem lista ativa, cria uma com o nome e os itens da anterior, desmarcados', () => {
    const r = repetirCompra(null, anterior(), 100);
    expect(r.adicionados).toBe(3);
    expect(r.jaEstavam).toBe(0);
    expect(r.lista.nome).toBe('Compra de quarta');
    expect(r.lista.finalizadaEm).toBeUndefined();
    expect(r.lista.itens.map((i) => i.nome)).toEqual(['Arroz', 'Café', 'Banana']);
    expect(r.lista.itens.every((i) => !i.pego && i.pegoEm === undefined)).toBe(true);
  });

  it('mantém quantidade, unidade e observação, mas não o preço nem o id', () => {
    const ant = anterior();
    const arroz = repetirCompra(null, ant, 100).lista.itens[0];
    expect(arroz).toMatchObject({ quantidade: 5, unidade: 'kg', observacao: 'tipo 1' });
    expect(arroz.preco).toBeUndefined();
    expect(arroz.id).not.toBe(ant.itens[0].id);
  });

  it('com lista ativa, só acrescenta o que ainda não está nela', () => {
    const atual: Lista = { id: 'at', nome: 'Feira', criadaEm: 50, itens: [{ ...criarItem('café', 50), quantidade: 3 }] };
    const r = repetirCompra(atual, anterior(), 100);
    expect(r.adicionados).toBe(2);
    expect(r.jaEstavam).toBe(1);
    expect(r.lista.id).toBe('at');
    expect(r.lista.nome).toBe('Feira');
    expect(r.lista.itens.map((i) => i.nome)).toEqual(['Café', 'Arroz', 'Banana']);
    expect(r.lista.itens[0].quantidade).toBe(3); // o café que já estava fica como estava
  });

  it('repetir duas vezes não duplica', () => {
    const primeira = repetirCompra(null, anterior(), 100).lista;
    const r = repetirCompra(primeira, anterior(), 200);
    expect(r.adicionados).toBe(0);
    expect(r.jaEstavam).toBe(3);
    expect(r.lista.itens).toHaveLength(3);
  });
});
