// Tema visual do Listinha (seção 11 do LISTINHA.md): limpo, amigável, colorido sem exagero.
// As cores de cada categoria ficam em src/data/categorias.ts.
// Fase 3: modo escuro. As telas não importam as cores direto daqui: usam useCores() e
// criarEstilos() de '@/theme/useCores', que escolhem a paleta clara ou escura na hora.

import type { CategoriaVisual } from '@/data/categorias';

export type Esquema = 'claro' | 'escuro';

export type Cores = {
  esquema: Esquema;
  primaria: string;
  primariaEscura: string;
  primariaClara: string;
  destaque: string;
  perigo: string;
  fundo: string;
  superficie: string;
  borda: string;
  texto: string;
  textoSecundario: string;
  textoSuave: string;
  textoSobrePrimaria: string;
  /** Texto em cima da cor forte de uma categoria (contador, chip escolhido). */
  textoSobreCor: string;
  /** Cartões de lembrete ("Pode estar acabando"). */
  avisoFundo: string;
  avisoTexto: string;
  sombra: string;
};

export const coresClaras: Cores = {
  esquema: 'claro',
  primaria: '#2E9E5B', // verde "feira"
  primariaEscura: '#1F7A44', // verde de ícones e textos de destaque
  primariaClara: '#E3F5EA',
  destaque: '#F5A623', // laranja para progresso e avisos leves
  perigo: '#D9534F',

  fundo: '#F7F8FA',
  superficie: '#FFFFFF',
  borda: '#E6E8EC',

  texto: '#1E2329',
  textoSecundario: '#5F6B7A',
  textoSuave: '#98A2B0',
  textoSobrePrimaria: '#FFFFFF',
  textoSobreCor: '#FFFFFF',

  avisoFundo: '#FFF4E3',
  avisoTexto: '#9A6200',

  sombra: '#000000',
};

// Mesmo verde nos botões (o branco continua legível em cima); nos ícones e textos de destaque
// o verde fica mais claro, para aparecer sobre o fundo escuro.
export const coresEscuras: Cores = {
  esquema: 'escuro',
  primaria: '#2E9E5B',
  primariaEscura: '#6CD195',
  primariaClara: '#183324',
  destaque: '#F5A623',
  perigo: '#F06A64',

  fundo: '#111418',
  superficie: '#1C2026',
  borda: '#2E343C',

  texto: '#E9ECEF',
  textoSecundario: '#A7B0BC',
  textoSuave: '#77818E',
  textoSobrePrimaria: '#FFFFFF',
  textoSobreCor: '#111418',

  avisoFundo: '#33280F',
  avisoTexto: '#F2C46D',

  sombra: '#000000',
};

export function esquemaEfetivo(preferencia: 'sistema' | Esquema, sistema: string | null | undefined): Esquema {
  if (preferencia !== 'sistema') return preferencia;
  return sistema === 'dark' ? 'escuro' : 'claro';
}

export function coresDo(esquema: Esquema): Cores {
  return esquema === 'escuro' ? coresEscuras : coresClaras;
}

/** Clareia uma cor #RRGGBB misturando com branco (0 = igual, 1 = branco). */
export function clarear(hex: string, quanto: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const canal = (c: number) => Math.round(c + (255 - c) * quanto).toString(16).padStart(2, '0');
  return '#' + canal((n >> 16) & 255) + canal((n >> 8) & 255) + canal(n & 255);
}

/**
 * Cores de uma categoria no tema atual. No escuro, o tom forte fica mais claro (para ler sobre o
 * fundo escuro) e o fundo suave vira o próprio tom com transparência.
 */
export function categoriaNoTema(c: CategoriaVisual, cores: Cores): CategoriaVisual {
  if (cores.esquema === 'claro') return c;
  const cor = clarear(c.cor, 0.3);
  return { ...c, cor, corFundo: cor + '2B' };
}

export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const raio = {
  sm: 8,
  md: 12,
  lg: 16,
  pilula: 999,
} as const;

export const fonte = {
  tamanho: {
    pequeno: 13,
    normal: 16,
    medio: 18,
    grande: 22,
    titulo: 28,
    emoji: 30, // emoji do item: 28–32 px
  },
  peso: {
    normal: '400',
    medio: '500',
    negrito: '700',
  },
} as const;

// Medidas de usabilidade.
export const toqueMinimo = 48; // altura mínima de áreas de toque
export const duracaoAnimacao = 200; // ms (150–250)

export const sombraCartao = {
  shadowColor: '#000000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
