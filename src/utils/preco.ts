import type { ItemLista, Lista, Unidade } from '@/types';

import { chaveBusca } from './normalizar';

// Preço por item e total do carrinho (Fase 2).
// O preço digitado é o da etiqueta, por unidade de venda: por pacote, por kg, por litro…
// Para itens em g ou ml o preço é por kg ou por litro (como nas etiquetas), e o total converte.

/** Unidade a que o preço se refere, para mostrar "R$ por kg". */
export function unidadeDoPreco(unidade: Unidade): Unidade {
  if (unidade === 'g') return 'kg';
  if (unidade === 'ml') return 'L';
  return unidade;
}

/** Quanto o item custa no total: preço × quantidade (convertendo g→kg e ml→L). */
export function totalDoItem(item: Pick<ItemLista, 'preco' | 'quantidade' | 'unidade'>): number | undefined {
  if (item.preco === undefined) return undefined;
  const fator = item.unidade === 'g' || item.unidade === 'ml' ? 1 / 1000 : 1;
  return arredondarCentavos(item.preco * item.quantidade * fator);
}

function arredondarCentavos(n: number): number {
  return Math.round(n * 100) / 100;
}

export type TotalCarrinho = {
  /** Soma dos itens pegos que têm preço. */
  total: number;
  comPreco: number;
  semPreco: number;
};

export function calcularTotalCarrinho(lista: Lista): TotalCarrinho {
  let total = 0;
  let comPreco = 0;
  let semPreco = 0;
  for (const item of lista.itens) {
    if (!item.pego) continue;
    const t = totalDoItem(item);
    if (t === undefined) semPreco++;
    else {
      total += t;
      comPreco++;
    }
  }
  return { total: arredondarCentavos(total), comPreco, semPreco };
}

export type EstadoOrcamento = 'ok' | 'perto' | 'estourou';

export type SituacaoOrcamento = {
  estado: EstadoOrcamento;
  /** Quanto ainda dá para gastar (negativo = passou). */
  restante: number;
  /** total / orçamento (pode passar de 1). */
  fracao: number;
};

/** A partir de quanto do orçamento o app avisa que está perto (90%). */
export const LIMITE_PERTO = 0.9;

/** Situação do carrinho em relação ao orçamento; sem orçamento, null. */
export function situacaoOrcamento(total: number, orcamento: number | undefined): SituacaoOrcamento | null {
  if (!orcamento || orcamento <= 0) return null;
  const fracao = total / orcamento;
  const estado: EstadoOrcamento = total > orcamento ? 'estourou' : fracao >= LIMITE_PERTO ? 'perto' : 'ok';
  return { estado, restante: arredondarCentavos(orcamento - total), fracao };
}

/**
 * Lê o que foi digitado: "18,90", "18.90", "R$ 18,90", "1.234,56", "7".
 * Devolve null se não for um valor positivo. Vazio também é null (= sem preço).
 */
export function lerPreco(texto: string): number | null {
  let limpo = texto.replace(/R\$|\s/gi, '');
  if (!limpo) return null;
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.'); // 1.234,56
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) limpo = limpo.replace(/\./g, ''); // 1.234
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  const n = Number(limpo);
  return n > 0 ? arredondarCentavos(n) : null;
}

/** "R$ 18,90", "R$ 1.234,56" (sem depender do Intl do aparelho). */
export function formatarReais(valor: number): string {
  const [inteiro, centavos] = arredondarCentavos(valor).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

/** Valor para preencher o campo: "18,90". */
export function precoParaCampo(valor: number | undefined): string {
  return valor === undefined ? '' : arredondarCentavos(valor).toFixed(2).replace('.', ',');
}

/** Último preço pago pelo item nas compras anteriores (mesma unidade de preço), se houver. */
export function ultimoPreco(historico: Lista[], nome: string, unidade: Unidade): number | undefined {
  const chave = chaveBusca(nome);
  const alvo = unidadeDoPreco(unidade);
  let melhor: { preco: number; em: number } | undefined;
  for (const lista of historico) {
    for (const item of lista.itens) {
      if (item.preco === undefined || chaveBusca(item.nome) !== chave || unidadeDoPreco(item.unidade) !== alvo) continue;
      const em = item.pegoEm ?? lista.finalizadaEm ?? lista.criadaEm;
      if (!melhor || em > melhor.em) melhor = { preco: item.preco, em };
    }
  }
  return melhor?.preco;
}
