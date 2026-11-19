import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { calcularProgresso, criarItem, iniciarNovaLista, textoProgresso } from '../lista';

function listaCom(pegos: boolean[]): Lista {
  return {
    id: 'l1',
    nome: 'Compra da semana',
    criadaEm: 1,
    itens: pegos.map((pego, i) => ({ ...criarItem(`item ${i}`, 1), pego, pegoEm: pego ? 2 : undefined })),
  };
}

describe('calcularProgresso e textoProgresso', () => {
  it('conta itens pegos e faltantes', () => {
    const p = calcularProgresso(listaCom([true, false, true, false]));
    expect(p).toEqual({ total: 4, pegos: 2, faltam: 2, fracao: 0.5 });
    expect(textoProgresso(p)).toBe('2 de 4 itens no carrinho');
  });

  it('trata lista vazia e lista completa', () => {
    expect(calcularProgresso(listaCom([])).fracao).toBe(0);
    expect(textoProgresso(calcularProgresso(listaCom([])))).toBe('Nenhum item ainda');
    expect(textoProgresso(calcularProgresso(listaCom([true, true])))).toBe('Todos os 2 itens no carrinho 🎉');
    expect(textoProgresso(calcularProgresso(listaCom([false])))).toBe('0 de 1 item no carrinho');
  });
});

describe('criarItem', () => {
  it('usa o nome, a categoria e a unidade do catálogo', () => {
    const item = criarItem('limões', 10);
    expect(item).toMatchObject({ nome: 'Limão', categoria: 'hortifruti', unidade: 'kg', quantidade: 1, pego: false, criadoEm: 10 });
  });

  it('mantém o nome digitado quando o item não está no catálogo', () => {
    expect(criarItem('  Fita isolante ')).toMatchObject({ nome: 'Fita isolante', categoria: 'outros', emoji: '🛒' });
  });

  it('mantém o nome digitado quando só contém um produto, mas herda categoria e emoji', () => {
    expect(criarItem('arroz tio joão 5kg')).toMatchObject({ nome: 'Arroz tio joão 5kg', categoria: 'mercearia', emoji: '🍚' });
    expect(criarItem('ração do peixe')).toMatchObject({ nome: 'Ração do peixe', categoria: 'pet' });
  });
});

describe('iniciarNovaLista', () => {
  it('sem lista ativa, só cria a nova', () => {
    const r = iniciarNovaLista(null, 'Feira', true, 5);
    expect(r.finalizada).toBeUndefined();
    expect(r.novaLista).toMatchObject({ nome: 'Feira', itens: [], criadaEm: 5 });
  });

  it('usa "Compra da semana" quando o nome vem vazio', () => {
    expect(iniciarNovaLista(null, '   ', false).novaLista.nome).toBe('Compra da semana');
  });

  it('finaliza a atual e leva só os pendentes, desmarcados e com id novo', () => {
    const atual = listaCom([true, false, false]);
    const r = iniciarNovaLista(atual, 'Nova', true, 99);
    expect(r.finalizada).toMatchObject({ id: 'l1', finalizadaEm: 99 });
    expect(r.finalizada?.itens).toHaveLength(3);
    expect(r.novaLista.itens).toHaveLength(2);
    expect(r.novaLista.itens.every((i) => !i.pego)).toBe(true);
    const idsAntigos = atual.itens.map((i) => i.id);
    expect(r.novaLista.itens.some((i) => idsAntigos.includes(i.id))).toBe(false);
  });

  it('sem levar pendentes, a nova começa vazia', () => {
    expect(iniciarNovaLista(listaCom([false, false]), 'Nova', false).novaLista.itens).toHaveLength(0);
  });

  it('descarta a lista atual vazia em vez de mandá-la ao histórico', () => {
    expect(iniciarNovaLista(listaCom([]), 'Nova', true).finalizada).toBeUndefined();
  });
});
