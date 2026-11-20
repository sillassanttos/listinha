import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { criarItem, marcarPego } from '../lista';
import {
  calcularTotalCarrinho,
  formatarReais,
  lerPreco,
  precoParaCampo,
  situacaoOrcamento,
  totalDoItem,
  ultimoPreco,
  unidadeDoPreco,
} from '../preco';

describe('lerPreco', () => {
  it.each([
    ['18,90', 18.9],
    ['18.90', 18.9],
    ['R$ 18,90', 18.9],
    ['r$7', 7],
    ['1.234,56', 1234.56],
    ['1.234', 1234],
    [' 0,99 ', 0.99],
  ])('"%s" -> %s', (texto, esperado) => {
    expect(lerPreco(texto)).toBe(esperado);
  });

  it.each(['', '   ', 'abc', '0', '0,00', '-5', '1,2,3', '18,999'])('"%s" é inválido', (texto) => {
    expect(lerPreco(texto)).toBeNull();
  });
});

describe('formatação', () => {
  it('formata em reais com vírgula e ponto de milhar', () => {
    expect(formatarReais(18.9)).toBe('R$ 18,90');
    expect(formatarReais(1234.5)).toBe('R$ 1.234,50');
    expect(formatarReais(0)).toBe('R$ 0,00');
    expect(precoParaCampo(7)).toBe('7,00');
    expect(precoParaCampo(undefined)).toBe('');
  });
});

describe('totalDoItem', () => {
  it('preço × quantidade; g e ml usam preço por kg/L', () => {
    expect(totalDoItem({ preco: 18.9, quantidade: 2, unidade: 'pct' })).toBe(37.8);
    expect(totalDoItem({ preco: 7, quantidade: 1.5, unidade: 'kg' })).toBe(10.5);
    expect(totalDoItem({ preco: 50, quantidade: 200, unidade: 'g' })).toBe(10); // R$ 50/kg × 200 g
    expect(totalDoItem({ preco: undefined, quantidade: 2, unidade: 'un' })).toBeUndefined();
    expect(unidadeDoPreco('g')).toBe('kg');
    expect(unidadeDoPreco('ml')).toBe('L');
  });
});

describe('calcularTotalCarrinho', () => {
  it('soma só os pegos com preço e conta os sem preço', () => {
    const itens = ['arroz', 'café', 'banana'].map((n) => criarItem(n, 1));
    let l: Lista = { id: 'l', nome: 'T', criadaEm: 1, itens };
    l = { ...l, itens: [{ ...itens[0], preco: 25 }, { ...itens[1], preco: 18.9, quantidade: 2 }, itens[2]] };
    l = marcarPego(l, itens[0].id, true);
    l = marcarPego(l, itens[2].id, true);
    // café tem preço mas não foi pego: não entra
    expect(calcularTotalCarrinho(l)).toEqual({ total: 25, comPreco: 1, semPreco: 1 });
  });
});

describe('situacaoOrcamento', () => {
  it('sem orçamento não há situação', () => {
    expect(situacaoOrcamento(50, undefined)).toBeNull();
    expect(situacaoOrcamento(50, 0)).toBeNull();
  });

  it('ok abaixo de 90%, perto de 90% a 100%, estourou acima', () => {
    expect(situacaoOrcamento(50, 100)).toEqual({ estado: 'ok', restante: 50, fracao: 0.5 });
    expect(situacaoOrcamento(90, 100)?.estado).toBe('perto');
    expect(situacaoOrcamento(100, 100)?.estado).toBe('perto'); // bater exatamente não é passar
    expect(situacaoOrcamento(112.3, 100)).toMatchObject({ estado: 'estourou', restante: -12.3 });
  });
});

describe('ultimoPreco', () => {
  it('pega o preço mais recente do mesmo item na mesma unidade de preço', () => {
    const compra = (em: number, preco: number, unidade: 'pct' | 'kg' = 'pct'): Lista => ({
      id: `c${em}`,
      nome: 'C',
      criadaEm: em,
      finalizadaEm: em,
      itens: [{ ...criarItem('café', em), unidade, preco, pego: true, pegoEm: em }],
    });
    const historico = [compra(30, 21.5), compra(20, 99, 'kg'), compra(10, 18.9)];
    expect(ultimoPreco(historico, 'Café', 'pct')).toBe(21.5);
    expect(ultimoPreco(historico, 'café', 'kg')).toBe(99);
    expect(ultimoPreco(historico, 'arroz', 'pct')).toBeUndefined();
  });
});
