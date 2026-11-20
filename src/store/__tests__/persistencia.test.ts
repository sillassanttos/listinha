import { describe, expect, it } from '@jest/globals';

import { ORDEM_CATEGORIAS } from '@/data/categorias';
import { criarItem } from '@/utils/lista';

import { sanearDados } from '../persistencia';

describe('sanearDados', () => {
  it('lixo ou vazio vira estado inicial', () => {
    for (const lixo of [null, undefined, 42, 'texto', [], {}]) {
      expect(sanearDados(lixo)).toEqual({ listaAtiva: null, historico: [], imagens: {}, imagensOnline: true, ordemCategorias: ORDEM_CATEGORIAS, categoriasManuais: {} });
    }
  });

  it('cache de imagens: mantém só https e entradas com data; opção desligada é respeitada', () => {
    const r = sanearDados({
      imagens: {
        nescau: { uri: 'https://images.openfoodfacts.org/x.jpg', em: 5 },
        fita: { uri: null, em: 6 },
        ruim: { uri: 'javascript:alert(1)', em: 7 },
        semdata: { uri: 'https://a.jpg' },
      },
      imagensOnline: false,
    });
    expect(r.imagens).toEqual({
      nescau: { uri: 'https://images.openfoodfacts.org/x.jpg', em: 5 },
      fita: { uri: null, em: 6 },
      ruim: { uri: null, em: 7 },
    });
    expect(r.imagensOnline).toBe(false);
  });

  it('mantém dados válidos como estão', () => {
    const item = criarItem('arroz', 5);
    const dados = {
      listaAtiva: { id: 'a', nome: 'Semana', criadaEm: 1, itens: [item] },
      historico: [{ id: 'h', nome: 'Antiga', criadaEm: 0, finalizadaEm: 2, itens: [] }],
    };
    expect(sanearDados(JSON.parse(JSON.stringify(dados)))).toEqual({ ...dados, imagens: {}, imagensOnline: true, ordemCategorias: ORDEM_CATEGORIAS, categoriasManuais: {} });
  });

  it('corrige campos inválidos e descarta itens sem id ou nome', () => {
    const r = sanearDados({
      listaAtiva: {
        id: 'a',
        nome: '',
        itens: [
          { id: '1', nome: 'Coisa', categoria: 'xyz', unidade: 'litros', quantidade: -3, pego: 'sim' },
          { id: '2', nome: '   ' },
          { nome: 'sem id' },
          'lixo',
        ],
      },
      historico: 'nao-e-lista',
    });
    expect(r.historico).toEqual([]);
    expect(r.listaAtiva?.nome).toBe('Compra da semana');
    expect(r.listaAtiva?.itens).toHaveLength(1);
    expect(r.listaAtiva?.itens[0]).toMatchObject({
      categoria: 'outros',
      emoji: '🛒',
      unidade: 'un',
      quantidade: 1,
      pego: false,
    });
  });

  it('orçamento: mantém valor positivo e descarta lixo', () => {
    expect(sanearDados({ listaAtiva: { id: 'a', itens: [], orcamento: 150 } }).listaAtiva?.orcamento).toBe(150);
    expect(sanearDados({ listaAtiva: { id: 'a', itens: [], orcamento: -3 } }).listaAtiva?.orcamento).toBeUndefined();
    expect(sanearDados({ listaAtiva: { id: 'a', itens: [], orcamento: 'muito' } }).listaAtiva?.orcamento).toBeUndefined();
  });

  it('lista ativa já finalizada vai para o histórico', () => {
    const r = sanearDados({ listaAtiva: { id: 'a', nome: 'X', criadaEm: 1, finalizadaEm: 9, itens: [] }, historico: [] });
    expect(r.listaAtiva).toBeNull();
    expect(r.historico.map((l) => l.id)).toEqual(['a']);
  });
});
