import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { useListaStore } from '@/store/useListaStore';
import { useSessao } from '@/store/useSessao';
import type { ItemLista, Lista } from '@/types';
import { listaPorRemoto } from '@/utils/listas';

import {
  type EventoItem,
  aplicarEvento,
  conclusaoNova,
  diferencasItens,
  itemParaLinha,
  linhaParaItem,
  mesclarRemoto,
} from './regras';

// Motor da lista compartilhada (Fase 3).
// - Envio: cada mudança local vira "pendente" (por item, e nome/orçamento/conclusão da lista) e sobe
//   em lote: primeiro a lista, depois upsert e delete dos itens. Sem sinal, tenta de novo com espera
//   crescente (até 30 s). As pendências ficam salvas (AsyncStorage), então fechar o app sem sinal
//   não perde nada: ao abrir de novo, sobem quando o sinal voltar.
// - Recebimento: tempo real do Supabase (postgres_changes) em itens e na própria lista.
// - Ao conectar e ao voltar para o app, puxa tudo de novo e junta (mesclarRemoto), porque avisos do
//   tempo real se perdem com o app em segundo plano.
// - Conclusão: quem conclui a compra grava "concluida_em"; os outros celulares arquivam a cópia deles
//   (vai para o histórico) e seguem com o que não foi pego.
// "base" é a última versão dos itens já considerada: o que vem do servidor atualiza a base antes de
// chegar ao store, então não volta como envio (sem eco).

export type EstadoSync = 'desligado' | 'sem-login' | 'conectando' | 'sincronizado' | 'enviando' | 'sem-conexao' | 'sem-acesso';

export type SituacaoSync = { estado: EstadoSync; pendentes: number };

/** Situação da sincronização de cada lista da família (por id remoto). */
export const useEstadoSync = create<{ porLista: Record<string, SituacaoSync> }>(() => ({ porLista: {} }));

const DESLIGADO: SituacaoSync = { estado: 'desligado', pendentes: 0 };

function definirSituacao(remotoId: string, situacao: SituacaoSync | null) {
  useEstadoSync.setState((s) => {
    const porLista = { ...s.porLista };
    if (situacao) porLista[remotoId] = situacao;
    else delete porLista[remotoId];
    return { porLista };
  });
}

/** Situação da sincronização de uma lista da família ("desligado" sem id). */
export function useSituacaoSync(remotoId: string | undefined): SituacaoSync {
  return useEstadoSync((s) => (remotoId ? (s.porLista[remotoId] ?? DESLIGADO) : DESLIGADO));
}

// Uma chave por lista da família; a antiga (sem o id, de antes das várias listas) ainda é lida.
const CHAVE_PENDENCIAS = 'listinha-sync-pendentes';
const chavePendencias = (remotoId: string) => `${CHAVE_PENDENCIAS}:${remotoId}`;

type PendenciasSalvas = { remotoId: string; ids: string[]; nome: boolean; orcamento: boolean; conclusao: boolean };

function normalizarOrcamento(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Liga a sincronização da lista remota; devolve a função que desliga. */
export function iniciarSincronizacao(remotoId: string): () => void {
  const sb = supabase;
  if (!sb) return () => {};

  const listaAtual = (): Lista | null => listaPorRemoto(useListaStore.getState().listas, remotoId) ?? null;

  let ativo = true;
  const inicial = listaAtual();
  let base: ItemLista[] = inicial?.itens ?? [];
  let baseNome = inicial?.nome;
  let baseOrcamento = inicial?.orcamento;
  let baseConclusao = inicial?.compartilhada?.ultimaConclusao;
  const pendentes = new Map<string, number>(); // id do item -> versão da mudança
  const lista = { nome: false, orcamento: false, conclusao: false }; // campos da lista a enviar
  let versao = 0;
  let enviando = false;
  let tentativas = 0;
  let semAcesso = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timerSalvar: ReturnType<typeof setTimeout> | undefined;

  const totalPendente = () => pendentes.size + Number(lista.nome) + Number(lista.orcamento) + Number(lista.conclusao);

  const publicar = (estado: EstadoSync) => {
    if (!ativo) return;
    definirSituacao(remotoId, { estado: semAcesso ? 'sem-acesso' : estado, pendentes: totalPendente() });
  };

  // Pendências salvas no celular (sobrevivem a fechar o app).
  const salvarPendencias = () => {
    if (timerSalvar) clearTimeout(timerSalvar);
    timerSalvar = setTimeout(() => {
      const dados: PendenciasSalvas = { remotoId, ids: [...pendentes.keys()], ...lista };
      AsyncStorage.setItem(chavePendencias(remotoId), JSON.stringify(dados)).catch(() => {});
    }, 200);
  };

  const pronto: Promise<void> = AsyncStorage.getItem(chavePendencias(remotoId))
    .then(async (texto) => texto ?? (await AsyncStorage.getItem(CHAVE_PENDENCIAS)))
    .then((texto) => {
      if (!texto) return;
      const salvo = JSON.parse(texto) as Partial<PendenciasSalvas>;
      if (salvo.remotoId !== remotoId) return;
      for (const id of Array.isArray(salvo.ids) ? salvo.ids : []) {
        if (typeof id === 'string') pendentes.set(id, ++versao);
      }
      lista.nome ||= salvo.nome === true;
      lista.orcamento ||= salvo.orcamento === true;
      lista.conclusao ||= salvo.conclusao === true;
    })
    .catch(() => {});

  const agendarEnvio = (ms: number) => {
    if (!ativo) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void enviar(), ms);
  };

  // Mudanças locais -> pendentes.
  const pararDeOuvirStore = useListaStore.subscribe(() => {
    const l = listaAtual();
    if (!l) return;
    let mudou = false;
    if (l.itens !== base) {
      const { salvar, apagar } = diferencasItens(base, l.itens);
      base = l.itens;
      for (const i of salvar) pendentes.set(i.id, ++versao);
      for (const id of apagar) pendentes.set(id, ++versao);
      mudou = salvar.length > 0 || apagar.length > 0;
    }
    if (l.nome !== baseNome) {
      baseNome = l.nome;
      lista.nome = mudou = true;
    }
    if (l.orcamento !== baseOrcamento) {
      baseOrcamento = l.orcamento;
      lista.orcamento = mudou = true;
    }
    const conclusao = l.compartilhada?.ultimaConclusao;
    if (conclusao !== baseConclusao) {
      baseConclusao = conclusao;
      lista.conclusao = mudou = true;
    }
    if (mudou) {
      salvarPendencias();
      publicar('enviando');
      agendarEnvio(300);
    }
  });

  async function enviar() {
    await pronto;
    if (!ativo || enviando || !sb) return;
    const l = listaAtual();
    if (!l) return;
    if (totalPendente() === 0) {
      publicar('sincronizado');
      return;
    }
    enviando = true;
    publicar('enviando');
    const lote = new Map(pendentes);
    const camposLista = { ...lista };
    const porId = new Map(l.itens.map((i) => [i.id, i]));
    const salvar = [...lote.keys()].filter((id) => porId.has(id)).map((id) => itemParaLinha(porId.get(id)!, remotoId));
    const apagar = [...lote.keys()].filter((id) => !porId.has(id));
    try {
      // 1) A lista primeiro: a conclusão precisa chegar aos outros antes dos itens apagados.
      const mudancas: Record<string, unknown> = {};
      if (camposLista.nome) mudancas.nome = l.nome.slice(0, 60);
      if (camposLista.orcamento) mudancas.orcamento = l.orcamento ?? null;
      if (camposLista.conclusao && l.compartilhada?.ultimaConclusao) mudancas.concluida_em = l.compartilhada.ultimaConclusao;
      if (Object.keys(mudancas).length) {
        const { error } = await sb.from('listas').update(mudancas).eq('id', remotoId);
        if (error) throw error;
      }
      if (camposLista.nome) lista.nome = l.nome !== baseNome;
      if (camposLista.orcamento) lista.orcamento = l.orcamento !== baseOrcamento;
      if (camposLista.conclusao) lista.conclusao = l.compartilhada?.ultimaConclusao !== baseConclusao;
      // 2) Itens.
      if (salvar.length) {
        const { error } = await sb.from('itens').upsert(salvar);
        if (error) throw error;
      }
      if (apagar.length) {
        const { error } = await sb.from('itens').delete().eq('lista_id', remotoId).in('id', apagar);
        if (error) throw error;
      }
      for (const [id, v] of lote) if (pendentes.get(id) === v) pendentes.delete(id);
      tentativas = 0;
      enviando = false;
      salvarPendencias();
      if (totalPendente()) agendarEnvio(0);
      else publicar('sincronizado');
    } catch (erro) {
      enviando = false;
      // PGRST204: coluna desconhecida (o esquema.sql novo, com concluida_em, ainda não foi rodado).
      // Desiste só da conclusão para não travar o envio dos itens.
      if ((erro as { code?: string })?.code === 'PGRST204' && lista.conclusao) {
        lista.conclusao = false;
        salvarPendencias();
        agendarEnvio(0);
        return;
      }
      // 42501: sem permissão (a pessoa saiu da lista ou a lista foi apagada).
      if ((erro as { code?: string })?.code === '42501') {
        semAcesso = true;
        publicar('sem-acesso');
        return;
      }
      tentativas++;
      publicar('sem-conexao');
      agendarEnvio(Math.min(30_000, 2_000 * 2 ** Math.min(tentativas, 4)));
    }
  }

  /** Outra pessoa concluiu a compra: arquiva a cópia daqui e segue com o que não foi pego. */
  function aplicarConclusao(em: number) {
    const l = listaAtual();
    if (!l || lista.conclusao) return; // a conclusão daqui ainda não subiu: a nossa vale
    const proximos = l.itens.filter((i) => !i.pego);
    base = proximos;
    baseOrcamento = undefined;
    baseConclusao = em;
    useListaStore.getState().concluidaEmOutroCelular(remotoId, em, proximos);
    useListaStore.getState().definirAvisoPendente('✅ A compra foi concluída em outro celular e foi para o seu histórico.');
  }

  async function ressincronizar() {
    await pronto;
    if (!ativo || !sb) return;
    const [itensR, comConclusao] = await Promise.all([
      sb.from('itens').select('*').eq('lista_id', remotoId),
      sb.from('listas').select('nome, orcamento, concluida_em').eq('id', remotoId).maybeSingle(),
    ]);
    // 42703: coluna concluida_em ainda não existe (esquema.sql antigo) -> lê sem ela.
    const listaR: { data: { nome?: unknown; orcamento?: unknown; concluida_em?: unknown } | null; error: unknown } =
      comConclusao.error?.code === '42703'
        ? await sb.from('listas').select('nome, orcamento').eq('id', remotoId).maybeSingle()
        : comConclusao;
    if (!ativo) return;
    if (itensR.error || listaR.error) {
      publicar('sem-conexao');
      return;
    }
    if (!listaR.data) {
      // Sem a lista: a pessoa não participa mais (ou a lista foi apagada).
      semAcesso = true;
      publicar('sem-acesso');
      return;
    }
    semAcesso = false;
    const nova = conclusaoNova(listaR.data.concluida_em, listaAtual()?.compartilhada?.ultimaConclusao);
    if (nova) aplicarConclusao(nova);
    const l = listaAtual();
    if (!l) return;
    const remotos = (itensR.data ?? []).map(linhaParaItem).filter((i): i is ItemLista => i !== null);
    const novos = mesclarRemoto(l.itens, remotos, new Set(pendentes.keys()));
    base = novos;
    const nome = !lista.nome && typeof listaR.data.nome === 'string' ? listaR.data.nome : undefined;
    if (nome) baseNome = nome;
    const orcamento = lista.orcamento ? undefined : normalizarOrcamento(listaR.data.orcamento);
    if (!lista.orcamento) baseOrcamento = orcamento;
    useListaStore.getState().aplicarRemoto(remotoId, {
      itens: novos,
      nome,
      orcamento: lista.orcamento ? undefined : (orcamento ?? null),
    });
    void enviar();
    if (totalPendente() === 0) publicar('sincronizado');
  }

  function receber(evento: EventoItem) {
    const l = listaAtual();
    if (!l) return;
    const novos = aplicarEvento(l.itens, evento, new Set(pendentes.keys()));
    if (novos === l.itens) return;
    base = novos;
    useListaStore.getState().aplicarRemoto(remotoId, { itens: novos });
  }

  function receberLista(linha: { nome?: unknown; orcamento?: unknown; concluida_em?: unknown }) {
    const nova = conclusaoNova(linha.concluida_em, listaAtual()?.compartilhada?.ultimaConclusao);
    if (nova) aplicarConclusao(nova);
    const nome = !lista.nome && typeof linha.nome === 'string' ? linha.nome : undefined;
    if (nome) baseNome = nome;
    const orcamento = normalizarOrcamento(linha.orcamento);
    if (!lista.orcamento) baseOrcamento = orcamento;
    useListaStore.getState().aplicarRemoto(remotoId, {
      nome,
      orcamento: lista.orcamento ? undefined : (orcamento ?? null),
    });
  }

  const filtro = `lista_id=eq.${remotoId}`;
  const canal = sb
    .channel(`lista-${remotoId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'itens', filter: filtro }, (p) => {
      const item = linhaParaItem(p.new);
      if (item) receber({ tipo: 'salvo', item });
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'itens', filter: filtro }, (p) => {
      const item = linhaParaItem(p.new);
      if (item) receber({ tipo: 'salvo', item });
    })
    // Apagar não aceita filtro no tempo real: chega de todas as listas, só com a chave (lista_id, id).
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'itens' }, (p) => {
      const antigo = p.old as { lista_id?: unknown; id?: unknown };
      if (antigo?.lista_id === remotoId && typeof antigo.id === 'string') receber({ tipo: 'apagado', id: antigo.id });
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listas', filter: `id=eq.${remotoId}` }, (p) =>
      receberLista(p.new as { nome?: unknown; orcamento?: unknown; concluida_em?: unknown }),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void ressincronizar();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') publicar('sem-conexao');
    });

  const appState = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') {
      void ressincronizar();
      agendarEnvio(0);
    }
  });

  publicar('conectando');
  void pronto.then(() => {
    if (totalPendente()) {
      publicar('enviando');
      agendarEnvio(0);
    }
  });

  return () => {
    ativo = false;
    if (timer) clearTimeout(timer);
    if (timerSalvar) {
      // Grava na hora o que estava agendado.
      clearTimeout(timerSalvar);
      const dados: PendenciasSalvas = { remotoId, ids: [...pendentes.keys()], ...lista };
      AsyncStorage.setItem(chavePendencias(remotoId), JSON.stringify(dados)).catch(() => {});
    }
    pararDeOuvirStore();
    appState.remove();
    void sb.removeChannel(canal);
    definirSituacao(remotoId, null);
  };
}

/**
 * Liga um motor para cada lista da família aberta (usado no _layout) e desliga os que sobram.
 * Só mexe nos motores das listas que mudaram; sem login, marca as listas como "sem-login".
 */
export function useSincronizacao(): void {
  const { sessao, carregando } = useSessao();
  const usuario = sessao?.user.id;
  // Texto com os ids (ordenados) para o efeito só rodar quando o conjunto muda.
  const idsTexto = useListaStore((s) =>
    s.listas
      .map((l) => l.compartilhada?.id)
      .filter((id): id is string => !!id)
      .sort()
      .join(','),
  );
  const motores = useRef(new Map<string, () => void>());

  useEffect(() => {
    const ids = new Set(idsTexto ? idsTexto.split(',') : []);
    const ligados = motores.current;
    for (const [id, parar] of ligados) {
      if (!usuario || !ids.has(id)) {
        parar();
        ligados.delete(id);
      }
    }
    for (const id of ids) {
      if (!usuario) {
        if (!carregando) definirSituacao(id, { estado: 'sem-login', pendentes: 0 });
        continue;
      }
      if (!ligados.has(id)) ligados.set(id, iniciarSincronizacao(id));
    }
  }, [idsTexto, usuario, carregando]);

  // Ao sair do app (desmontar o _layout), desliga tudo.
  useEffect(() => {
    const ligados = motores.current;
    return () => {
      for (const parar of ligados.values()) parar();
      ligados.clear();
    };
  }, []);
}
