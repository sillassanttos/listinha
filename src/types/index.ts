// Tipos do domínio do Listinha (seção 7 do LISTINHA.md).

export type CategoriaId =
  | 'hortifruti'
  | 'mercearia'
  | 'padaria'
  | 'laticinios'
  | 'carnes'
  | 'bebidas'
  | 'limpeza'
  | 'higiene'
  | 'congelados'
  | 'pet'
  | 'outros';

export type Unidade = 'un' | 'kg' | 'g' | 'L' | 'ml' | 'dz' | 'pct' | 'cx';

export type Categoria = {
  id: CategoriaId;
  nome: string;
  emoji: string;
};

export type ProdutoBase = {
  id: string;
  nome: string;
  sinonimos?: string[];
  categoria: CategoriaId;
  emoji: string;
  unidadePadrao?: Unidade;
};

export type ItemLista = {
  id: string;
  nome: string;
  categoria: CategoriaId;
  emoji: string;
  imagemUri?: string; // cache local (Fase 2)
  quantidade: number; // padrão 1
  unidade: Unidade; // padrão "un"
  pego: boolean; // marcado no mercado
  preco?: number; // Fase 2
  observacao?: string;
  criadoEm: number;
  pegoEm?: number;
};

export type Lista = {
  id: string;
  nome: string;
  itens: ItemLista[];
  criadaEm: number;
  finalizadaEm?: number;
  /** Limite de gasto desta compra, em reais (Fase 2, opcional). */
  orcamento?: number;
};

export type HistoricoItem = {
  nomeNormalizado: string;
  vezesComprado: number;
  ultimaCompra: number;
  categoriaPreferida?: CategoriaId;
  ultimoPreco?: number;
};
