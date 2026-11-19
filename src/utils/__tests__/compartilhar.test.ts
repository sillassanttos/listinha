import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { gerarTextoLista } from '../compartilhar';
import { aplicarEdicao, criarItem, marcarPego } from '../lista';

function listaExemplo(): Lista {
  const arroz = aplicarEdicao(criarItem('arroz', 1), { ...criarItem('arroz', 1), quantidade: 5, unidade: 'kg' });
  const cafe = aplicarEdicao(criarItem('café', 2), { ...criarItem('café', 2), quantidade: 2, unidade: 'pct' });
  const alho = criarItem('alho', 3);
  const banana = criarItem('banana', 4);
  return { id: 'l', nome: 'Compra da semana', criadaEm: 1, itens: [arroz, cafe, alho, banana] };
}

describe('gerarTextoLista', () => {
  it('segue o formato da seção 11, na ordem dos corredores', () => {
    expect(gerarTextoLista(listaExemplo())).toBe(
      [
        '🛒 Listinha — Compra da semana',
        '',
        '🥬 Hortifrúti',
        '• Alho — 1 un',
        '• Banana — 1 dz',
        '',
        '🍚 Mercearia',
        '• Arroz — 5 kg',
        '• Café — 2 pct',
      ].join('\n'),
    );
  });

  it('mostra observação e vírgula decimal', () => {
    const l = listaExemplo();
    l.itens[0] = { ...l.itens[0], quantidade: 1.5, observacao: 'integral' };
    expect(gerarTextoLista(l)).toContain('• Arroz — 1,5 kg (integral)');
  });

  it('itens pegos saem da lista e aparecem numa linha no fim', () => {
    let l = listaExemplo();
    l = marcarPego(l, l.itens[0].id, true);
    const texto = gerarTextoLista(l);
    expect(texto).not.toContain('• Arroz');
    expect(texto.endsWith('✅ Já no carrinho: Arroz')).toBe(true);
  });

  it('lista vazia e lista toda pega', () => {
    const vazia: Lista = { id: 'v', nome: 'Feira', criadaEm: 1, itens: [] };
    expect(gerarTextoLista(vazia)).toBe('🛒 Listinha — Feira\n\nA lista está vazia por enquanto.');
    let l = listaExemplo();
    for (const i of l.itens) l = marcarPego(l, i.id, true);
    expect(gerarTextoLista(l)).toBe('🛒 Listinha — Compra da semana\n\nTudo já está no carrinho ✅');
  });
});
