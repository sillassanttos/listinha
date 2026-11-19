import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { secoesMercado } from '../agrupar';
import { calcularProgresso, criarItem, marcarPego } from '../lista';

function lista(): Lista {
  return {
    id: 'l',
    nome: 'T',
    criadaEm: 1,
    itens: ['arroz', 'banana', 'detergente', 'café'].map((n, i) => criarItem(n, i + 1)),
  };
}

describe('marcarPego', () => {
  it('marca com a hora e desmarca limpando a hora', () => {
    const l = lista();
    const marcada = marcarPego(l, l.itens[0].id, true, 500);
    expect(marcada.itens[0]).toMatchObject({ pego: true, pegoEm: 500 });
    expect(calcularProgresso(marcada).faltam).toBe(3);
    const desmarcada = marcarPego(marcada, l.itens[0].id, false);
    expect(desmarcada.itens[0].pego).toBe(false);
    expect(desmarcada.itens[0].pegoEm).toBeUndefined();
  });
});

describe('secoesMercado', () => {
  it('sem nada pego, só os corredores', () => {
    const s = secoesMercado(lista().itens);
    expect(s.map((x) => (x.tipo === 'categoria' ? x.categoria : 'carrinho'))).toEqual(['hortifruti', 'mercearia', 'limpeza']);
  });

  it('pegos vão para "No carrinho" no fim, o último pego primeiro', () => {
    let l = lista();
    l = marcarPego(l, l.itens[0].id, true, 10); // arroz
    l = marcarPego(l, l.itens[2].id, true, 20); // detergente
    const s = secoesMercado(l.itens);
    expect(s.map((x) => (x.tipo === 'categoria' ? x.categoria : 'carrinho'))).toEqual(['hortifruti', 'mercearia', 'carrinho']);
    const carrinho = s[s.length - 1];
    expect(carrinho.data.map((i) => i.nome)).toEqual(['Detergente', 'Arroz']);
    expect(s[1].data.map((i) => i.nome)).toEqual(['Café']);
  });

  it('tudo pego: só o carrinho', () => {
    let l = lista();
    for (const item of l.itens) l = marcarPego(l, item.id, true);
    const s = secoesMercado(l.itens);
    expect(s).toHaveLength(1);
    expect(s[0].tipo).toBe('carrinho');
  });
});
