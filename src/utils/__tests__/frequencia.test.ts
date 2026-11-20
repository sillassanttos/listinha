import { describe, expect, it } from '@jest/globals';

import type { Lista } from '@/types';

import { calcularFrequencias, rotuloCurto, sugestoesPorFrequencia, textoLembrete } from '../frequencia';
import { criarItem } from '../lista';

const DIA = 86_400_000;
const AGORA = new Date(2026, 10, 30, 10, 0, 0).getTime(); // 30/11/2026 10h

/** Compra finalizada há `diasAtras` dias, com os itens pegos (e um não pego, opcional). */
function compra(diasAtras: number, pegos: string[], naoPegos: string[] = []): Lista {
  const quando = AGORA - diasAtras * DIA;
  return {
    id: `c${diasAtras}`,
    nome: 'Compra',
    criadaEm: quando,
    finalizadaEm: quando,
    itens: [
      ...pegos.map((n) => ({ ...criarItem(n, quando), pego: true, pegoEm: quando })),
      ...naoPegos.map((n) => criarItem(n, quando)),
    ],
  };
}

// histórico do mais recente para o mais antigo, como no app
const historico = [
  compra(3, ['leite', 'pão']),
  compra(10, ['leite', 'pão', 'café']),
  compra(17, ['leite', 'café', 'detergente'], ['sorvete']),
  compra(24, ['café']),
];

describe('calcularFrequencias', () => {
  it('conta compras em dias diferentes e calcula o intervalo médio', () => {
    const f = calcularFrequencias(historico, AGORA);
    const cafe = f.find((x) => x.nome === 'Café')!;
    expect(cafe).toMatchObject({ vezes: 3, diasDesde: 10, intervaloMedio: 7, atrasado: true });
    const leite = f.find((x) => x.nome === 'Leite')!;
    expect(leite).toMatchObject({ vezes: 3, diasDesde: 3, intervaloMedio: 7, atrasado: false });
  });

  it('ignora itens comprados uma vez só e itens não pegos', () => {
    const nomes = calcularFrequencias(historico, AGORA).map((x) => x.nome);
    expect(nomes).not.toContain('Detergente');
    expect(nomes).not.toContain('Sorvete');
  });

  it('o mais atrasado vem primeiro', () => {
    expect(calcularFrequencias(historico, AGORA)[0].nome).toBe('Café');
  });

  it('duas compras no mesmo dia contam como uma', () => {
    const mesmoDia = [compra(0, ['arroz']), { ...compra(0, ['arroz']), id: 'outra' }];
    expect(calcularFrequencias(mesmoDia, AGORA)).toHaveLength(0);
  });
});

describe('sugestoesPorFrequencia', () => {
  it('não sugere o que já está na lista', () => {
    const lista: Lista = { id: 'a', nome: 'A', criadaEm: AGORA, itens: [criarItem('café', AGORA)] };
    const nomes = sugestoesPorFrequencia(historico, lista, AGORA).map((x) => x.nome);
    expect(nomes).not.toContain('Café');
    expect(nomes).toEqual(expect.arrayContaining(['Leite', 'Pão francês']));
  });
});

describe('textos', () => {
  it('monta a frase do lembrete e o rótulo do chip', () => {
    const cafe = calcularFrequencias(historico, AGORA).find((x) => x.nome === 'Café')!;
    expect(textoLembrete(cafe)).toBe('faz 10 dias que você não compra café');
    expect(rotuloCurto(cafe)).toBe('10 dias');
    expect(rotuloCurto({ ...cafe, diasDesde: 0 })).toBe('3x');
  });
});
