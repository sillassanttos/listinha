import { encontrarProdutoExato } from './categorizar';
import { chaveBusca, normalizar } from './normalizar';

// Imagens online (Fase 2): foto do produto no Open Food Facts para itens fora do catálogo.
// Usa a busca nova (search.openfoodfacts.org): a antiga (cgi/search.pl) devolvia HTTP 503
// já na segunda busca seguida em 19/11/2026. Gratuita, sem chave de API.
// Só o nome do item é enviado. A foto escolhida fica guardada (endereço no store, arquivo no
// cache de disco do expo-image) e o emoji continua aparecendo quando não há foto ou sinal.

const URL_BUSCA = 'https://search.openfoodfacts.org/search';
const AGENTE = 'Listinha/1.0 (app pessoal de lista de compras)';
const TEMPO_LIMITE_MS = 8000;

/** Depois de quanto tempo vale procurar de novo um item que não teve foto. */
export const REBUSCAR_SEM_FOTO_MS = 30 * 86_400_000;

const PALAVRAS_VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'sem', 'para', 'pra', 'o', 'a']);

/** Texto enviado na busca: sem números ("5kg"), sem pontuação e sem símbolos de consulta. */
export function termoBusca(nome: string): string {
  return nome
    .split(/\s+/)
    .filter((p) => !/\d/.test(p)) // "5kg", "2L"
    .join(' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 1)
    .join(' ')
    .trim();
}

/** Palavras que precisam aparecer no nome do produto encontrado. */
function palavrasChave(nome: string): string[] {
  return chaveBusca(nome)
    .split(' ')
    .filter((p) => p.length > 1 && !PALAVRAS_VAZIAS.has(p));
}

export type ProdutoOFF = {
  product_name?: string;
  product_name_pt?: string;
  image_front_small_url?: string;
  image_small_url?: string;
  countries_tags?: string[];
};

/**
 * Escolhe a foto: o produto precisa ter todas as palavras do item no nome (evita "Fita Crackers"
 * para "fita isolante") e ter imagem; produtos vendidos no Brasil têm preferência.
 */
export function escolherImagem(produtos: ProdutoOFF[], nome: string): string | null {
  const chaves = palavrasChave(nome);
  if (chaves.length === 0) return null;

  const candidatos = produtos.filter((p) => {
    const url = p.image_front_small_url ?? p.image_small_url;
    if (!url || !/^https:\/\//.test(url)) return false;
    const palavrasProduto = chaveBusca(`${p.product_name_pt ?? ''} ${p.product_name ?? ''}`).split(' ');
    return chaves.every((c) => palavrasProduto.some((w) => w === c || w.startsWith(c)));
  });

  const doBrasil = candidatos.find((p) => p.countries_tags?.includes('en:brazil'));
  const escolhido = doBrasil ?? candidatos[0];
  return escolhido ? (escolhido.image_front_small_url ?? escolhido.image_small_url ?? null) : null;
}

export type ResultadoBusca =
  | { tipo: 'ok'; uri: string | null } // achou (uri) ou procurou e não tem foto (null)
  | { tipo: 'erro' }; // sem internet, servidor fora, tempo esgotado: tentar de novo depois

type Buscador = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

/** Procura a foto de um item. Nunca lança erro: devolve { tipo: 'erro' } para tentar depois. */
export async function buscarImagemOnline(nome: string, buscar: Buscador = fetch as unknown as Buscador): Promise<ResultadoBusca> {
  const termo = termoBusca(nome);
  if (!termo) return { tipo: 'ok', uri: null };

  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const url =
      `${URL_BUSCA}?page_size=10&langs=pt` +
      '&fields=product_name,product_name_pt,image_front_small_url,image_small_url,countries_tags' +
      `&q=${encodeURIComponent(termo)}`;
    const resposta = await buscar(url, { headers: { 'User-Agent': AGENTE }, signal: controle.signal });
    if (!resposta.ok) return { tipo: 'erro' };
    const dados = (await resposta.json()) as { hits?: ProdutoOFF[] };
    if (!dados || !Array.isArray(dados.hits)) return { tipo: 'erro' };
    return { tipo: 'ok', uri: escolherImagem(dados.hits, nome) };
  } catch {
    return { tipo: 'erro' };
  } finally {
    clearTimeout(limite);
  }
}

/**
 * Fila de buscas: uma de cada vez, com intervalo entre elas para não sobrecarregar o servidor,
 * e sem repetir o mesmo item enquanto ele está na fila.
 */
export function criarFilaDeBusca(
  executar: (nome: string) => Promise<void>,
  intervaloMs = 1500,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  const pendentes = new Map<string, string>(); // chave -> nome
  let rodando = false;

  async function processar() {
    if (rodando) return;
    rodando = true;
    try {
      while (pendentes.size > 0) {
        const [chave, nome] = pendentes.entries().next().value as [string, string];
        try {
          await executar(nome);
        } finally {
          pendentes.delete(chave);
        }
        if (pendentes.size > 0) await esperar(intervaloMs);
      }
    } finally {
      rodando = false;
    }
  }

  return {
    /** Põe o item na fila (ignora se já estiver). */
    adicionar(nome: string) {
      const chave = chaveBusca(nome);
      if (!chave || pendentes.has(chave)) return;
      pendentes.set(chave, nome);
      void processar();
    },
    tamanho: () => pendentes.size,
  };
}

/**
 * Vale buscar foto para este item? Só para itens fora do catálogo de emojis (nome que não é
 * exatamente um produto/sinônimo da base), ainda sem cache ou sem foto há mais de 30 dias.
 */
export function precisaBuscarImagem(
  nome: string,
  cache: Record<string, { uri: string | null; em: number } | undefined>,
  agora = Date.now(),
): boolean {
  if (!termoBusca(nome) || encontrarProdutoExato(nome)) return false;
  const salvo = cache[chaveImagem(nome)];
  if (!salvo) return true;
  return salvo.uri === null && agora - salvo.em > REBUSCAR_SEM_FOTO_MS;
}

/** Chave usada no cache de imagens (mesma regra de comparação de nomes do app). */
export function chaveImagem(nome: string): string {
  return chaveBusca(nome) || normalizar(nome);
}
