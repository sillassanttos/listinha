import { describe, expect, it } from '@jest/globals';

import { obterCategoria } from '@/data/categorias';
import type { Lista } from '@/types';

import {
  aplicarCategoriaManual,
  categoriaSugerida,
  lembrarCategoria,
  sanearCategoriasManuais,
} from '../categoriasManuais';
import { adicionarImportados, adicionarNaLista, criarItem, repetirCompra } from '../lista';

const vazia = (): Lista => ({ id: 'l', nome: 'Compra', criadaEm: 1, itens: [] });

describe('lembrarCategoria', () => {
  it('guarda pela chave de busca e esquece ao voltar para a automática', () => {
    let m = lembrarCategoria({}, 'Vela de aniversário', 'padaria'); // automática: Limpeza (contém "vela")
    expect(m).toEqual({ 'vela de aniversario': 'padaria' });
    expect(lembrarCategoria(m, 'velas de aniversário', 'padaria')).toBe(m); // nada mudou
    m = lembrarCategoria(m, 'Vela de aniversário', 'limpeza');
    expect(m).toEqual({});
  });

  it('não guarda nada quando a escolha é a automática', () => {
    const m = {};
    expect(lembrarCategoria(m, 'Arroz', 'mercearia')).toBe(m);
    expect(lembrarCategoria(m, '   ', 'limpeza')).toBe(m);
  });

  it('troca a categoria lembrada', () => {
    const m = lembrarCategoria(lembrarCategoria({}, 'Carvão', 'limpeza'), 'carvao', 'carnes');
    expect(m).toEqual({ carvao: 'carnes' });
    expect(lembrarCategoria(m, 'Carvão', 'outros')).toEqual({}); // fora do catálogo: automática é Outros
  });
});

describe('categoriaSugerida e aplicarCategoriaManual', () => {
  const m = { carvao: 'carnes' as const, leite: 'bebidas' as const };

  it('item livre usa o emoji da categoria escolhida; produto do catálogo mantém o dele', () => {
    expect(categoriaSugerida('Carvão', m)).toEqual({ categoria: 'carnes', emoji: obterCategoria('carnes').emoji, lembrada: true });
    expect(categoriaSugerida('Carvão', {})).toMatchObject({ categoria: 'outros', lembrada: false });
    const leite = categoriaSugerida('Leite', m);
    expect(leite.categoria).toBe('bebidas');
    expect(leite.emoji).toBe(criarItem('Leite').emoji);
  });

  it('sem nada lembrado, devolve a automática e o mesmo item', () => {
    expect(categoriaSugerida('Arroz', m)).toMatchObject({ categoria: 'mercearia', lembrada: false });
    const arroz = criarItem('arroz');
    expect(aplicarCategoriaManual(arroz, m)).toBe(arroz);
  });
});

describe('itens entram na categoria lembrada', () => {
  const m = { 'vela de aniversario': 'padaria' as const };

  it('ao digitar', () => {
    const r = adicionarNaLista(vazia(), 'vela de aniversário', 1, m);
    expect(r?.item.categoria).toBe('padaria');
    expect(adicionarNaLista(vazia(), 'vela de aniversário', 1)?.item.categoria).toBe('limpeza');
  });

  it('ao importar do WhatsApp', () => {
    const r = adicionarImportados(vazia(), [{ nome: 'Velas de aniversário', quantidade: 2 }], 1, m);
    expect(r.lista.itens[0]).toMatchObject({ categoria: 'padaria', quantidade: 2 });
  });

  it('ao repetir uma compra antiga, feita antes da escolha', () => {
    const antiga: Lista = { ...vazia(), id: 'a', itens: [criarItem('vela de aniversário')], finalizadaEm: 1 };
    expect(repetirCompra(null, antiga, 2, m).lista.itens[0].categoria).toBe('padaria');
  });
});

describe('sanearCategoriasManuais', () => {
  it('descarta categoria inválida, chave vazia e lixo', () => {
    expect(sanearCategoriasManuais({ vela: 'padaria', x: 'naoexiste', '': 'limpeza', y: 3 })).toEqual({ vela: 'padaria' });
    expect(sanearCategoriasManuais(null)).toEqual({});
    expect(sanearCategoriasManuais(['padaria'])).toEqual({});
  });
});
