import { obterCategoria } from '@/data/categorias';
import { PRODUTOS } from '@/data/produtos';
import type { CategoriaId, ProdutoBase, Unidade } from '@/types';

import { chaveBusca } from './normalizar';

// Encontra o produto e a categoria a partir do nome digitado (seção 5 do LISTINHA.md).
// A comparação usa chaveBusca: sem acento, minúsculas, singular simples, sem números.

type Termo = { chave: string; produto: ProdutoBase; ehNome: boolean };

// Todos os nomes e sinônimos, já em formato de chave. Montado uma vez só.
const TERMOS: Termo[] = PRODUTOS.flatMap((produto) => [
  { chave: chaveBusca(produto.nome), produto, ehNome: true },
  ...(produto.sinonimos ?? []).map((s) => ({ chave: chaveBusca(s), produto, ehNome: false })),
]).filter((t) => t.chave.length > 0);

const POR_CHAVE = new Map<string, ProdutoBase>();
for (const termo of TERMOS) {
  if (!POR_CHAVE.has(termo.chave)) POR_CHAVE.set(termo.chave, termo.produto);
}

/** Posição do termo no texto como palavras inteiras, ou -1. */
function posicaoPalavras(texto: string, termo: string): number {
  return ` ${texto} `.indexOf(` ${termo} `);
}

/**
 * Procura o produto da base que corresponde ao nome digitado.
 * 1. Nome ou sinônimo igual ("Limões" -> Limão; "aipim" -> Mandioca).
 * 2. Nome ou sinônimo contido no texto, palavra inteira; vence o termo mais longo
 *    ("arroz tio joão 5kg" -> Arroz; "pão de forma integral" -> Pão de forma).
 *    No empate, vence o que aparece antes, que em português costuma ser o principal
 *    ("ração do peixe" -> Ração, não Peixe).
 */
export function encontrarProduto(nome: string): ProdutoBase | undefined {
  const chave = chaveBusca(nome);
  if (!chave) return undefined;

  const exato = POR_CHAVE.get(chave);
  if (exato) return exato;
  return encontrarPorTrecho(chave);
}

/** Produto cujo nome ou sinônimo é exatamente o texto ("limões", "aipim"). */
export function encontrarProdutoExato(nome: string): ProdutoBase | undefined {
  const chave = chaveBusca(nome);
  return chave ? POR_CHAVE.get(chave) : undefined;
}

function encontrarPorTrecho(chave: string): ProdutoBase | undefined {
  let melhor: { termo: Termo; pos: number } | undefined;
  for (const termo of TERMOS) {
    const pos = posicaoPalavras(chave, termo.chave);
    if (pos < 0) continue;
    const maisLongo = !melhor || termo.chave.length > melhor.termo.chave.length;
    const empataEAntes = !!melhor && termo.chave.length === melhor.termo.chave.length && pos < melhor.pos;
    if (maisLongo || empataEAntes) melhor = { termo, pos };
  }
  return melhor?.termo.produto;
}

export type Categorizacao = {
  produto?: ProdutoBase;
  /** true quando o nome digitado é o próprio nome ou sinônimo do produto (não só contém). */
  exato?: boolean;
  categoria: CategoriaId;
  emoji: string;
  unidade: Unidade;
};

/** Categoria, emoji e unidade sugeridos para um nome. Sem produto conhecido, vai para "Outros". */
export function categorizar(nome: string): Categorizacao {
  const produto = encontrarProduto(nome);
  if (produto) {
    const exato = encontrarProdutoExato(nome) === produto;
    return { produto, exato, categoria: produto.categoria, emoji: produto.emoji, unidade: produto.unidadePadrao ?? 'un' };
  }
  return { categoria: 'outros', emoji: obterCategoria('outros').emoji, unidade: 'un' };
}

/**
 * Sugestões para o autocompletar, da mais para a menos provável:
 * nome igual > nome começa com o texto > sinônimo começa com o texto > alguma palavra começa com o texto.
 */
export function buscarProdutos(texto: string, limite = 8): ProdutoBase[] {
  const chave = chaveBusca(texto);
  if (!chave) return [];

  const pontos = new Map<ProdutoBase, number>();
  for (const termo of TERMOS) {
    let p = 0;
    if (termo.chave === chave) p = termo.ehNome ? 100 : 90;
    else if (termo.chave.startsWith(chave)) p = termo.ehNome ? 80 : 60;
    else if (termo.chave.split(' ').some((palavra) => palavra.startsWith(chave))) p = termo.ehNome ? 50 : 30;
    if (p > (pontos.get(termo.produto) ?? 0)) pontos.set(termo.produto, p);
  }

  return [...pontos.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].nome.localeCompare(b[0].nome, 'pt-BR'))
    .slice(0, limite)
    .map(([produto]) => produto);
}
