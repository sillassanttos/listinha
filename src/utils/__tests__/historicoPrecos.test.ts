import { describe, expect, it } from '@jest/globals';

import type { ItemLista, Lista } from '@/types';

import {
  formatarVariacao,
  historicoDePrecos,
  marcasDoEixo,
  pontoMaisProximo,
  posicoesNoTempo,
  resumoPrecos,
} from '../historicoPrecos';
import { criarItem } from '../lista';

function item(nome: string, extra: Partial<ItemLista> = {}): ItemLista {
  return { ...criarItem(nome, 1), pego: true, ...extra };
}

function compra(id: string, em: number, itens: ItemLista[], finalizada = true): Lista {
  return { id, nome: 'Compra', criadaEm: em, finalizadaEm: finalizada ? em : undefined, itens };
}

describe('historicoDePrecos', () => {
  const historico = [
    compra('c3', 300, [item('Café', { preco: 21.9, unidade: 'pct' }), item('Banana', { preco: 6, unidade: 'kg' })]),
    compra('c2', 200, [item('café', { preco: 18.5, unidade: 'pct' }), item('Arroz', { unidade: 'kg' })]),
    compra('c1', 100, [item('Cafe', { preco: 17, unidade: 'pct' }), item('Banana', { preco: 0.8, unidade: 'un' })]),
    compra('ativa', 400, [item('Café', { preco: 99, unidade: 'pct' })], false), // não finalizada: fora
  ];

  it('um produto por nome, pontos em ordem de data, só da mesma unidade de preço', () => {
    const r = historicoDePrecos(historico);
    expect(r.map((p) => p.nome)).toEqual(['Café', 'Banana']); // mais recente primeiro (empate: ordem estável)
    const cafe = r.find((p) => p.nome === 'Café')!;
    expect(cafe.pontos.map((p) => p.preco)).toEqual([17, 18.5, 21.9]);
    expect(cafe.unidadePreco).toBe('pct');
    // Banana: a última compra foi por kg; a de 0,80 a unidade não entra.
    expect(r.find((p) => p.nome === 'Banana')!.pontos.map((p) => p.preco)).toEqual([6]);
  });

  it('g e ml comparam com kg e L; item sem preço não aparece', () => {
    const r = historicoDePrecos([
      compra('b', 200, [item('Queijo', { preco: 60, unidade: 'g', quantidade: 300 })]),
      compra('a', 100, [item('Queijo', { preco: 55, unidade: 'kg' })]),
    ]);
    expect(r[0]).toMatchObject({ unidadePreco: 'kg' });
    expect(r[0].pontos.map((p) => p.preco)).toEqual([55, 60]);
    expect(historicoDePrecos([compra('x', 1, [item('Arroz')])])).toEqual([]);
  });
});

describe('resumo e variação', () => {
  it('último, anterior, variação, mínimo, máximo e média', () => {
    const r = resumoPrecos([
      { em: 1, preco: 10, listaId: 'a' },
      { em: 2, preco: 8, listaId: 'b' },
      { em: 3, preco: 12, listaId: 'c' },
    ])!;
    expect(r).toMatchObject({ ultimo: 12, anterior: 8, minimo: 8, maximo: 12, media: 10 });
    expect(r.variacao).toBeCloseTo(0.5);
    expect(resumoPrecos([{ em: 1, preco: 5, listaId: 'a' }])?.variacao).toBeUndefined();
    expect(resumoPrecos([])).toBeNull();
  });

  it('formata a variação', () => {
    expect(formatarVariacao(0.124)).toBe('+12%');
    expect(formatarVariacao(-0.05)).toBe('−5%');
    expect(formatarVariacao(0.002)).toBe('igual');
  });
});

describe('eixo e toque no gráfico', () => {
  it('marcas redondas cobrindo do mínimo ao máximo', () => {
    expect(marcasDoEixo(17, 21.9)).toEqual({ de: 15, ate: 22.5, marcas: [15, 17.5, 20, 22.5] });
    const unico = marcasDoEixo(6, 6);
    expect(unico.de).toBeLessThan(6);
    expect(unico.ate).toBeGreaterThan(6);
    expect(marcasDoEixo(0.5, 0.9).de).toBeGreaterThanOrEqual(0);
  });

  it('posições proporcionais ao tempo e toque no ponto mais perto', () => {
    const pontos = [0, 10, 40].map((em, i) => ({ em, preco: 1, listaId: String(i) }));
    const xs = posicoesNoTempo(pontos);
    expect(xs).toEqual([0, 0.25, 1]);
    expect(posicoesNoTempo(pontos.slice(0, 1))).toEqual([0.5]);
    expect(pontoMaisProximo(xs, 0.1)).toBe(0);
    expect(pontoMaisProximo(xs, 0.5)).toBe(1);
    expect(pontoMaisProximo(xs, 0.9)).toBe(2);
  });
});
