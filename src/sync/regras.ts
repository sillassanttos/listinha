import { sanearItem } from '@/store/persistencia';
import type { ItemLista, Lista, ListaCompartilhada } from '@/types';
import { gerarId } from '@/utils/lista';
import { chaveBusca } from '@/utils/normalizar';

// Regras puras da lista compartilhada (Fase 3), sem rede: conversão item <-> linha do banco,
// o que mudou entre duas versões da lista, junção com o que veio do servidor e código de convite.
// O motor (sincronizador.ts) só chama estas funções e o Supabase.

/** Linha da tabela public.itens (supabase/esquema.sql). */
export type LinhaItem = {
  lista_id: string;
  id: string;
  nome: string;
  categoria: string;
  emoji: string;
  quantidade: number;
  unidade: string;
  pego: boolean;
  pego_em: number | null;
  preco: number | null;
  observacao: string | null;
  criado_em: number;
};

export function itemParaLinha(item: ItemLista, listaId: string): LinhaItem {
  return {
    lista_id: listaId,
    id: item.id,
    nome: item.nome.slice(0, 60),
    categoria: item.categoria,
    emoji: item.emoji,
    quantidade: item.quantidade,
    unidade: item.unidade,
    pego: item.pego,
    pego_em: item.pego ? (item.pegoEm ?? null) : null,
    preco: item.preco ?? null,
    observacao: item.observacao?.slice(0, 80) ?? null,
    criado_em: Math.round(item.criadoEm),
  };
}

/** Linha vinda do servidor (ou do tempo real) para item do app; dado estranho vira null. */
export function linhaParaItem(linha: unknown): ItemLista | null {
  if (typeof linha !== 'object' || linha === null) return null;
  const l = linha as Record<string, unknown>;
  const numero = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : undefined);
  return sanearItem({
    id: l.id,
    nome: l.nome,
    categoria: l.categoria,
    emoji: l.emoji,
    quantidade: numero(l.quantidade),
    unidade: l.unidade,
    pego: l.pego,
    pegoEm: numero(l.pego_em),
    preco: numero(l.preco),
    observacao: l.observacao ?? undefined,
    criadoEm: numero(l.criado_em),
  });
}

/** Campos que vão para o servidor (a foto em cache e outros detalhes locais não contam). */
function mesmoConteudo(a: ItemLista, b: ItemLista): boolean {
  return (
    a.nome === b.nome &&
    a.categoria === b.categoria &&
    a.emoji === b.emoji &&
    a.quantidade === b.quantidade &&
    a.unidade === b.unidade &&
    a.pego === b.pego &&
    (a.pego ? a.pegoEm : undefined) === (b.pego ? b.pegoEm : undefined) &&
    a.preco === b.preco &&
    a.observacao === b.observacao &&
    a.criadoEm === b.criadoEm
  );
}

/** O que precisa ir para o servidor depois de uma mudança local. */
export function diferencasItens(antes: ItemLista[], depois: ItemLista[]): { salvar: ItemLista[]; apagar: string[] } {
  const porId = new Map(antes.map((i) => [i.id, i]));
  const salvar = depois.filter((i) => {
    const anterior = porId.get(i.id);
    return !anterior || !mesmoConteudo(anterior, i);
  });
  const ficaram = new Set(depois.map((i) => i.id));
  const apagar = antes.filter((i) => !ficaram.has(i.id)).map((i) => i.id);
  return { salvar, apagar };
}

function porCriacao(a: ItemLista, b: ItemLista): number {
  return a.criadoEm - b.criadoEm || a.id.localeCompare(b.id);
}

/**
 * Junta a lista do servidor com a local. O servidor vale, menos para os itens com mudança local
 * ainda não enviada (pendentes): esses ficam como estão aqui, porque vão subir em seguida.
 * Item local que sumiu do servidor e não está pendente foi apagado por outra pessoa.
 */
export function mesclarRemoto(local: ItemLista[], remotos: ItemLista[], pendentes: ReadonlySet<string>): ItemLista[] {
  const localPorId = new Map(local.map((i) => [i.id, i]));
  const remotoPorId = new Set(remotos.map((i) => i.id));
  const resultado: ItemLista[] = [];
  for (const r of remotos) {
    const l = localPorId.get(r.id);
    if (l && pendentes.has(r.id)) {
      resultado.push(l);
    } else {
      // A foto é só deste celular: mantém a que já estava.
      resultado.push(l?.imagemUri ? { ...r, imagemUri: l.imagemUri } : r);
    }
  }
  for (const l of local) {
    if (!remotoPorId.has(l.id) && pendentes.has(l.id)) resultado.push(l);
  }
  return resultado.sort(porCriacao);
}

export type EventoItem = { tipo: 'salvo'; item: ItemLista } | { tipo: 'apagado'; id: string };

/** Aplica um aviso do tempo real; itens com mudança local pendente não são tocados. */
export function aplicarEvento(itens: ItemLista[], evento: EventoItem, pendentes: ReadonlySet<string>): ItemLista[] {
  if (evento.tipo === 'apagado') {
    if (pendentes.has(evento.id) || !itens.some((i) => i.id === evento.id)) return itens;
    return itens.filter((i) => i.id !== evento.id);
  }
  const { item } = evento;
  if (pendentes.has(item.id)) return itens;
  const atual = itens.find((i) => i.id === item.id);
  if (!atual) return [...itens, item].sort(porCriacao);
  if (mesmoConteudo(atual, item)) return itens;
  return itens.map((i) => (i.id === item.id ? { ...item, imagemUri: atual.imagemUri } : i));
}

const ALFABETO_CODIGO = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

/** Código de convite como o banco gera: 6 caracteres maiúsculos, sem 0/O/1/I (o resto é descartado). */
export function normalizarCodigo(texto: string): string {
  return texto.toUpperCase().replace(ALFABETO_CODIGO, '').slice(0, 6);
}

export function codigoConviteValido(codigo: string): boolean {
  return normalizarCodigo(codigo).length === 6 && normalizarCodigo(codigo) === codigo;
}

/** Mensagem de convite para mandar no WhatsApp. */
export function textoConvite(nomeLista: string, codigo: string): string {
  return [
    `🛒 Vamos dividir a lista "${nomeLista}" no Listinha?`,
    '',
    `No app, entre em Família → "Entrar com código" e digite: ${codigo}`,
  ].join('\n');
}

export type DadosListaRemota = { nome: string; orcamento?: number; compartilhada: ListaCompartilhada };

/**
 * Ao entrar numa lista da família (por código ou ao compartilhar a própria):
 * - juntar: a lista ativa vira a compartilhada e leva os itens não pegos que a família ainda não tem
 *   (devolvidos em "paraEnviar", para subir antes de ligar a sincronização);
 * - não juntar: a lista ativa (se tiver itens) vai para o histórico e a da família vira a ativa.
 */
export function listaAoEntrar(
  atual: Lista | null,
  remota: DadosListaRemota,
  itensRemotos: ItemLista[],
  juntar: boolean,
  agora = Date.now(),
): { novaLista: Lista; finalizada?: Lista; paraEnviar: ItemLista[] } {
  const base = { nome: remota.nome, orcamento: remota.orcamento, compartilhada: remota.compartilhada };
  if (juntar && atual) {
    const naFamilia = new Set(itensRemotos.map((i) => chaveBusca(i.nome)));
    const idsRemotos = new Set(itensRemotos.map((i) => i.id));
    const paraEnviar = atual.itens.filter((i) => !i.pego && !idsRemotos.has(i.id) && !naFamilia.has(chaveBusca(i.nome)));
    return {
      novaLista: { ...atual, ...base, itens: [...itensRemotos, ...paraEnviar].sort(porCriacao) },
      paraEnviar,
    };
  }
  return {
    novaLista: { id: gerarId(), criadaEm: agora, ...base, itens: [...itensRemotos].sort(porCriacao) },
    finalizada: atual && atual.itens.length > 0 ? { ...atual, finalizadaEm: agora } : undefined,
    paraEnviar: [],
  };
}

/** Mensagem em português para erros ao criar, entrar ou sair de uma lista da família. */
export function mensagemErroFamilia(erro: unknown): string {
  const e = (erro ?? {}) as { code?: unknown; message?: unknown };
  const mensagem = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  if (mensagem.includes('código não encontrado') || mensagem.includes('codigo nao encontrado')) {
    return 'Código não encontrado. Confira as letras e os números (a lista pode ter sido concluída).';
  }
  if (mensagem.includes('login necessário') || e.code === 'PGRST301' || e.code === '401') {
    return 'Entre na sua conta de novo para continuar.';
  }
  if (e.code === 'PGRST202' || e.code === '42883') return 'Falta rodar o supabase/esquema.sql no projeto Supabase.';
  if (mensagem.includes('network') || mensagem.includes('fetch')) return 'Sem conexão com a internet. Tente de novo quando tiver sinal.';
  return 'Não deu certo agora. Tente de novo em instantes.';
}

/**
 * Concluir a compra (ou começar lista nova) numa lista da família.
 * A lista da família continua (mesmo código e pessoas): a compra feita vai para o histórico
 * deste celular e a próxima mantém só o que faltou (se levarPendentes), com os MESMOS ids,
 * para que no servidor só os itens pegos sejam apagados. O orçamento não passa para a próxima.
 * "ultimaConclusao" avisa os outros celulares para arquivarem a cópia deles.
 */
export function concluirCompartilhada(
  lista: Lista,
  levarPendentes: boolean,
  agora = Date.now(),
  nomeProxima?: string,
): { finalizada: Lista; proxima: Lista } {
  const { compartilhada, ...semCompartilhada } = lista;
  return {
    finalizada: { ...semCompartilhada, finalizadaEm: agora },
    proxima: {
      id: gerarId(),
      nome: nomeProxima?.trim() || lista.nome,
      criadaEm: agora,
      itens: levarPendentes ? lista.itens.filter((i) => !i.pego) : [],
      compartilhada: compartilhada ? { ...compartilhada, ultimaConclusao: agora } : undefined,
    },
  };
}

/** Outra pessoa concluiu a compra: arquiva a cópia deste celular e segue com o que não foi pego. */
export function arquivarConclusaoRemota(lista: Lista, em: number): { finalizada?: Lista; proxima: Lista } {
  const { finalizada, proxima } = concluirCompartilhada(lista, true, em);
  return {
    // Lista vazia não vai para o histórico.
    finalizada: lista.itens.length > 0 ? finalizada : undefined,
    proxima,
  };
}

/** true se o servidor tem uma conclusão mais nova do que a que este celular conhece. */
export function conclusaoNova(remota: unknown, local: number | undefined): number | undefined {
  const n = typeof remota === 'string' ? Number(remota) : remota;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return undefined;
  return n > (local ?? 0) ? n : undefined;
}
