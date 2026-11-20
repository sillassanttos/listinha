import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { criarItem } from '../lista';
import { listaComItem, listaPorRemoto, nomeSemRepetir, resolverAtual, substituirLista } from '../listas';

const lista = (id: string, nome = id, extra: Partial<Lista> = {}): Lista => ({ id, nome, criadaEm: 1, itens: [], ...extra });

describe('várias listas', () => {
  const mercado = lista('m', 'Mercado', { itens: [{ ...criarItem('arroz', 1), id: 'i1' }] });
  const farmacia = lista('f', 'Farmácia', { compartilhada: { id: 'r1', codigo: 'AB3K7Q' } });
  const listas = [mercado, farmacia];

  it('lista atual: a do id ou a primeira', () => {
    expect(resolverAtual(listas, 'f')).toBe(farmacia);
    expect(resolverAtual(listas, 'sumiu')).toBe(mercado);
    expect(resolverAtual([], 'f')).toBeNull();
  });

  it('substituir mantém as outras como estão; null tira; id novo acrescenta', () => {
    const nova = { ...farmacia, nome: 'Drogaria' };
    const r = substituirLista(listas, 'f', nova);
    expect(r[0]).toBe(mercado);
    expect(r[1]).toBe(nova);
    expect(substituirLista(listas, 'm', null)).toEqual([farmacia]);
    expect(substituirLista(listas, 'x', lista('x')).map((l) => l.id)).toEqual(['m', 'f', 'x']);
    expect(substituirLista(listas, 'x', null)).toBe(listas);
  });

  it('acha a lista do item e a da família', () => {
    expect(listaComItem(listas, 'i1')).toBe(mercado);
    expect(listaComItem(listas, 'nada')).toBeUndefined();
    expect(listaPorRemoto(listas, 'r1')).toBe(farmacia);
  });

  it('nome sem repetir', () => {
    expect(nomeSemRepetir(listas, 'Feira')).toBe('Feira');
    expect(nomeSemRepetir(listas, 'mercado')).toBe('mercado 2');
    expect(nomeSemRepetir([...listas, lista('m2', 'Mercado 2')], 'Mercado')).toBe('Mercado 3');
    expect(nomeSemRepetir([], '  ')).toBe('Compra da semana');
  });
});
