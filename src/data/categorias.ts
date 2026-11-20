import type { Categoria, CategoriaId } from '@/types';

// Categorias padrão (seção 5 do LISTINHA.md).
// corFundo: tom suave do cabeçalho; cor: tom forte da faixa lateral do item e do texto do cabeçalho.
export type CategoriaVisual = Categoria & {
  cor: string;
  corFundo: string;
};

export const CATEGORIAS: Record<CategoriaId, CategoriaVisual> = {
  hortifruti: { id: 'hortifruti', nome: 'Hortifrúti', emoji: '🥬', cor: '#3E9B4F', corFundo: '#E6F4E8' },
  mercearia: { id: 'mercearia', nome: 'Mercearia', emoji: '🍚', cor: '#C08A2E', corFundo: '#FBF1DF' },
  padaria: { id: 'padaria', nome: 'Padaria', emoji: '🍞', cor: '#B5673A', corFundo: '#F8EADF' },
  laticinios: { id: 'laticinios', nome: 'Laticínios e frios', emoji: '🧀', cor: '#C9A400', corFundo: '#FCF6D9' },
  carnes: { id: 'carnes', nome: 'Carnes e ovos', emoji: '🥩', cor: '#C8484B', corFundo: '#FBE5E5' },
  bebidas: { id: 'bebidas', nome: 'Bebidas', emoji: '🥤', cor: '#2F80C9', corFundo: '#E2EFFA' },
  limpeza: { id: 'limpeza', nome: 'Limpeza', emoji: '🧽', cor: '#1E9C9C', corFundo: '#DFF4F3' },
  higiene: { id: 'higiene', nome: 'Higiene pessoal', emoji: '🧴', cor: '#9B59B6', corFundo: '#F2E7F7' },
  congelados: { id: 'congelados', nome: 'Congelados', emoji: '🧊', cor: '#4A90B8', corFundo: '#E4F1F8' },
  pet: { id: 'pet', nome: 'Pet', emoji: '🐾', cor: '#8D6E63', corFundo: '#EFE8E5' },
  outros: { id: 'outros', nome: 'Outros', emoji: '🛒', cor: '#6B7785', corFundo: '#ECEEF1' },
};

// Ordem padrão dos corredores (reordenar pelo usuário é Fase 2).
export const ORDEM_CATEGORIAS: CategoriaId[] = [
  'hortifruti',
  'padaria',
  'mercearia',
  'laticinios',
  'carnes',
  'congelados',
  'bebidas',
  'limpeza',
  'higiene',
  'pet',
  'outros',
];

/**
 * Ordem salva pelo usuário, corrigida: só ids válidos, sem repetição, e as categorias que
 * faltarem entram no fim (na ordem padrão). Assim uma categoria nova nunca some.
 */
export function sanearOrdemCategorias(v: unknown): CategoriaId[] {
  const validas = Array.isArray(v)
    ? v.filter((id): id is CategoriaId => typeof id === 'string' && id in CATEGORIAS)
    : [];
  const unicas = [...new Set(validas)];
  return [...unicas, ...ORDEM_CATEGORIAS.filter((id) => !unicas.includes(id))];
}

/** Sobe (-1) ou desce (+1) uma categoria uma posição. */
export function moverCategoria(ordem: CategoriaId[], id: CategoriaId, direcao: -1 | 1): CategoriaId[] {
  const i = ordem.indexOf(id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= ordem.length) return ordem;
  const nova = [...ordem];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

export function obterCategoria(id: CategoriaId): CategoriaVisual {
  return CATEGORIAS[id] ?? CATEGORIAS.outros;
}
