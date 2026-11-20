import { describe, expect, it } from '@jest/globals';

import { separarDitado } from '../ditado';
import { interpretarTexto } from '../importar';

describe('separarDitado', () => {
  it('separa o ditado sem vírgula usando o catálogo', () => {
    expect(separarDitado('sabão em pó feijão café maçã')).toEqual(['sabão em pó', 'feijão', 'café', 'maçã']);
    expect(separarDitado('Arroz Feijão Ovos Leite')).toEqual(['Arroz', 'Feijão', 'Ovos', 'Leite']);
  });

  it('palavra desconhecida fica com o item anterior', () => {
    expect(separarDitado('arroz integral café pilão banana')).toEqual(['arroz integral', 'café pilão', 'banana']);
  });

  it('"e" separa; "de" seguido de produto continua o item', () => {
    expect(separarDitado('arroz e feijão')).toEqual(['arroz', 'feijão']);
    expect(separarDitado('suco de laranja pão')).toEqual(['suco de laranja', 'pão']);
  });

  it('mesmo produto dito de dois jeitos fica junto', () => {
    expect(separarDitado('sabão em pó omo detergente')).toEqual(['sabão em pó omo', 'detergente']);
  });

  it('quantidade, inclusive falada, abre o item seguinte', () => {
    expect(separarDitado('2 kg de arroz feijão')).toEqual(['2 kg de arroz', 'feijão']);
    expect(separarDitado('dois quilos de arroz três leite')).toEqual(['2 quilos de arroz', '3 leite']);
    expect(separarDitado('uma dúzia de ovos meio quilo de tomate')).toEqual(['1 dúzia de ovos', '0,5 quilo de tomate']);
    expect(separarDitado('arroz feijão 2')).toEqual(['arroz', 'feijão 2']);
  });

  it('tira palavras de conversa do começo', () => {
    expect(separarDitado('preciso comprar arroz também um café')).toEqual(['arroz', 'café']);
  });

  it('não mexe no que não é ditado ou tem um produto só', () => {
    expect(separarDitado('pão de forma integral')).toEqual(['pão de forma integral']);
    expect(separarDitado('chocotone')).toEqual(['chocotone']);
    expect(separarDitado('Arroz — 5 kg (integral)')).toEqual(['Arroz — 5 kg (integral)']);
    expect(separarDitado('  ')).toEqual([]);
  });
});

describe('interpretarTexto com ditado', () => {
  it('ditado vira vários itens com quantidade', () => {
    expect(interpretarTexto('dois quilos de arroz feijão café')).toEqual([
      { nome: 'arroz', quantidade: 2, unidade: 'kg', observacao: undefined },
      { nome: 'feijão', quantidade: undefined, unidade: undefined, observacao: undefined },
      { nome: 'café', quantidade: undefined, unidade: undefined, observacao: undefined },
    ]);
  });
});
