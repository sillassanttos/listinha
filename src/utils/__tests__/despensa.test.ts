import { describe, expect, it } from '@jest/globals';

import type { ItemLista, Lista } from '@/types';

import { filtrarDespensa, itensDaCasa, paraImportar, secoesDespensa } from '../despensa';
import { criarItem } from '../lista';

const DIA = 86_400_000;
const AGORA = new Date(2026, 10, 19, 12).getTime();

function item(nome: string, extra: Partial<ItemLista> = {}): ItemLista {
  return { ...criarItem(nome, 1), pego: true, ...extra };
}

function compra(diasAtras: number, itens: ItemLista[]): Lista {
  const t = AGORA - diasAtras * DIA;
  return { id: `c${diasAtras}`, nome: 'Compra', criadaEm: t, finalizadaEm: t, itens };
}

describe('itensDaCasa', () => {
  it('um item por nome, com os dados da compra mais recente, em ordem alfabética', () => {
    const historico = [
      compra(3, [item('Leite', { quantidade: 6, unidade: 'L' }), item('café')]),
      compra(10, [item('leite', { quantidade: 2, unidade: 'L' }), item('Arroz', { quantidade: 5, unidade: 'kg' })]),
    ];
    const casa = itensDaCasa(historico, AGORA);
    expect(casa.map((i) => i.nome)).toEqual(['Arroz', 'Café', 'Leite']);
    expect(casa.find((i) => i.nome === 'Leite')).toMatchObject({ quantidade: 6, unidade: 'L', vezes: 2 });
  });

  it('nome repetido na mesma compra conta uma vez; histórico vazio dá lista vazia', () => {
    expect(itensDaCasa([compra(1, [item('ovo'), item('ovos')])], AGORA)[0].vezes).toBe(1);
    expect(itensDaCasa([], AGORA)).toEqual([]);
  });

  it('marca como acabando o que passou do intervalo de costume', () => {
    // café a cada 7 dias, último há 8: está acabando; arroz só uma vez: não dá para saber.
    const historico = [compra(8, [item('café'), item('arroz')]), compra(15, [item('café')]), compra(22, [item('café')])];
    const casa = itensDaCasa(historico, AGORA);
    expect(casa.find((i) => i.nome === 'Café')?.acabando).toBe(true);
    expect(casa.find((i) => i.nome === 'Arroz')?.acabando).toBe(false);
  });
});

describe('filtrar, agrupar e levar para a lista', () => {
  const casa = itensDaCasa(
    [compra(8, [item('café'), item('banana'), item('detergente')]), compra(15, [item('café')]), compra(22, [item('café')])],
    AGORA,
  );

  it('filtra sem acento e no plural', () => {
    expect(filtrarDespensa(casa, 'CAFE').map((i) => i.nome)).toEqual(['Café']);
    expect(filtrarDespensa(casa, 'bananas').map((i) => i.nome)).toEqual(['Banana']);
    expect(filtrarDespensa(casa, '  ')).toHaveLength(3);
  });

  it('acabando no topo, o resto por corredor na ordem do usuário', () => {
    const { acabando, secoes } = secoesDespensa(casa, ['limpeza', 'hortifruti', 'mercearia', 'outros']);
    expect(acabando.map((i) => i.nome)).toEqual(['Café']);
    expect(secoes.map((s) => s.categoria)).toEqual(['limpeza', 'hortifruti']);
  });

  it('leva nome, quantidade e unidade da última compra', () => {
    const leite = itensDaCasa([compra(1, [item('leite', { quantidade: 6, unidade: 'L', preco: 5 })])], AGORA)[0];
    expect(paraImportar(leite)).toEqual({ nome: 'Leite', quantidade: 6, unidade: 'L' });
  });
});
