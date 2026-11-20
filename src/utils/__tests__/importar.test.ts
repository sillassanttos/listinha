import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { interpretarLinha, interpretarTexto } from '../importar';
import { adicionarImportados, criarItem } from '../lista';

describe('adicionarImportados', () => {
  const lista = (): Lista => ({ id: 'l', nome: 'T', criadaEm: 1, itens: [criarItem('café', 1)] });

  it('usa catálogo para categoria e o texto para quantidade, unidade e observação', () => {
    const r = adicionarImportados(lista(), interpretarTexto('• Arroz — 5 kg (integral)\n3 leite\nbanana'), 10);
    expect(r.adicionados).toBe(3);
    const [, arroz, leite, banana] = r.lista.itens;
    expect(arroz).toMatchObject({ nome: 'Arroz', categoria: 'mercearia', quantidade: 5, unidade: 'kg', observacao: 'integral' });
    expect(leite).toMatchObject({ nome: 'Leite', quantidade: 3, unidade: 'L' }); // unidade padrão do catálogo
    expect(banana).toMatchObject({ nome: 'Banana', quantidade: 1, unidade: 'dz' });
  });

  it('não duplica o que já está na lista', () => {
    const r = adicionarImportados(lista(), interpretarTexto('café\narroz'));
    expect(r).toMatchObject({ adicionados: 1, jaEstavam: 1 });
    expect(r.lista.itens).toHaveLength(2);
  });

  it('unidade em gramas sem número começa com 100 g', () => {
    const r = adicionarImportados({ ...lista(), itens: [] }, [{ nome: 'queijo', unidade: 'g' }]);
    expect(r.lista.itens[0]).toMatchObject({ unidade: 'g', quantidade: 100 });
  });
});

describe('interpretarLinha', () => {
  it.each([
    ['- arroz', { nome: 'arroz' }],
    ['• Feijão', { nome: 'Feijão' }],
    ['* café', { nome: 'café' }],
    ['1. leite', { nome: 'leite' }],
    ['2) açúcar', { nome: 'açúcar' }],
    ['3 - óleo', { nome: 'óleo' }],
    ['[ ] sabonete', { nome: 'sabonete' }],
    ['✅ detergente', { nome: 'detergente' }],
  ])('tira o marcador de "%s"', (linha, esperado) => {
    expect(interpretarLinha(linha)).toMatchObject(esperado);
  });

  it.each([
    ['2 kg de arroz', { nome: 'arroz', quantidade: 2, unidade: 'kg' }],
    ['2kg arroz', { nome: 'arroz', quantidade: 2, unidade: 'kg' }],
    ['3 leite', { nome: 'leite', quantidade: 3 }],
    ['3x leite', { nome: 'leite', quantidade: 3 }],
    ['leite x3', { nome: 'leite', quantidade: 3 }],
    ['arroz 5kg', { nome: 'arroz', quantidade: 5, unidade: 'kg' }],
    ['ovos 2 dz', { nome: 'ovos', quantidade: 2, unidade: 'dz' }],
    ['carne 1,5 kg', { nome: 'carne', quantidade: 1.5, unidade: 'kg' }],
    ['2 litros de leite', { nome: 'leite', quantidade: 2, unidade: 'L' }],
    ['• Arroz — 5 kg (integral)', { nome: 'Arroz', quantidade: 5, unidade: 'kg', observacao: 'integral' }],
  ])('entende a quantidade em "%s"', (linha, esperado) => {
    expect(interpretarLinha(linha)).toMatchObject(esperado);
  });

  it('número seguido de palavra que não é unidade fica no nome certo', () => {
    expect(interpretarLinha('2 limões')).toMatchObject({ nome: 'limões', quantidade: 2 });
    expect(interpretarLinha('2 limões')?.unidade).toBeUndefined();
  });

  it('tira o cabeçalho de mensagem exportada do WhatsApp', () => {
    expect(interpretarLinha('[19/11/2026 10:32] Maria: pão')).toMatchObject({ nome: 'pão' });
    expect(interpretarLinha('19/11/2026 10:32 - João: tomate')).toMatchObject({ nome: 'tomate' });
  });

  it('linha sem nome é descartada', () => {
    for (const lixo of ['', '   ', '-', '•', '123', '🛒']) expect(interpretarLinha(lixo)).toBeNull();
  });
});

describe('interpretarTexto', () => {
  it('um item por linha, ignorando linhas vazias', () => {
    const texto = 'Lista de compras\n- arroz\n\n- feijão\n• café\n';
    expect(interpretarTexto(texto).map((i) => i.nome)).toEqual(['arroz', 'feijão', 'café']);
  });

  it('vírgula separa itens, mas não números decimais', () => {
    expect(interpretarTexto('arroz, feijão; café, carne 1,5 kg').map((i) => i.nome)).toEqual([
      'arroz',
      'feijão',
      'café',
      'carne',
    ]);
  });

  it('junta repetidos somando a quantidade', () => {
    const r = interpretarTexto('2 leite\nLEITE x3\nleite');
    expect(r).toHaveLength(1);
    expect(r[0].quantidade).toBe(5);
  });

  it('lê o texto que o próprio Listinha compartilha', () => {
    const texto = [
      '🛒 Listinha — Compra da semana',
      '',
      '🥬 Hortifrúti',
      '• Alho — 1 un',
      '• Banana — 1 dz',
      '',
      '🍚 Mercearia',
      '• Arroz — 5 kg (integral)',
      '',
      '✅ Já no carrinho: Café, Leite',
    ].join('\n');
    expect(interpretarTexto(texto)).toEqual([
      { nome: 'Alho', quantidade: 1, unidade: 'un', observacao: undefined },
      { nome: 'Banana', quantidade: 1, unidade: 'dz', observacao: undefined },
      { nome: 'Arroz', quantidade: 5, unidade: 'kg', observacao: 'integral' },
    ]);
  });
});
