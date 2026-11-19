import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { adicionarNaLista, criarItem } from '../lista';
import { buscarSugestoes, chipsSugestao, itensProprios } from '../sugestoes';

function lista(nomes: string[] = [], id = 'l'): Lista {
  return { id, nome: 'Teste', criadaEm: 1, itens: nomes.map((n) => criarItem(n, 1)) };
}

describe('adicionarNaLista', () => {
  it('adiciona item novo no fim', () => {
    const r = adicionarNaLista(lista(['arroz']), 'café');
    expect(r?.tipo).toBe('novo');
    expect(r?.lista.itens.map((i) => i.nome)).toEqual(['Arroz', 'Café']);
  });

  it('soma um passo quando o item já está na lista, mesmo escrito diferente', () => {
    const r = adicionarNaLista(lista(['Limão']), 'LIMÕES');
    expect(r?.tipo).toBe('somado');
    expect(r?.lista.itens).toHaveLength(1);
    expect(r?.item.quantidade).toBe(1.5); // limão é em kg: passo de 0,5
    expect(adicionarNaLista(lista(['café']), 'café')?.item.quantidade).toBe(2);
  });

  it('não soma em item já pego: cria outro', () => {
    const base = lista(['arroz']);
    base.itens[0] = { ...base.itens[0], pego: true };
    expect(adicionarNaLista(base, 'arroz')?.tipo).toBe('novo');
  });

  it('ignora texto vazio', () => {
    expect(adicionarNaLista(lista(), '   ')).toBeNull();
  });
});

describe('chipsSugestao', () => {
  it('mostra as 22 sugestões numa lista vazia, começando por arroz', () => {
    const chips = chipsSugestao(lista());
    expect(chips).toHaveLength(22);
    expect(chips[0].nome).toBe('Arroz');
  });

  it('some com o que já está na lista', () => {
    const nomes = chipsSugestao(lista(['arroz', 'cafe'])).map((c) => c.nome);
    expect(nomes).not.toContain('Arroz');
    expect(nomes).not.toContain('Café');
    expect(nomes).toHaveLength(20);
  });
});

describe('itensProprios e buscarSugestoes', () => {
  const historico = [lista(['Fita isolante', 'arroz', 'fita isolante']), lista(['Ração do peixe'])];

  it('pega só itens fora do catálogo, sem repetir', () => {
    expect(itensProprios(historico).map((s) => s.nome)).toEqual(['Fita isolante', 'Ração do peixe']);
  });

  it('autocompleta pelo catálogo e pelo histórico', () => {
    const proprios = itensProprios(historico);
    expect(buscarSugestoes('fit', proprios).map((s) => s.nome)).toEqual(['Fita isolante']);
    expect(buscarSugestoes('arr', proprios)[0]).toMatchObject({ nome: 'Arroz', origem: 'catalogo' });
    expect(buscarSugestoes('', proprios)).toEqual([]);
  });
});
