import { describe, expect, it } from '@jest/globals';

import { ORDEM_CATEGORIAS } from '@/data/categorias';
import { criarItem } from '@/utils/lista';

import { migrarDados, sanearDados, VERSAO_DADOS } from '../persistencia';

const VAZIO = {
  listas: [],
  listaAtualId: null,
  historico: [],
  imagens: {},
  imagensOnline: true,
  ordemCategorias: ORDEM_CATEGORIAS,
  categoriasManuais: {},
  produtosPorCodigo: {},
};

describe('sanearDados', () => {
  it('lixo ou vazio vira estado inicial', () => {
    for (const lixo of [null, undefined, 42, 'texto', [], {}]) {
      expect(sanearDados(lixo)).toEqual(VAZIO);
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

  it('mantém dados válidos como estão (várias listas e a atual)', () => {
    const item = criarItem('arroz', 5);
    const dados = {
      listas: [
        { id: 'a', nome: 'Mercado', criadaEm: 1, itens: [item] },
        { id: 'b', nome: 'Farmácia', criadaEm: 2, itens: [] },
      ],
      listaAtualId: 'b',
      historico: [{ id: 'h', nome: 'Antiga', criadaEm: 0, finalizadaEm: 2, itens: [] }],
    };
    expect(sanearDados(JSON.parse(JSON.stringify(dados)))).toEqual({ ...VAZIO, ...dados });
  });

  it('lista atual que não existe vira a primeira; ids repetidos e lixo saem', () => {
    const r = sanearDados({
      listas: [{ id: 'a', itens: [] }, { id: 'a', itens: [] }, 'lixo', { id: 'b', itens: [] }],
      listaAtualId: 'sumiu',
    });
    expect(r.listas.map((l) => l.id)).toEqual(['a', 'b']);
    expect(r.listaAtualId).toBe('a');
    expect(sanearDados({ listas: [] }).listaAtualId).toBeNull();
  });

  it('corrige campos inválidos e descarta itens sem id ou nome', () => {
    const r = sanearDados({
      listas: [
        {
          id: 'a',
          nome: '',
          itens: [
            { id: '1', nome: 'Coisa', categoria: 'xyz', unidade: 'litros', quantidade: -3, pego: 'sim' },
            { id: '2', nome: '   ' },
            { nome: 'sem id' },
            'lixo',
          ],
        },
      ],
      historico: 'nao-e-lista',
    });
    expect(r.historico).toEqual([]);
    expect(r.listas[0].nome).toBe('Compra da semana');
    expect(r.listas[0].itens).toHaveLength(1);
    expect(r.listas[0].itens[0]).toMatchObject({ categoria: 'outros', emoji: '🛒', unidade: 'un', quantidade: 1, pego: false });
  });

  it('orçamento: mantém valor positivo e descarta lixo', () => {
    const orcamento = (v: unknown) => sanearDados({ listas: [{ id: 'a', itens: [], orcamento: v }] }).listas[0].orcamento;
    expect(orcamento(150)).toBe(150);
    expect(orcamento(-3)).toBeUndefined();
    expect(orcamento('muito')).toBeUndefined();
  });

  it('lista compartilhada: precisa de id e código; lixo some', () => {
    const compartilhada = (v: unknown) => sanearDados({ listas: [{ id: 'a', itens: [], compartilhada: v }] }).listas[0].compartilhada;
    expect(compartilhada({ id: 'r1', codigo: 'AB3K7Q' })).toEqual({ id: 'r1', codigo: 'AB3K7Q' });
    expect(compartilhada({ id: 'r1' })).toBeUndefined();
    expect(compartilhada('sim')).toBeUndefined();
  });

  it('lista aberta já finalizada vai para o histórico', () => {
    const r = sanearDados({ listas: [{ id: 'a', nome: 'X', criadaEm: 1, finalizadaEm: 9, itens: [] }], historico: [] });
    expect(r.listas).toEqual([]);
    expect(r.historico.map((l) => l.id)).toEqual(['a']);
  });

  it('formato antigo (uma listaAtiva) ainda é aceito', () => {
    const r = sanearDados({ listaAtiva: { id: 'a', nome: 'Semana', criadaEm: 1, itens: [] } });
    expect(r.listas.map((l) => l.id)).toEqual(['a']);
    expect(r.listaAtualId).toBe('a');
  });
});

describe('migrarDados', () => {
  it('versão atual é a 2', () => {
    expect(VERSAO_DADOS).toBe(2);
  });

  it('1 -> 2: a lista ativa vira a primeira e atual das listas, sem perder nada', () => {
    const item = criarItem('café', 3);
    const v1 = {
      listaAtiva: { id: 'a', nome: 'Semana', criadaEm: 1, itens: [item], compartilhada: { id: 'r1', codigo: 'AB3K7Q' } },
      historico: [{ id: 'h', nome: 'Antiga', criadaEm: 0, finalizadaEm: 2, itens: [] }],
      ordemCategorias: ORDEM_CATEGORIAS,
    };
    const r = migrarDados(JSON.parse(JSON.stringify(v1)), 1);
    expect(r.listas).toEqual([v1.listaAtiva]);
    expect(r.listaAtualId).toBe('a');
    expect(r.historico).toEqual(v1.historico);
    expect('listaAtiva' in r).toBe(false);
  });

  it('1 -> 2 sem lista ativa', () => {
    expect(migrarDados({ listaAtiva: null, historico: [] }, 1)).toMatchObject({ listas: [], listaAtualId: null });
  });
});
