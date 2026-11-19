import type { Unidade } from '@/types';

// Quantidade e unidade dos itens: passo dos botões +/−, nomes e formatação.

export const UNIDADES: { id: Unidade; nome: string }[] = [
  { id: 'un', nome: 'unidade' },
  { id: 'kg', nome: 'quilo' },
  { id: 'g', nome: 'grama' },
  { id: 'L', nome: 'litro' },
  { id: 'ml', nome: 'mililitro' },
  { id: 'dz', nome: 'dúzia' },
  { id: 'pct', nome: 'pacote' },
  { id: 'cx', nome: 'caixa' },
];

const PASSOS: Record<Unidade, number> = {
  un: 1,
  kg: 0.5,
  g: 100,
  L: 0.5,
  ml: 100,
  dz: 0.5,
  pct: 1,
  cx: 1,
};

/** Quanto cada toque em +/− muda. Também é a quantidade mínima. */
export function passoDaUnidade(unidade: Unidade): number {
  return PASSOS[unidade] ?? 1;
}

/** Arredonda para evitar 0.30000000000000004. */
function arredondar(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Soma (direcao 1) ou subtrai (direcao -1) um passo, sem descer do mínimo. */
export function ajustarQuantidade(quantidade: number, unidade: Unidade, direcao: 1 | -1): number {
  const passo = passoDaUnidade(unidade);
  return arredondar(Math.max(passo, quantidade + direcao * passo));
}

export function podeDiminuir(quantidade: number, unidade: Unidade): boolean {
  return quantidade > passoDaUnidade(unidade);
}

/**
 * Ao trocar de unidade, mantém o número se ele fizer sentido na nova unidade;
 * senão usa o mínimo dela (ex.: 2 un -> g vira 100 g; 300 g -> kg vira 0,5 kg).
 */
export function quantidadeAoTrocarUnidade(quantidade: number, nova: Unidade): number {
  const passo = passoDaUnidade(nova);
  if (quantidade < passo) return passo;
  // Vindo de g/ml (números grandes) para unidade "pequena": 500 g -> kg não vira 500 kg.
  if (quantidade > 50 && passo < 50) return passo;
  return arredondar(Math.round(quantidade / passo) * passo) || passo;
}

/** Lê o que o usuário digitou ("1,5", "2", " 0.5 "). Devolve null se não for um número positivo. */
export function lerQuantidade(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null;
  const n = arredondar(Number(limpo));
  return n > 0 ? n : null;
}

/** "1", "1,5", "0,5" */
export function formatarQuantidade(quantidade: number): string {
  return arredondar(quantidade).toString().replace('.', ',');
}

/** "1,5 kg", "2 un" */
export function formatarQuantidadeUnidade(quantidade: number, unidade: Unidade): string {
  return `${formatarQuantidade(quantidade)} ${unidade}`;
}
