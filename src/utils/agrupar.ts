import { ORDEM_CATEGORIAS } from '@/data/categorias';
import type { CategoriaId, ItemLista } from '@/types';

export type SecaoMercado =
  | { tipo: 'categoria'; categoria: CategoriaId; data: ItemLista[] }
  | { tipo: 'carrinho'; data: ItemLista[] };

/**
 * Seções do Modo Mercado: o que falta pegar, agrupado por corredor, e no fim
 * a seção "No carrinho" com os já pegos (o último pego primeiro).
 */
export function secoesMercado(itens: ItemLista[], ordem: CategoriaId[] = ORDEM_CATEGORIAS): SecaoMercado[] {
  const faltam = agruparPorCategoria(
    itens.filter((i) => !i.pego),
    ordem,
  ).map((g): SecaoMercado => ({ tipo: 'categoria', categoria: g.categoria, data: g.itens }));
  const pegos = itens.filter((i) => i.pego).sort((a, b) => (b.pegoEm ?? 0) - (a.pegoEm ?? 0));
  return pegos.length ? [...faltam, { tipo: 'carrinho', data: pegos }] : faltam;
}

export type GrupoCategoria = {
  categoria: CategoriaId;
  itens: ItemLista[];
};

/**
 * Agrupa os itens por categoria, na ordem dos corredores, sem grupos vazios.
 * Dentro do grupo os itens ficam na ordem em que foram adicionados.
 * Categoria desconhecida (dado antigo ou corrompido) cai em "Outros".
 */
export function agruparPorCategoria(itens: ItemLista[], ordem: CategoriaId[] = ORDEM_CATEGORIAS): GrupoCategoria[] {
  const porCategoria = new Map<CategoriaId, ItemLista[]>();
  for (const item of itens) {
    const categoria = ordem.includes(item.categoria) ? item.categoria : 'outros';
    const grupo = porCategoria.get(categoria) ?? [];
    grupo.push(item);
    porCategoria.set(categoria, grupo);
  }

  return ordem
    .filter((c) => porCategoria.has(c))
    .map((categoria) => ({
      categoria,
      itens: [...(porCategoria.get(categoria) ?? [])].sort((a, b) => a.criadoEm - b.criadoEm),
    }));
}
