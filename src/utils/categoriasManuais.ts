import { CATEGORIAS, obterCategoria } from '@/data/categorias';
import type { CategoriaId, ItemLista } from '@/types';

import { categorizar } from './categorizar';
import { chaveBusca } from './normalizar';

// Fase 2: "Lembrar a categoria escolhida manualmente para cada item".
// Quando o usuário troca a categoria de um item na tela de edição, guardamos nome -> categoria
// (pela chave de busca, então "Ração do peixe" e "ração do peixes" são o mesmo item).
// Da próxima vez que esse item entrar na lista (digitado, importado, repetido), ele já vem nessa categoria.
// Só guardamos o que difere da categoria automática: escolher de volta a automática esquece.

export type CategoriasManuais = Record<string, CategoriaId>;

/** Categoria e emoji que um nome deve ter, considerando o que o usuário já escolheu. */
export function categoriaSugerida(
  nome: string,
  manuais: CategoriasManuais,
): { categoria: CategoriaId; emoji: string; lembrada: boolean } {
  const auto = categorizar(nome);
  const lembrada = manuais[chaveBusca(nome)];
  if (!lembrada || lembrada === auto.categoria) return { categoria: auto.categoria, emoji: auto.emoji, lembrada: false };
  // Produto do catálogo mantém o emoji dele; item livre usa o emoji da categoria escolhida.
  return { categoria: lembrada, emoji: auto.produto ? auto.emoji : obterCategoria(lembrada).emoji, lembrada: true };
}

/** Guarda (ou esquece, se for a automática) a categoria escolhida para um nome. Devolve o mesmo objeto se nada mudou. */
export function lembrarCategoria(manuais: CategoriasManuais, nome: string, categoria: CategoriaId): CategoriasManuais {
  const chave = chaveBusca(nome);
  if (!chave) return manuais;
  if (categoria === categorizar(nome).categoria) {
    if (!(chave in manuais)) return manuais;
    const { [chave]: _esquecida, ...resto } = manuais;
    return resto;
  }
  if (manuais[chave] === categoria) return manuais;
  return { ...manuais, [chave]: categoria };
}

/** Aplica a categoria lembrada a um item (item novo, importado ou repetido). */
export function aplicarCategoriaManual(item: ItemLista, manuais: CategoriasManuais): ItemLista {
  const lembrada = manuais[chaveBusca(item.nome)];
  if (!lembrada || lembrada === item.categoria) return item;
  return { ...item, categoria: lembrada, emoji: categoriaSugerida(item.nome, manuais).emoji };
}

/** Leitura segura do que está salvo: só chaves de texto com categoria válida. */
export function sanearCategoriasManuais(v: unknown): CategoriasManuais {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const resultado: CategoriasManuais = {};
  for (const [chave, valor] of Object.entries(v)) {
    if (chave.trim() && typeof valor === 'string' && valor in CATEGORIAS) resultado[chave] = valor as CategoriaId;
  }
  return resultado;
}
