import { CATEGORIAS, obterCategoria } from '@/data/categorias';
import type { CategoriaId, ItemLista, Lista, Unidade } from '@/types';
import { UNIDADES, passoDaUnidade } from '@/utils/quantidade';

// Leitura segura do que está salvo no celular (AsyncStorage).
// Dados antigos, incompletos ou corrompidos não podem derrubar o app: o que dá para
// aproveitar é corrigido, o que não dá é descartado.

export const VERSAO_DADOS = 1;

export type DadosSalvos = { listaAtiva: Lista | null; historico: Lista[] };

const UNIDADES_VALIDAS = new Set<string>(UNIDADES.map((u) => u.id));

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function numeroOu(v: unknown, padrao: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : padrao;
}

function sanearItem(v: unknown): ItemLista | null {
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
  };
}

/** Converte o que veio do armazenamento (qualquer coisa) em dados válidos para o app. */
export function sanearDados(salvo: unknown): DadosSalvos {
  if (!ehObjeto(salvo)) return { listaAtiva: null, historico: [] };
  const ativa = sanearLista(salvo.listaAtiva);
  const historico = Array.isArray(salvo.historico)
    ? salvo.historico.map(sanearLista).filter((l): l is Lista => l !== null)
    : [];
  return {
    // Uma lista ativa marcada como finalizada (dado inconsistente) vai para o histórico.
    listaAtiva: ativa && !ativa.finalizadaEm ? ativa : null,
    historico: ativa?.finalizadaEm ? [ativa, ...historico] : historico,
  };
}

/**
 * Migra dados de versões anteriores para a atual. Hoje só existe a versão 1;
 * quando o formato mudar, cada passo de versão entra aqui.
 */
export function migrarDados(salvo: unknown, _versao: number): DadosSalvos {
  return sanearDados(salvo);
}
