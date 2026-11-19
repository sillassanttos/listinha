import { SUGESTOES_RAPIDAS, obterProduto } from '@/data/produtos';
import type { CategoriaId, Lista, ProdutoBase } from '@/types';

import { buscarProdutos, encontrarProdutoExato } from './categorizar';
import { listaContem } from './lista';
import { chaveBusca } from './normalizar';

// Sugestões para a tela Lista: chips rápidos e autocompletar (catálogo + histórico).

export type Sugestao = {
  nome: string;
  emoji: string;
  categoria: CategoriaId;
  origem: 'catalogo' | 'historico';
};

function deProduto(p: ProdutoBase): Sugestao {
  return { nome: p.nome, emoji: p.emoji, categoria: p.categoria, origem: 'catalogo' };
}

/** Chips de sugestão rápida, sem os que já estão (não pegos) na lista. */
export function chipsSugestao(lista: Lista): Sugestao[] {
  return SUGESTOES_RAPIDAS.map(obterProduto)
    .filter((p): p is ProdutoBase => !!p)
    .filter((p) => !listaContem(lista, p.nome))
    .map(deProduto);
}

/**
 * Itens que o usuário já usou e não estão no catálogo (ex.: "Fita isolante"),
 * a partir das listas do histórico, do mais recente para o mais antigo, sem repetir.
 */
export function itensProprios(historico: Lista[]): Sugestao[] {
  const vistos = new Set<string>();
  const resultado: Sugestao[] = [];
  for (const lista of historico) {
    for (const item of lista.itens) {
      const chave = chaveBusca(item.nome);
      if (!chave || vistos.has(chave) || encontrarProdutoExato(item.nome)) continue;
      vistos.add(chave);
      resultado.push({ nome: item.nome, emoji: item.emoji, categoria: item.categoria, origem: 'historico' });
    }
  }
  return resultado;
}

/** Autocompletar: catálogo primeiro (já ordenado por relevância), depois itens próprios do histórico. */
export function buscarSugestoes(texto: string, proprios: Sugestao[], limite = 6): Sugestao[] {
  const chave = chaveBusca(texto);
  if (!chave) return [];

  const doCatalogo = buscarProdutos(texto, limite).map(deProduto);
  const doHistorico = proprios.filter((s) => {
    const c = chaveBusca(s.nome);
    return c.startsWith(chave) || c.split(' ').some((palavra) => palavra.startsWith(chave));
  });
  return [...doCatalogo, ...doHistorico].slice(0, limite);
}
