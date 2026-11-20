import { PRODUTOS } from '@/data/produtos';

import { chaveBusca, normalizar } from './normalizar';

// "Ditar a lista" (Fase 3): o ditado do teclado (microfone do Gboard) costuma vir sem vírgula:
// "sabão em pó feijão café maçã". Aqui o texto é separado em itens usando o catálogo:
// cada nome ou sinônimo conhecido começa um item; palavras que o catálogo não conhece ficam
// com o item anterior ("arroz integral", "café pilão"); "e" separa; "de/com/sem…" seguido de
// produto continua o item ("suco de laranja"); quantidade falada começa o item seguinte
// ("dois quilos de arroz"). Tudo no celular, sem internet.

// Termos do catálogo por chave (palavras no singular), com o tamanho em palavras.
const TERMOS = new Map<string, string>(); // chave -> id do produto
let MAIOR_TERMO = 1;
for (const p of PRODUTOS) {
  for (const nome of [p.nome, ...(p.sinonimos ?? [])]) {
    const chave = chaveBusca(nome);
    if (!chave || TERMOS.has(chave)) continue;
    TERMOS.set(chave, p.id);
    MAIOR_TERMO = Math.max(MAIOR_TERMO, chave.split(' ').length);
  }
}

const NUMEROS_FALADOS: Record<string, string> = {
  um: '1', uma: '1', dois: '2', duas: '2', tres: '3', quatro: '4', cinco: '5', seis: '6',
  sete: '7', oito: '8', nove: '9', dez: '10', onze: '11', doze: '12', quinze: '15', vinte: '20',
};
const UNIDADES = new Set([
  'un', 'und', 'unid', 'unidade', 'unidades', 'kg', 'kgs', 'quilo', 'quilos', 'kilo', 'kilos',
  'g', 'gr', 'grama', 'gramas', 'l', 'lt', 'litro', 'litros', 'ml', 'duzia', 'duzias', 'dz',
  'pct', 'pacote', 'pacotes', 'cx', 'caixa', 'caixas',
]);
// Ligam o que vem depois ao item atual ("suco de laranja", "pão com gergelim").
const LIGACOES = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'sem', 'em', 'para', 'pra']);
// Palavras de conversa que não fazem parte do nome quando abrem um item.
const ENCHIMENTO = new Set([
  'tambem', 'preciso', 'precisa', 'comprar', 'compra', 'pegar', 'pega', 'traz', 'trazer',
  'mais', 'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'lembrar', 'falta', 'faltou', 'acabou',
]);

type Palavra = { texto: string; chave: string; norm: string };

function ehNumero(p: Palavra): boolean {
  return /^x?\d+([.,]\d+)?[a-z]*$/i.test(p.texto);
}

/** Converte "dois quilos" em "2 quilos" e "meio quilo" em "0,5 quilo" (só antes de unidade). */
function numerosFalados(palavras: string[]): string[] {
  return palavras.map((p, i) => {
    const n = normalizar(p);
    const seguinte = normalizar(palavras[i + 1] ?? '');
    if ((n === 'meio' || n === 'meia') && UNIDADES.has(seguinte)) return '0,5';
    // "um/uma" só vira número antes de unidade ("uma dúzia de ovos"); senão é artigo.
    if ((n === 'um' || n === 'uma') && !UNIDADES.has(seguinte)) return p;
    return NUMEROS_FALADOS[n] ?? p;
  });
}

/** Termo do catálogo mais longo que começa na palavra i: quantas palavras ocupa (0 = nenhum). */
function termoEm(palavras: Palavra[], i: number): number {
  for (let tam = Math.min(MAIOR_TERMO, palavras.length - i); tam >= 1; tam--) {
    const chave = palavras
      .slice(i, i + tam)
      .map((p) => p.chave)
      .join(' ');
    if (chave && TERMOS.has(chave)) return tam;
  }
  return 0;
}

/**
 * Separa um trecho ditado em itens. Devolve o próprio trecho (numa lista de um) quando não há
 * pelo menos dois produtos conhecidos ou quando o texto tem sinais que não são de ditado
 * (parênteses, travessão, marcadores), para não estragar listas escritas.
 */
export function separarDitado(trecho: string): string[] {
  const limpo = trecho.trim();
  if (!limpo) return [];
  if (/[()[\]—–•*:]/.test(limpo)) return [limpo];

  const palavras: Palavra[] = numerosFalados(limpo.split(/\s+/)).map((texto) => ({
    texto,
    norm: normalizar(texto),
    chave: chaveBusca(texto),
  }));

  type Item = { palavras: string[]; temProduto: boolean; produtos: Set<string>; soQuantidade: boolean };
  const itens: Item[] = [];
  const novo = (): Item => {
    const item: Item = { palavras: [], temProduto: false, produtos: new Set(), soQuantidade: true };
    itens.push(item);
    return item;
  };
  let atual: Item | null = null;
  let anteriorLiga = false; // a palavra anterior foi "de", "com"…
  let produtosNoTexto = 0;

  for (let i = 0; i < palavras.length; ) {
    const p = palavras[i];

    if (p.norm === 'e') {
      atual = null; // "arroz e feijão"
      anteriorLiga = false;
      i++;
      continue;
    }

    if (ehNumero(p)) {
      // Quantidade abre o item seguinte, a não ser que o atual ainda seja só quantidade.
      if (!atual || !atual.soQuantidade) atual = novo();
      atual.palavras.push(p.texto);
      // unidade e "de" logo depois fazem parte da quantidade ("2 kg de arroz")
      i++;
      while (i < palavras.length && UNIDADES.has(palavras[i].norm)) {
        atual.palavras.push(palavras[i].texto);
        i++;
      }
      if (i < palavras.length && palavras[i].norm === 'de') {
        atual.palavras.push(palavras[i].texto);
        i++;
      }
      anteriorLiga = false;
      continue;
    }

    const tam = termoEm(palavras, i);
    if (tam > 0) {
      const id = TERMOS.get(
        palavras
          .slice(i, i + tam)
          .map((x) => x.chave)
          .join(' '),
      )!;
      produtosNoTexto++;
      // Produto conhecido começa um item novo, menos quando continua o atual:
      // depois de "de/com…" ("suco de laranja"), depois de só quantidade ("2 kg de arroz")
      // ou quando é o mesmo produto ("sabão em pó omo").
      const continua = atual && (anteriorLiga || !atual.temProduto || atual.produtos.has(id));
      if (!continua) atual = novo();
      const item: Item = atual ?? novo();
      atual = item;
      item.palavras.push(...palavras.slice(i, i + tam).map((x) => x.texto));
      item.temProduto = true;
      item.soQuantidade = false;
      item.produtos.add(id);
      anteriorLiga = false;
      i += tam;
      continue;
    }

    // Palavra que o catálogo não conhece: fica com o item atual (marca, tipo, tamanho…).
    if (!atual) {
      if (ENCHIMENTO.has(p.norm)) {
        i++;
        continue;
      }
      atual = novo();
    } else if (ENCHIMENTO.has(p.norm) && (atual.palavras.length === 0 || atual.temProduto)) {
      // "arroz também um café": a palavra de conversa fecha o item e some.
      if (atual.temProduto) atual = null;
      anteriorLiga = false;
      i++;
      continue;
    }
    atual.palavras.push(p.texto);
    if (!LIGACOES.has(p.norm)) atual.soQuantidade = false;
    anteriorLiga = LIGACOES.has(p.norm);
    i++;
  }

  if (produtosNoTexto < 2) return [limpo];

  // Quantidade sobrando no fim ("arroz feijão 2") volta para o item anterior.
  const resultado: string[] = [];
  for (const item of itens) {
    const texto = item.palavras.join(' ').replace(/\s+(de|do|da|com|sem|em|para|pra)$/i, '').trim();
    if (!texto) continue;
    if (!item.temProduto && item.soQuantidade && resultado.length > 0) {
      resultado[resultado.length - 1] += ' ' + texto;
      continue;
    }
    resultado.push(texto);
  }
  return resultado;
}
