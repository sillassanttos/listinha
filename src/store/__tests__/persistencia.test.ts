import { describe, expect, it } from '@jest/globals';

import { criarItem } from '@/utils/lista';

import { sanearDados } from '../persistencia';

describe('sanearDados', () => {
  it('lixo ou vazio vira estado inicial', () => {
    for (const lixo of [null, undefined, 42, 'texto', [], {}]) {
      expect(sanearDados(lixo)).toEqual({ listaAtiva: null, historico: [] });
    }
  });

  it('mantém dados válidos como estão', () => {
    const item = criarItem('arroz', 5);
    const dados = {
      listaAtiva: { id: 'a', nome: 'Semana', criadaEm: 1, itens: [item] },
      historico: [{ id: 'h', nome: 'Antiga', criadaEm: 0, finalizadaEm: 2, itens: [] }],
    };
    expect(sanearDados(JSON.parse(JSON.stringify(dados)))).toEqual(dados);
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

  it('lista ativa já finalizada vai para o histórico', () => {
    const r = sanearDados({ listaAtiva: { id: 'a', nome: 'X', criadaEm: 1, finalizadaEm: 9, itens: [] }, historico: [] });
    expect(r.listaAtiva).toBeNull();
    expect(r.historico.map((l) => l.id)).toEqual(['a']);
  });
});
