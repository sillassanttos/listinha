import type { Lista } from '@/types';
import { criarItem, gerarId } from '@/utils/lista';

// Histórico de demonstração, só para testar no Expo Go (botão aparece apenas em __DEV__).
// 4 compras semanais nas últimas semanas, com itens recorrentes, para as sugestões
// por frequência ("faz 10 dias que você não compra café") terem o que mostrar.
// Fase 3: os itens vêm com preço (variando um pouco a cada semana) para o histórico de preços.

const DIA = 86_400_000;

const COMPRAS: { diasAtras: number; fator: number; itens: string[] }[] = [
  { diasAtras: 3, fator: 1.06, itens: ['leite', 'pão', 'banana', 'ovos'] },
  { diasAtras: 10, fator: 1.1, itens: ['leite', 'pão', 'café', 'arroz', 'detergente'] },
  { diasAtras: 17, fator: 0.97, itens: ['leite', 'café', 'banana', 'papel higiênico', 'ovos'] },
  { diasAtras: 24, fator: 1, itens: ['café', 'arroz', 'feijão', 'detergente', 'pão'] },
];

/** Preço de etiqueta de referência (por unidade de venda do catálogo). */
const PRECO_BASE: Record<string, number> = {
  leite: 5.49,
  pão: 14.9,
  banana: 6.99,
  ovos: 16.9,
  café: 18.9,
  arroz: 27.9,
  detergente: 2.79,
  'papel higiênico': 21.9,
  feijão: 8.49,
};

export function gerarHistoricoExemplo(agora = Date.now()): Lista[] {
  return COMPRAS.map(({ diasAtras, fator, itens }) => {
    const quando = agora - diasAtras * DIA;
    return {
      id: gerarId(),
      nome: `Exemplo (${diasAtras} dias atrás)`,
      criadaEm: quando,
      finalizadaEm: quando,
      itens: itens.map((nome, i) => ({
        ...criarItem(nome, quando + i),
        pego: true,
        pegoEm: quando + i,
        preco: PRECO_BASE[nome] ? Math.round(PRECO_BASE[nome] * fator * 100) / 100 : undefined,
      })),
    };
  });
}
