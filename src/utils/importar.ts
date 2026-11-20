import { CATEGORIAS } from '@/data/categorias';
import type { Unidade } from '@/types';

import { separarDitado } from './ditado';
import { chaveBusca, normalizar } from './normalizar';

// "Importar do WhatsApp" (Fase 2): transforma um texto colado em itens.
// Um item por linha (vírgula e ponto e vírgula também separam), sem marcadores
// ("-", "•", "*", "1.", "[ ]"…), sem o cabeçalho de mensagens exportadas
// ("[19/11 10:32] Fulano:") e entendendo quantidades como "2 kg arroz", "leite x3",
// "arroz 5kg" e o formato que o próprio Listinha compartilha ("• Arroz — 5 kg (integral)").

export type ItemImportado = {
  nome: string;
  quantidade?: number;
  unidade?: Unidade;
  observacao?: string;
};

const UNIDADES_TEXTO: Record<string, Unidade> = {
  un: 'un', und: 'un', unid: 'un', unidade: 'un', unidades: 'un',
  kg: 'kg', kgs: 'kg', quilo: 'kg', quilos: 'kg', kilo: 'kg', kilos: 'kg',
  g: 'g', gr: 'g', grs: 'g', grama: 'g', gramas: 'g',
  l: 'L', lt: 'L', lts: 'L', litro: 'L', litros: 'L',
  ml: 'ml',
  dz: 'dz', duzia: 'dz', duzias: 'dz',
  pct: 'pct', pcts: 'pct', pc: 'pct', pacote: 'pct', pacotes: 'pct',
  cx: 'cx', cxs: 'cx', caixa: 'cx', caixas: 'cx',
};

function unidadeDe(texto: string | undefined): Unidade | undefined {
  return texto ? UNIDADES_TEXTO[normalizar(texto).replace(/\s/g, '')] : undefined;
}

function numero(texto: string): number {
  return Number(texto.replace(',', '.'));
}

const NUM = '(\\d+(?:[.,]\\d+)?)';
const UNI = '([a-zA-ZçÇúÚ]{1,8})';

// Linhas que são do próprio formato de compartilhar do Listinha ou cabeçalhos sem item.
const CABECALHOS_CATEGORIA = new Set(Object.values(CATEGORIAS).map((c) => normalizar(c.nome)));

function limparMarcadores(linha: string): string {
  return linha
    .replace(/^\s*\[[^\]]*\d{1,2}:\d{2}[^\]]*\]\s*[^:]{1,40}:\s*/, '') // [19/11/2026 10:32] Fulano:
    .replace(/^\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?,?\s+\d{1,2}:\d{2}\s*-\s*[^:]{1,40}:\s*/, '') // 19/11/2026 10:32 - Fulano:
    .replace(/^\s*(?:\[\s?[xX✓]?\s?\]|[-–—•*·▪►✔✅☐☑️+>]+|\d{1,3}\s*[.)º°]|\d{1,3}\s+-)\s*/u, '') // marcadores
    .replace(/[✅☑️✔]/gu, '')
    .trim();
}

/** Interpreta uma linha já sem marcadores. Devolve null se não sobrar nome. */
export function interpretarLinha(bruta: string): ItemImportado | null {
  let texto = limparMarcadores(bruta);
  if (!texto) return null;

  let observacao: string | undefined;
  const parenteses = texto.match(/\(([^)]+)\)\s*$/);
  if (parenteses) {
    observacao = parenteses[1].trim();
    texto = texto.slice(0, parenteses.index).trim();
  }

  let quantidade: number | undefined;
  let unidade: Unidade | undefined;
  let m: RegExpMatchArray | null;

  if ((m = texto.match(new RegExp(`^(.+?)\\s+[—–-]\\s*${NUM}\\s*${UNI}?$`)))) {
    // "Arroz — 5 kg" (formato do Listinha) / "arroz - 2"
    texto = m[1];
    quantidade = numero(m[2]);
    unidade = unidadeDe(m[3]);
  } else if ((m = texto.match(new RegExp(`^${NUM}\\s*(?:x\\s*)?${UNI}?\\s+(?:de\\s+)?(.+)$`, 'i')))) {
    // "2 kg de arroz", "3 leite", "3x leite", "2kg arroz"
    const u = unidadeDe(m[2]);
    if (m[2] && !u) {
      // "2 limões": a "unidade" era a primeira palavra do nome
      texto = `${m[2]} ${m[3]}`;
    } else {
      texto = m[3];
      unidade = u;
    }
    quantidade = numero(m[1]);
  } else if ((m = texto.match(new RegExp(`^(.+?)\\s+(?:x\\s*)?${NUM}\\s*${UNI}?$`, 'i')))) {
    // "arroz 5kg", "leite x3", "ovos 2 dz"
    const u = unidadeDe(m[3]);
    if (!m[3] || u) {
      texto = m[1];
      quantidade = numero(m[2]);
      unidade = u;
    }
  }

  const nome = texto.replace(/\s+/g, ' ').replace(/[:;,.\s]+$/, '').trim();
  if (!nome || !/[a-zA-ZÀ-ÿ]/.test(nome)) return null;
  if (quantidade !== undefined && !(quantidade > 0)) quantidade = undefined;

  return { nome, quantidade, unidade, observacao };
}

function ehCabecalho(linha: string): boolean {
  const n = normalizar(linha);
  if (!n) return true;
  if (n.startsWith('listinha ')) return true; // "🛒 Listinha — Compra da semana"
  if (n.startsWith('ja no carrinho')) return true; // "✅ Já no carrinho: ..."
  if (CABECALHOS_CATEGORIA.has(n)) return true; // "🍚 Mercearia"
  if (/^lista( de compras?)?$/.test(n) || n === 'compras') return true;
  return false;
}

/**
 * Texto colado → itens. Junta repetidos (mesmo nome): soma a quantidade quando a unidade é a mesma.
 * Linhas com "✅ Já no carrinho" (itens já comprados no formato do Listinha) são ignoradas.
 */
export function interpretarTexto(texto: string): ItemImportado[] {
  const pedacos = texto
    .split(/\r?\n/)
    .filter((linha) => !ehCabecalho(linha))
    .flatMap((linha) => linha.split(/[;,](?!\d)/)) // vírgula separa itens, mas não "1,5"
    .flatMap(separarDitado); // Fase 3: ditado sem vírgula ("arroz feijão café")

  const resultado: ItemImportado[] = [];
  const porChave = new Map<string, ItemImportado>();
  for (const pedaco of pedacos) {
    if (ehCabecalho(pedaco)) continue;
    const item = interpretarLinha(pedaco);
    if (!item) continue;
    const chave = chaveBusca(item.nome);
    if (!chave) continue;
    const existente = porChave.get(chave);
    if (existente) {
      if (existente.unidade === item.unidade && existente.quantidade !== undefined && item.quantidade !== undefined) {
        existente.quantidade += item.quantidade;
      }
      continue;
    }
    porChave.set(chave, item);
    resultado.push(item);
  }
  return resultado;
}
