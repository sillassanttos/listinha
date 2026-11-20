import { AGENTE } from './imagens';
import { normalizar } from './normalizar';

// Fase 3: leitor de código de barras. A câmera (expo-camera) lê o código; aqui ficam as regras:
// validar o código (dígito verificador), consultar o produto no Open Food Facts e montar o nome.
// A consulta usa o endpoint de produto (api/v2/product), sem chave, com o mesmo User-Agent das fotos.

const URL_PRODUTO = 'https://world.openfoodfacts.org/api/v2/product/';
const CAMPOS = 'product_name,product_name_pt,generic_name_pt,brands,quantity,image_front_small_url,image_front_url';
const TEMPO_LIMITE_MS = 8000;

/** Códigos de produto (EAN-8, UPC-A, EAN-13, GTIN-14) com o dígito verificador certo. */
export function codigoValido(codigo: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(codigo)) return false;
  const digitos = codigo.split('').map(Number);
  const verificador = digitos.pop()!;
  // Da direita para a esquerda, pesos 3, 1, 3, 1…
  const soma = digitos.reverse().reduce((total, d, i) => total + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === verificador;
}

/** UPC-A (12) e EAN-13 com zero na frente são o mesmo produto: usa sempre 13 dígitos quando der. */
export function normalizarCodigo(codigo: string): string {
  const limpo = codigo.replace(/\D/g, '');
  return limpo.length === 12 ? `0${limpo}` : limpo;
}

export type ProdutoCodigo = {
  product_name?: string;
  product_name_pt?: string;
  generic_name_pt?: string;
  brands?: string;
  quantity?: string;
  image_front_small_url?: string;
  image_front_url?: string;
};

function limpar(texto: string | undefined): string {
  return (texto ?? '').replace(/\s+/g, ' ').trim();
}

/** Nome para a lista: nome em português (ou o geral) + marca, se a marca ainda não estiver no nome. */
export function nomeDoProduto(p: ProdutoCodigo): string | null {
  const nome = limpar(p.product_name_pt) || limpar(p.product_name) || limpar(p.generic_name_pt);
  if (!nome) return null;
  // Marcas vêm separadas por vírgula ("Nestlé, Moça"); se alguma já está no nome, não repete.
  const marcas = (p.brands ?? '').split(',').map(limpar).filter(Boolean);
  const temMarca = marcas.some((m) => normalizar(nome).includes(normalizar(m)));
  const comMarca = marcas.length && !temMarca ? `${nome} ${marcas[0]}` : nome;
  const final = comMarca.length > 60 ? comMarca.slice(0, 60).replace(/\s+\S*$/, '') : comMarca;
  return final.charAt(0).toUpperCase() + final.slice(1);
}

export function imagemDoProduto(p: ProdutoCodigo): string | undefined {
  const url = p.image_front_small_url ?? p.image_front_url;
  return url && /^https:\/\//.test(url) ? url : undefined;
}

export type ProdutoEncontrado = { nome: string; imagem?: string; quantidade?: string };

export type ResultadoCodigo =
  | { tipo: 'ok'; produto: ProdutoEncontrado }
  | { tipo: 'nao-encontrado' } // o código não está no Open Food Facts (ou está sem nome)
  | { tipo: 'erro' }; // sem internet, servidor fora, tempo esgotado

type Buscador = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/** Procura o produto pelo código. Nunca lança erro. */
export async function buscarProdutoPorCodigo(
  codigo: string,
  buscar: Buscador = fetch as unknown as Buscador,
): Promise<ResultadoCodigo> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await buscar(`${URL_PRODUTO}${encodeURIComponent(codigo)}.json?fields=${CAMPOS}`, {
      headers: { 'User-Agent': AGENTE },
      signal: controle.signal,
    });
    if (resposta.status === 404) return { tipo: 'nao-encontrado' };
    if (!resposta.ok) return { tipo: 'erro' };
    const dados = (await resposta.json()) as { status?: number; product?: ProdutoCodigo };
    if (!dados || dados.status !== 1 || !dados.product) return { tipo: 'nao-encontrado' };
    const nome = nomeDoProduto(dados.product);
    if (!nome) return { tipo: 'nao-encontrado' };
    return {
      tipo: 'ok',
      produto: { nome, imagem: imagemDoProduto(dados.product), quantidade: limpar(dados.product.quantity) || undefined },
    };
  } catch {
    return { tipo: 'erro' };
  } finally {
    clearTimeout(limite);
  }
}

export type ProdutoLembrado = { nome: string; imagem?: string };

/** Leitura segura dos produtos lembrados por código (o que o usuário digitou ou o que veio da internet). */
export function sanearProdutosPorCodigo(v: unknown): Record<string, ProdutoLembrado> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const resultado: Record<string, ProdutoLembrado> = {};
  for (const [codigo, valor] of Object.entries(v)) {
    if (!/^\d{8,14}$/.test(codigo) || typeof valor !== 'object' || valor === null) continue;
    const { nome, imagem } = valor as Record<string, unknown>;
    if (typeof nome !== 'string' || !nome.trim()) continue;
    resultado[codigo] = {
      nome: nome.trim().slice(0, 60),
      imagem: typeof imagem === 'string' && /^https:\/\//.test(imagem) ? imagem : undefined,
    };
  }
  return resultado;
}
