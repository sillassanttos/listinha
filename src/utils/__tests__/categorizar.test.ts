import { describe, expect, it } from '@jest/globals';

import { buscarProdutos, categorizar, encontrarProduto } from '../categorizar';

describe('encontrarProduto', () => {
  it.each([
    ['Arroz', 'arroz'],
    ['ARROZ', 'arroz'],
    ['limões', 'limao'],
    ['Feijao', 'feijao'],
    ['aipim', 'mandioca'],
    ['macaxeira', 'mandioca'],
    ['Pão francês', 'pao'],
    ['cacetinho', 'pao'],
    ['ovo', 'ovos'],
    ['Nescau', 'achocolatado'],
    ['bombril', 'palha-aco'],
    ['Papel higiênico', 'papel-higienico'],
  ])('"%s" -> %s', (nome, id) => {
    expect(encontrarProduto(nome)?.id).toBe(id);
  });

  it('acha o produto dentro de um nome maior, preferindo o termo mais longo', () => {
    expect(encontrarProduto('Arroz Tio João 5kg')?.id).toBe('arroz');
    expect(encontrarProduto('pão de forma integral')?.id).toBe('pao-forma');
    expect(encontrarProduto('leite condensado moça')?.id).toBe('leite-condensado');
    expect(encontrarProduto('água com gás')?.id).toBe('agua-gas');
    expect(encontrarProduto('ração do peixe')?.categoria).toBe('pet');
  });

  it('retorna undefined para itens desconhecidos ou vazios', () => {
    expect(encontrarProduto('fita isolante')).toBeUndefined();
    expect(encontrarProduto('   ')).toBeUndefined();
  });
});

describe('categorizar', () => {
  it('usa categoria, emoji e unidade do produto', () => {
    expect(categorizar('banana')).toMatchObject({ categoria: 'hortifruti', emoji: '🍌', unidade: 'dz' });
    expect(categorizar('detergente')).toMatchObject({ categoria: 'limpeza', unidade: 'un' });
  });

  it('manda itens desconhecidos para "Outros" com o emoji de carrinho', () => {
    expect(categorizar('fita isolante')).toEqual({ categoria: 'outros', emoji: '🛒', unidade: 'un' });
  });
});

describe('buscarProdutos', () => {
  it('coloca primeiro os nomes que começam com o texto, em ordem alfabética', () => {
    const nomes = buscarProdutos('ca').map((p) => p.nome);
    expect(nomes.slice(0, 3)).toEqual(['Cachaça', 'Café', 'Café solúvel']);
  });

  it('nome igual vem antes de nome que só começa igual', () => {
    expect(buscarProdutos('cafe')[0].id).toBe('cafe');
    expect(buscarProdutos('parafuso')[0].id).toBe('macarrao');
  });

  it('encontra pelo sinônimo e respeita o limite', () => {
    expect(buscarProdutos('aipi').map((p) => p.id)).toContain('mandioca');
    expect(buscarProdutos('a', 5)).toHaveLength(5);
  });

  it('retorna vazio para texto vazio', () => {
    expect(buscarProdutos('')).toEqual([]);
  });
});
