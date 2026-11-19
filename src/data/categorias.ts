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

export function obterCategoria(id: CategoriaId): CategoriaVisual {
  return CATEGORIAS[id] ?? CATEGORIAS.outros;
}
