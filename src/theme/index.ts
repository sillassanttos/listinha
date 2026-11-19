// Tema visual do Listinha (seção 11 do LISTINHA.md): limpo, amigável, colorido sem exagero.
// As cores de cada categoria ficam em src/data/categorias.ts.

export const cores = {
  primaria: '#2E9E5B', // verde "feira"
  primariaEscura: '#1F7A44',
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

  sombra: '#000000',
} as const;

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
  shadowColor: cores.sombra,
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

export const tema = { cores, espaco, raio, fonte, toqueMinimo, duracaoAnimacao, sombraCartao };
export default tema;
