import { ORDEM_CATEGORIAS } from '@/data/categorias';
import type { CategoriaId, Lista, Unidade } from '@/types';

import { calcularFrequencias } from './frequencia';
import type { ItemParaImportar } from './lista';
import { chaveBusca } from './normalizar';

// Fase 2: Modo Despensa / "Acabou".
// Em casa, a pessoa vê os itens que costuma ter (tudo o que já entrou numa compra finalizada)
// e toca em "Acabou" no que terminou: o item vai para a lista ativa, que é a próxima compra
// (se não houver lista, o store cria uma). Quantidade e unidade vêm da última compra do item; o preço não.

export type ItemDespensa = {
  chave: string;
  nome: string;
  emoji: string;
  categoria: CategoriaId;
  unidade: Unidade;
  quantidade: number;
  /** Em quantas compras finalizadas o item apareceu. */
  vezes: number;
  /** Pela frequência de compra, provavelmente está acabando. */
  acabando: boolean;
};

/** Itens da casa: um por nome (chave de busca), com os dados da compra mais recente, em ordem alfabética. */
export function itensDaCasa(historico: Lista[], agora = Date.now()): ItemDespensa[] {
  const acabando = new Set(
    calcularFrequencias(historico, agora)
      .filter((f) => f.atrasado)
      .map((f) => chaveBusca(f.nome)),
  );
  const porChave = new Map<string, ItemDespensa & { ultima: number }>();

  for (const lista of historico) {
    const quando = lista.finalizadaEm ?? lista.criadaEm;
    const vistosNestaLista = new Set<string>();
    for (const item of lista.itens) {
      const chave = chaveBusca(item.nome);
      if (!chave || vistosNestaLista.has(chave)) continue;
      vistosNestaLista.add(chave);
      const atual = porChave.get(chave);
      if (!atual) {
        porChave.set(chave, {
          chave,
          nome: item.nome,
          emoji: item.emoji,
          categoria: item.categoria,
          unidade: item.unidade,
          quantidade: item.quantidade,
          vezes: 1,
          acabando: acabando.has(chave),
          ultima: quando,
        });
        continue;
      }
      atual.vezes++;
      if (quando > atual.ultima) {
        Object.assign(atual, {
          nome: item.nome,
          emoji: item.emoji,
          categoria: item.categoria,
          unidade: item.unidade,
          quantidade: item.quantidade,
          ultima: quando,
        });
      }
    }
  }

  return [...porChave.values()]
    .map(({ ultima: _ultima, ...item }) => item)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Filtra pelo texto digitado (sem acento, singular, qualquer parte do nome). */
export function filtrarDespensa(itens: ItemDespensa[], texto: string): ItemDespensa[] {
  const chave = chaveBusca(texto);
  if (!chave) return itens;
  return itens.filter((i) => i.chave.includes(chave));
}

export type SecaoDespensa = { categoria: CategoriaId; data: ItemDespensa[] };

/** Seções por corredor (ordem do usuário). Os que estão acabando vêm numa seção à parte, no topo. */
export function secoesDespensa(
  itens: ItemDespensa[],
  ordem: CategoriaId[] = ORDEM_CATEGORIAS,
): { acabando: ItemDespensa[]; secoes: SecaoDespensa[] } {
  const acabando = itens.filter((i) => i.acabando);
  const secoes = ordem
    .map((categoria) => ({
      categoria,
      data: itens.filter((i) => !i.acabando && (ordem.includes(i.categoria) ? i.categoria : 'outros') === categoria),
    }))
    .filter((s) => s.data.length > 0);
  return { acabando, secoes };
}

/** O que vai para a lista quando o item acaba. */
export function paraImportar(item: ItemDespensa): ItemParaImportar {
  return { nome: item.nome, quantidade: item.quantidade, unidade: item.unidade };
}
