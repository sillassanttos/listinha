import type { Lista } from '@/types';
import { criarItem, gerarId } from '@/utils/lista';

// Histórico de demonstração, só para testar no Expo Go (botão aparece apenas em __DEV__).
// 4 compras semanais nas últimas semanas, com itens recorrentes, para as sugestões
// por frequência ("faz 10 dias que você não compra café") terem o que mostrar.

const DIA = 86_400_000;

const COMPRAS: { diasAtras: number; itens: string[] }[] = [
  { diasAtras: 3, itens: ['leite', 'pão', 'banana', 'ovos'] },
  { diasAtras: 10, itens: ['leite', 'pão', 'café', 'arroz', 'detergente'] },
  { diasAtras: 17, itens: ['leite', 'café', 'banana', 'papel higiênico', 'ovos'] },
  { diasAtras: 24, itens: ['café', 'arroz', 'feijão', 'detergente', 'pão'] },
];

export function gerarHistoricoExemplo(agora = Date.now()): Lista[] {
  return COMPRAS.map(({ diasAtras, itens }) => {
    const quando = agora - diasAtras * DIA;
    return {
      id: gerarId(),
      nome: `Exemplo (${diasAtras} dias atrás)`,
      criadaEm: quando,
      finalizadaEm: quando,
      itens: itens.map((nome, i) => ({ ...criarItem(nome, quando + i), pego: true, pegoEm: quando + i })),
    };
  });
}
