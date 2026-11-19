import type { ItemLista, Lista, Unidade } from '@/types';

import { categorizar } from './categorizar';
import { chaveBusca } from './normalizar';
import { ajustarQuantidade, passoDaUnidade, quantidadeAoTrocarUnidade } from './quantidade';

// Regras puras das listas (sem estado), usadas pelo store e cobertas por testes.

export function gerarId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export type Progresso = { total: number; pegos: number; faltam: number; fracao: number };

export function calcularProgresso(lista: Lista): Progresso {
  const total = lista.itens.length;
  const pegos = lista.itens.filter((i) => i.pego).length;
  return { total, pegos, faltam: total - pegos, fracao: total ? pegos / total : 0 };
}

export function criarItem(nome: string, agora = Date.now()): ItemLista {
  const { categoria, emoji, unidade, produto, exato } = categorizar(nome);
  // Nome exato do catálogo vira o nome "bonito" ("limões" -> "Limão");
  // senão, mantém o que foi digitado ("Arroz Tio João 5kg"), só com a primeira letra maiúscula.
  const digitado = nome.trim().replace(/\s+/g, ' ');
  return {
    id: gerarId(),
    nome: produto && exato ? produto.nome : digitado.charAt(0).toUpperCase() + digitado.slice(1),
    categoria,
    emoji,
    quantidade: Math.max(1, passoDaUnidade(unidade)), // 1 un, 1 kg, 100 g
    unidade,
    pego: false,
    criadoEm: agora,
  };
}

export type ResultadoAdicionar = {
  lista: Lista;
  item: ItemLista;
  /** "novo": entrou um item; "somado": já estava na lista (não pego) e a quantidade subiu um passo. */
  tipo: 'novo' | 'somado';
};

/**
 * Adiciona um item pelo nome. Se o mesmo item já está na lista e ainda não foi pego,
 * soma um passo na quantidade (1 un, 0,5 kg, 100 g…) em vez de duplicar. O item novo entra no fim da lista.
 */
export function adicionarNaLista(lista: Lista, nome: string, agora = Date.now()): ResultadoAdicionar | null {
  if (!nome.trim()) return null;
  const novo = criarItem(nome, agora);
  const chave = chaveBusca(novo.nome);
  const existente = lista.itens.find((i) => !i.pego && chaveBusca(i.nome) === chave);

  if (existente) {
    const item = { ...existente, quantidade: ajustarQuantidade(existente.quantidade, existente.unidade, 1) };
    return { lista: { ...lista, itens: lista.itens.map((i) => (i.id === item.id ? item : i)) }, item, tipo: 'somado' };
  }
  return { lista: { ...lista, itens: [...lista.itens, novo] }, item: novo, tipo: 'novo' };
}

/** Aplica uma mudança a um item da lista pelo id (lista nova; a original não muda). */
export function alterarItem(lista: Lista, itemId: string, mudar: (item: ItemLista) => ItemLista): Lista {
  return { ...lista, itens: lista.itens.map((i) => (i.id === itemId ? mudar(i) : i)) };
}

export type DadosEdicao = Pick<ItemLista, 'nome' | 'quantidade' | 'unidade' | 'categoria' | 'emoji'> & {
  observacao?: string;
};

/**
 * Aplica a edição feita na tela de detalhe. Limpa espaços, descarta observação vazia
 * e não aceita nome vazio nem quantidade inválida (mantém o valor antigo nesses casos).
 */
export function aplicarEdicao(item: ItemLista, dados: DadosEdicao): ItemLista {
  const nome = dados.nome.trim().replace(/\s+/g, ' ');
  const observacao = dados.observacao?.trim();
  return {
    ...item,
    nome: nome || item.nome,
    quantidade: Number.isFinite(dados.quantidade) && dados.quantidade > 0 ? dados.quantidade : item.quantidade,
    unidade: dados.unidade,
    categoria: dados.categoria,
    emoji: dados.emoji || item.emoji,
    observacao: observacao ? observacao : undefined,
  };
}

export type ItemRemovido = { item: ItemLista; indice: number; listaId: string };

/** Tira o item da lista e devolve o que é preciso para desfazer. */
export function removerDaLista(lista: Lista, itemId: string): { lista: Lista; removido: ItemRemovido } | null {
  const indice = lista.itens.findIndex((i) => i.id === itemId);
  if (indice < 0) return null;
  return {
    lista: { ...lista, itens: lista.itens.filter((i) => i.id !== itemId) },
    removido: { item: lista.itens[indice], indice, listaId: lista.id },
  };
}

/**
 * Desfaz a exclusão: devolve o item na mesma posição (ou no fim, se a lista encolheu).
 * Não faz nada se for outra lista ou se o item já estiver lá.
 */
export function restaurarNaLista(lista: Lista, removido: ItemRemovido): Lista {
  if (lista.id !== removido.listaId || lista.itens.some((i) => i.id === removido.item.id)) return lista;
  const itens = [...lista.itens];
  itens.splice(Math.min(removido.indice, itens.length), 0, removido.item);
  return { ...lista, itens };
}

export type ResultadoFinalizar = {
  finalizada: Lista;
  /** Nova lista ativa com o que ficou sem pegar (só quando levarPendentes e havia pendentes). */
  proxima: Lista | null;
};

/**
 * Conclui a compra (tela "Compra concluída"): a lista vai para o histórico com finalizadaEm.
 * Com levarPendentes, o que não foi pego vira a próxima lista ativa (desmarcado, com id novo).
 */
export function finalizarLista(
  atual: Lista,
  levarPendentes: boolean,
  agora = Date.now(),
  nomeProxima = 'Compra da semana',
): ResultadoFinalizar {
  const finalizada = { ...atual, finalizadaEm: agora };
  const temPendentes = atual.itens.some((i) => !i.pego);
  if (!levarPendentes || !temPendentes) return { finalizada, proxima: null };
  const { novaLista } = iniciarNovaLista(atual, nomeProxima, true, agora);
  return { finalizada, proxima: novaLista };
}

/** Marca ou desmarca como pego no mercado (guarda a hora em pegoEm). */
export function marcarPego(lista: Lista, itemId: string, pego: boolean, agora = Date.now()): Lista {
  return alterarItem(lista, itemId, (i) => ({ ...i, pego, pegoEm: pego ? agora : undefined }));
}

/** +/− : um passo da unidade, sem descer do mínimo. */
export function mudarQuantidade(lista: Lista, itemId: string, direcao: 1 | -1): Lista {
  return alterarItem(lista, itemId, (i) => ({ ...i, quantidade: ajustarQuantidade(i.quantidade, i.unidade, direcao) }));
}

/** Troca a unidade e ajusta a quantidade para algo que faça sentido nela. */
export function mudarUnidade(lista: Lista, itemId: string, unidade: Unidade): Lista {
  return alterarItem(lista, itemId, (i) =>
    i.unidade === unidade ? i : { ...i, unidade, quantidade: quantidadeAoTrocarUnidade(i.quantidade, unidade) },
  );
}

/** true se a lista já tem (não pego) um item com esse nome. */
export function listaContem(lista: Lista, nome: string): boolean {
  const chave = chaveBusca(nome);
  return lista.itens.some((i) => !i.pego && chaveBusca(i.nome) === chave);
}

export type ResultadoNovaLista = {
  novaLista: Lista;
  /** Lista anterior finalizada, para ir ao histórico. Não vem quando a anterior estava vazia. */
  finalizada?: Lista;
};

/**
 * Cria uma lista nova. Se havia uma lista ativa, ela é finalizada (vai para o histórico),
 * a não ser que esteja vazia, e aí é só descartada.
 * Com levarPendentes, os itens não pegos da lista anterior entram na nova (desmarcados, com id novo).
 */
export function iniciarNovaLista(
  atual: Lista | null,
  nome: string,
  levarPendentes: boolean,
  agora = Date.now(),
): ResultadoNovaLista {
  const pendentes =
    atual && levarPendentes
      ? atual.itens
          .filter((i) => !i.pego)
          .map((i) => ({ ...i, id: gerarId(), pego: false, pegoEm: undefined, criadoEm: agora }))
      : [];

  const novaLista: Lista = {
    id: gerarId(),
    nome: nome.trim() || 'Compra da semana',
    itens: pendentes,
    criadaEm: agora,
  };

  const finalizada = atual && atual.itens.length > 0 ? { ...atual, finalizadaEm: agora } : undefined;
  return { novaLista, finalizada };
}

/** Texto de progresso, ex.: "8 de 15 itens no carrinho". */
export function textoProgresso({ total, pegos }: Progresso): string {
  if (total === 0) return 'Nenhum item ainda';
  if (pegos === total) return `Todos os ${total} itens no carrinho 🎉`;
  return `${pegos} de ${total} ${total === 1 ? 'item' : 'itens'} no carrinho`;
}
