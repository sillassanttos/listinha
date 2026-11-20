import { ORDEM_CATEGORIAS, obterCategoria } from '@/data/categorias';
import type { CategoriaId, Lista } from '@/types';

import { agruparPorCategoria } from './agrupar';
import { formatarQuantidadeUnidade } from './quantidade';

/**
 * Texto da lista para mandar no WhatsApp (formato da seção 11 do LISTINHA.md):
 *
 *   🛒 Listinha — Compra da semana
 *
 *   🍚 Mercearia
 *   • Arroz — 5 kg (integral)
 *
 * Só entram os itens que faltam pegar; os já pegos aparecem numa linha no fim.
 */
export function gerarTextoLista(lista: Lista, ordem: CategoriaId[] = ORDEM_CATEGORIAS): string {
  const linhas: string[] = [`🛒 Listinha — ${lista.nome}`];
  const faltam = lista.itens.filter((i) => !i.pego);
  const pegos = lista.itens.filter((i) => i.pego);

  if (faltam.length === 0) {
    linhas.push('', pegos.length ? 'Tudo já está no carrinho ✅' : 'A lista está vazia por enquanto.');
  }

  for (const grupo of agruparPorCategoria(faltam, ordem)) {
    const categoria = obterCategoria(grupo.categoria);
    linhas.push('', `${categoria.emoji} ${categoria.nome}`);
    for (const item of grupo.itens) {
      const obs = item.observacao ? ` (${item.observacao})` : '';
      linhas.push(`• ${item.nome} — ${formatarQuantidadeUnidade(item.quantidade, item.unidade)}${obs}`);
    }
  }

  if (pegos.length > 0 && faltam.length > 0) {
    linhas.push('', `✅ Já no carrinho: ${pegos.map((i) => i.nome).join(', ')}`);
  }

  return linhas.join('\n');
}
