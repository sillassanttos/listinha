import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { adicionarNaLista, criarItem, mudarQuantidade, mudarUnidade } from '../lista';
import {
  ajustarQuantidade,
  formatarQuantidade,
  formatarQuantidadeUnidade,
  podeDiminuir,
  quantidadeAoTrocarUnidade,
} from '../quantidade';

describe('ajustarQuantidade', () => {
  it('usa o passo da unidade', () => {
    expect(ajustarQuantidade(1, 'un', 1)).toBe(2);
    expect(ajustarQuantidade(1, 'kg', 1)).toBe(1.5);
    expect(ajustarQuantidade(100, 'g', 1)).toBe(200);
    expect(ajustarQuantidade(0.5, 'L', 1)).toBe(1);
  });

  it('não desce do mínimo', () => {
    expect(ajustarQuantidade(1, 'un', -1)).toBe(1);
    expect(ajustarQuantidade(0.5, 'kg', -1)).toBe(0.5);
    expect(ajustarQuantidade(100, 'g', -1)).toBe(100);
    expect(ajustarQuantidade(3, 'un', -1)).toBe(2);
  });

  it('não acumula erro de ponto flutuante', () => {
    let q = 0.5;
    for (let i = 0; i < 5; i++) q = ajustarQuantidade(q, 'kg', 1);
    expect(q).toBe(3);
  });
});

describe('podeDiminuir', () => {
  it('só quando está acima do mínimo', () => {
    expect(podeDiminuir(1, 'un')).toBe(false);
    expect(podeDiminuir(2, 'un')).toBe(true);
    expect(podeDiminuir(0.5, 'kg')).toBe(false);
    expect(podeDiminuir(1, 'kg')).toBe(true);
  });
});

describe('quantidadeAoTrocarUnidade', () => {
  it.each([
    [2, 'g', 100],
    [1, 'kg', 1],
    [3, 'pct', 3],
    [500, 'kg', 0.5],
    [500, 'un', 1],
    [1.5, 'un', 2],
    [0.5, 'dz', 0.5],
  ] as const)('%s -> %s = %s', (q, unidade, esperado) => {
    expect(quantidadeAoTrocarUnidade(q, unidade)).toBe(esperado);
  });
});

describe('itens da lista', () => {
  const base = (): Lista => ({ id: 'l', nome: 'T', criadaEm: 1, itens: [criarItem('banana', 1), criarItem('queijo', 2)] });

  it('item em gramas começa com 100 g', () => {
    expect(base().itens[1]).toMatchObject({ unidade: 'g', quantidade: 100 });
  });

  it('+/− muda só o item escolhido', () => {
    const l = base();
    const depois = mudarQuantidade(l, l.itens[1].id, 1);
    expect(depois.itens[1].quantidade).toBe(200);
    expect(depois.itens[0]).toBe(l.itens[0]);
  });

  it('trocar unidade ajusta a quantidade', () => {
    const l = base();
    expect(mudarUnidade(l, l.itens[1].id, 'kg').itens[1]).toMatchObject({ unidade: 'kg', quantidade: 0.5 });
  });

  it('item repetido soma um passo da unidade', () => {
    const l = base();
    expect(adicionarNaLista(l, 'queijo')?.item.quantidade).toBe(200);
    expect(adicionarNaLista(l, 'banana')?.item.quantidade).toBe(1.5);
  });
});

describe('formatação', () => {
  it('usa vírgula e tira zeros', () => {
    expect(formatarQuantidade(1)).toBe('1');
    expect(formatarQuantidade(1.5)).toBe('1,5');
    expect(formatarQuantidadeUnidade(0.5, 'kg')).toBe('0,5 kg');
  });
});
