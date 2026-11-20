import type { CategoriaId, Lista, Unidade } from '@/types';

import { chaveBusca } from './normalizar';
import { unidadeDoPreco } from './preco';

// Fase 3: histórico de preços por produto, calculado na hora a partir das compras finalizadas
// (itens com preço digitado no Modo Mercado). Nada novo é salvo.
// O preço é o da etiqueta por unidade de venda; g e ml viram preço por kg e L (unidadeDoPreco).
// Um produto só compara preços na mesma unidade de preço: vale a unidade da compra mais recente.

export type PontoPreco = { em: number; preco: number; listaId: string };

export type ProdutoComPrecos = {
  chave: string;
  nome: string;
  emoji: string;
  categoria: CategoriaId;
  unidadePreco: Unidade;
  /** Do mais antigo para o mais recente; um por compra. */
  pontos: PontoPreco[];
};

/** Produtos com pelo menos um preço no histórico, do comprado mais recentemente para o mais antigo. */
export function historicoDePrecos(historico: Lista[]): ProdutoComPrecos[] {
  type Bruto = { nome: string; emoji: string; categoria: CategoriaId; unidade: Unidade; ponto: PontoPreco };
  const porChave = new Map<string, Bruto[]>();

  for (const lista of historico) {
    if (!lista.finalizadaEm) continue;
    const vistos = new Set<string>();
    for (const item of lista.itens) {
      if (typeof item.preco !== 'number' || !Number.isFinite(item.preco) || item.preco <= 0) continue;
      const chave = chaveBusca(item.nome);
      if (!chave || vistos.has(chave)) continue;
      vistos.add(chave);
      const brutos = porChave.get(chave) ?? [];
      brutos.push({
        nome: item.nome,
        emoji: item.emoji,
        categoria: item.categoria,
        unidade: unidadeDoPreco(item.unidade),
        ponto: { em: item.pegoEm ?? lista.finalizadaEm, preco: item.preco, listaId: lista.id },
      });
      porChave.set(chave, brutos);
    }
  }

  const produtos: ProdutoComPrecos[] = [];
  for (const [chave, brutos] of porChave) {
    brutos.sort((a, b) => a.ponto.em - b.ponto.em);
    const recente = brutos[brutos.length - 1];
    const mesmaUnidade = brutos.filter((b) => b.unidade === recente.unidade);
    produtos.push({
      chave,
      nome: recente.nome,
      emoji: recente.emoji,
      categoria: recente.categoria,
      unidadePreco: recente.unidade,
      pontos: mesmaUnidade.map((b) => b.ponto),
    });
  }
  return produtos.sort((a, b) => b.pontos[b.pontos.length - 1].em - a.pontos[a.pontos.length - 1].em);
}

export type ResumoPrecos = {
  ultimo: number;
  anterior?: number;
  /** (último − anterior) / anterior; undefined com um preço só. */
  variacao?: number;
  minimo: number;
  maximo: number;
  media: number;
};

export function resumoPrecos(pontos: PontoPreco[]): ResumoPrecos | null {
  if (pontos.length === 0) return null;
  const precos = pontos.map((p) => p.preco);
  const ultimo = precos[precos.length - 1];
  const anterior = precos.length > 1 ? precos[precos.length - 2] : undefined;
  return {
    ultimo,
    anterior,
    variacao: anterior ? (ultimo - anterior) / anterior : undefined,
    minimo: Math.min(...precos),
    maximo: Math.max(...precos),
    media: precos.reduce((s, p) => s + p, 0) / precos.length,
  };
}

/** "+12%", "−5%" ou "igual" (variação abaixo de 0,5%). Sem Intl, como o resto do app. */
export function formatarVariacao(variacao: number): string {
  const pct = Math.round(variacao * 100);
  if (pct === 0) return 'igual';
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

/** Rótulo da unidade do preço: "por kg", "por un", "por pct"… */
export function rotuloUnidadePreco(unidade: Unidade): string {
  return `por ${unidade}`;
}

/**
 * Marcas do eixo dos preços: 3 valores "redondos" que cobrem do mínimo ao máximo
 * (passo de 0,10 / 0,25 / 0,50 / 1 / 2 / 5 / 10… reais). Com preço único, abre uma folga em volta.
 */
export function marcasDoEixo(minimo: number, maximo: number): { de: number; ate: number; marcas: number[] } {
  const amplitude = maximo - minimo || Math.max(maximo * 0.2, 1);
  const passoBruto = amplitude / 2;
  const escala = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * escala).find((p) => p >= passoBruto) ?? 10 * escala;
  let de = Math.floor(minimo / passo) * passo;
  let ate = Math.ceil(maximo / passo) * passo;
  if (de === ate) {
    de -= passo;
    ate += passo;
  }
  de = Math.max(0, de);
  const marcas: number[] = [];
  for (let v = de; v <= ate + passo / 1000; v += passo) marcas.push(Math.round(v * 100) / 100);
  return { de, ate: marcas[marcas.length - 1], marcas };
}

/** Posição horizontal (0 a 1) de cada ponto, proporcional ao tempo entre as compras. */
export function posicoesNoTempo(pontos: PontoPreco[]): number[] {
  if (pontos.length <= 1) return pontos.map(() => 0.5);
  const inicio = pontos[0].em;
  const duracao = pontos[pontos.length - 1].em - inicio;
  if (duracao <= 0) return pontos.map((_, i) => i / (pontos.length - 1));
  return pontos.map((p) => (p.em - inicio) / duracao);
}

/** Índice do ponto mais perto de onde a pessoa tocou (posição horizontal de 0 a 1). */
export function pontoMaisProximo(posicoes: number[], fracaoX: number): number {
  let melhor = 0;
  posicoes.forEach((x, i) => {
    if (Math.abs(x - fracaoX) < Math.abs(posicoes[melhor] - fracaoX)) melhor = i;
  });
  return melhor;
}
