import { describe, expect, it } from '@jest/globals';

import type { CategoriaId, ItemLista } from '@/types';

import { agruparPorCategoria } from '../agrupar';
import { criarItem } from '../lista';

function itens(nomes: string[]): ItemLista[] {
  return nomes.map((n, i) => criarItem(n, i + 1));
}

describe('agruparPorCategoria', () => {
  it('segue a ordem dos corredores e pula categorias vazias', () => {
    const grupos = agruparPorCategoria(itens(['detergente', 'banana', 'arroz', 'pão', 'fita isolante']));
    expect(grupos.map((g) => g.categoria)).toEqual(['hortifruti', 'padaria', 'mercearia', 'limpeza', 'outros']);
  });

  it('mantém a ordem de adição dentro do grupo', () => {
    const grupos = agruparPorCategoria(itens(['feijão', 'café', 'arroz']));
    expect(grupos).toHaveLength(1);
    expect(grupos[0].itens.map((i) => i.nome)).toEqual(['Feijão', 'Café', 'Arroz']);
  });

  it('aceita outra ordem de categorias', () => {
    const ordem: CategoriaId[] = ['limpeza', 'hortifruti', 'outros'];
    const grupos = agruparPorCategoria(itens(['banana', 'detergente']), ordem);
    expect(grupos.map((g) => g.categoria)).toEqual(['limpeza', 'hortifruti']);
  });

  it('manda categoria desconhecida para "Outros"', () => {
    const [item] = itens(['banana']);
    const grupos = agruparPorCategoria([{ ...item, categoria: 'inexistente' as CategoriaId }]);
    expect(grupos).toEqual([{ categoria: 'outros', itens: [expect.objectContaining({ nome: 'Banana' })] }]);
  });

  it('lista vazia não tem grupos', () => {
    expect(agruparPorCategoria([])).toEqual([]);
  });
});
