import { CATEGORIAS, obterCategoria, sanearOrdemCategorias } from '@/data/categorias';
import type { CategoriaId, ItemLista, Lista, ListaCompartilhada, Unidade } from '@/types';
import { type CategoriasManuais, sanearCategoriasManuais } from '@/utils/categoriasManuais';
import { type ProdutoLembrado, sanearProdutosPorCodigo } from '@/utils/codigoBarras';
import { UNIDADES, passoDaUnidade } from '@/utils/quantidade';

// Leitura segura do que está salvo no celular (AsyncStorage).
// Dados antigos, incompletos ou corrompidos não podem derrubar o app: o que dá para
// aproveitar é corrigido, o que não dá é descartado.

// Versão 2 (Fase 3, várias listas): "listaAtiva" virou "listas" + "listaAtualId".
export const VERSAO_DADOS = 2;

/** Foto encontrada (uri) ou procurada sem sucesso (null), com a data da busca. */
export type ImagemSalva = { uri: string | null; em: number };

/** Fase 3: tema escolhido nas Configurações; "sistema" segue o modo claro/escuro do celular. */
export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';
export const PREFERENCIAS_TEMA: PreferenciaTema[] = ['sistema', 'claro', 'escuro'];

export type DadosSalvos = {
  /** Listas abertas (Fase 3: várias ao mesmo tempo). */
  listas: Lista[];
  /** A lista aberta por último (recebe o que entra de fora dela). */
  listaAtualId: string | null;
  historico: Lista[];
  /** Cache de fotos online por nome normalizado do item (Fase 2). */
  imagens: Record<string, ImagemSalva>;
  /** Configuração: buscar fotos no Open Food Facts. */
  imagensOnline: boolean;
  /** Ordem das categorias (corredores do mercado do usuário). */
  ordemCategorias: CategoriaId[];
  /** Categoria escolhida à mão por item (chave de busca do nome -> categoria). */
  categoriasManuais: CategoriasManuais;
  /** Fase 3: nome e foto por código de barras (lidos da internet ou digitados pelo usuário). */
  produtosPorCodigo: Record<string, ProdutoLembrado>;
  /** Fase 3: modo escuro. */
  tema: PreferenciaTema;
};

function sanearImagens(v: unknown): Record<string, ImagemSalva> {
  if (!ehObjeto(v)) return {};
  const resultado: Record<string, ImagemSalva> = {};
  for (const [chave, valor] of Object.entries(v)) {
    if (!ehObjeto(valor) || typeof valor.em !== 'number') continue;
    const uri = typeof valor.uri === 'string' && /^https:\/\//.test(valor.uri) ? valor.uri : null;
    resultado[chave] = { uri, em: valor.em };
  }
  return resultado;
}

const UNIDADES_VALIDAS = new Set<string>(UNIDADES.map((u) => u.id));

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function numeroOu(v: unknown, padrao: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : padrao;
}

export function sanearItem(v: unknown): ItemLista | null {
  if (!ehObjeto(v) || typeof v.id !== 'string' || typeof v.nome !== 'string' || !v.nome.trim()) return null;
  const categoria: CategoriaId = typeof v.categoria === 'string' && v.categoria in CATEGORIAS ? (v.categoria as CategoriaId) : 'outros';
  const unidade: Unidade = typeof v.unidade === 'string' && UNIDADES_VALIDAS.has(v.unidade) ? (v.unidade as Unidade) : 'un';
  const quantidade = numeroOu(v.quantidade, 0);
  const pego = v.pego === true;
  return {
    id: v.id,
    nome: v.nome,
    categoria,
    emoji: typeof v.emoji === 'string' && v.emoji ? v.emoji : obterCategoria(categoria).emoji,
    imagemUri: typeof v.imagemUri === 'string' ? v.imagemUri : undefined,
    quantidade: quantidade > 0 ? quantidade : Math.max(1, passoDaUnidade(unidade)),
    unidade,
    pego,
    preco: typeof v.preco === 'number' && Number.isFinite(v.preco) ? v.preco : undefined,
    observacao: typeof v.observacao === 'string' && v.observacao.trim() ? v.observacao : undefined,
    criadoEm: numeroOu(v.criadoEm, 0),
    pegoEm: pego && typeof v.pegoEm === 'number' ? v.pegoEm : undefined,
  };
}

function sanearLista(v: unknown): Lista | null {
  if (!ehObjeto(v) || typeof v.id !== 'string') return null;
  const itens = Array.isArray(v.itens) ? v.itens.map(sanearItem).filter((i): i is ItemLista => i !== null) : [];
  return {
    id: v.id,
    nome: typeof v.nome === 'string' && v.nome.trim() ? v.nome : 'Compra da semana',
    itens,
    criadaEm: numeroOu(v.criadaEm, 0),
    finalizadaEm: typeof v.finalizadaEm === 'number' ? v.finalizadaEm : undefined,
    orcamento: typeof v.orcamento === 'number' && Number.isFinite(v.orcamento) && v.orcamento > 0 ? v.orcamento : undefined,
    compartilhada: sanearCompartilhada(v.compartilhada),
  };
}

function sanearCompartilhada(v: unknown): ListaCompartilhada | undefined {
  if (!ehObjeto(v) || typeof v.id !== 'string' || !v.id || typeof v.codigo !== 'string' || !v.codigo) return undefined;
  const ultimaConclusao = typeof v.ultimaConclusao === 'number' && v.ultimaConclusao > 0 ? v.ultimaConclusao : undefined;
  return { id: v.id, codigo: v.codigo, ultimaConclusao };
}

/** Converte o que veio do armazenamento (qualquer coisa) em dados válidos para o app. */
export function sanearDados(salvo: unknown): DadosSalvos {
  if (!ehObjeto(salvo)) {
    return { listas: [], listaAtualId: null, historico: [], imagens: {}, imagensOnline: true,
      ordemCategorias: sanearOrdemCategorias(undefined),
      categoriasManuais: {},
      produtosPorCodigo: {},
      tema: 'sistema',
    };
  }
  // Aceita também o formato antigo (uma "listaAtiva"), caso chegue sem passar pela migração.
  const brutas: unknown[] = Array.isArray(salvo.listas) ? salvo.listas : salvo.listaAtiva ? [salvo.listaAtiva] : [];
  const ids = new Set<string>();
  const abertas: Lista[] = [];
  const finalizadas: Lista[] = [];
  for (const bruta of brutas) {
    const lista = sanearLista(bruta);
    if (!lista || ids.has(lista.id)) continue; // lixo ou id repetido
    ids.add(lista.id);
    // Uma lista aberta marcada como finalizada (dado inconsistente) vai para o histórico.
    (lista.finalizadaEm ? finalizadas : abertas).push(lista);
  }
  const historico = Array.isArray(salvo.historico)
    ? salvo.historico.map(sanearLista).filter((l): l is Lista => l !== null)
    : [];
  const atualId = typeof salvo.listaAtualId === 'string' ? salvo.listaAtualId : null;
  return {
    listas: abertas,
    listaAtualId: abertas.some((l) => l.id === atualId) ? atualId : (abertas[0]?.id ?? null),
    historico: [...finalizadas, ...historico],
    imagens: sanearImagens(salvo.imagens),
    imagensOnline: salvo.imagensOnline !== false, // ligado por padrão
    ordemCategorias: sanearOrdemCategorias(salvo.ordemCategorias),
    categoriasManuais: sanearCategoriasManuais(salvo.categoriasManuais),
    produtosPorCodigo: sanearProdutosPorCodigo(salvo.produtosPorCodigo),
    tema: PREFERENCIAS_TEMA.includes(salvo.tema as PreferenciaTema) ? (salvo.tema as PreferenciaTema) : 'sistema',
  };
}

/**
 * Migra dados de versões anteriores para a atual, passo a passo, e saneia o resultado.
 * 1 -> 2: a única "listaAtiva" vira a primeira (e atual) das "listas".
 */
export function migrarDados(salvo: unknown, versao: number): DadosSalvos {
  let dados = salvo;
  if (versao < 2 && ehObjeto(dados)) {
    const { listaAtiva, ...resto } = dados;
    const id = ehObjeto(listaAtiva) && typeof listaAtiva.id === 'string' ? listaAtiva.id : null;
    dados = { ...resto, listas: listaAtiva ? [listaAtiva] : [], listaAtualId: id };
  }
  return sanearDados(dados);
}
