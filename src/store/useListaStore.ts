import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Lista, Unidade } from '@/types';
import {
  adicionarNaLista,
  alterarItem,
  aplicarEdicao,
  type DadosEdicao,
  finalizarLista,
  iniciarNovaLista,
  type ItemRemovido,
  marcarPego,
  removerDaLista,
  restaurarNaLista,
  mudarQuantidade,
  mudarUnidade,
  type ResultadoAdicionar,
} from '@/utils/lista';

import { migrarDados, sanearDados, VERSAO_DADOS } from './persistencia';

// Estado global do app, salvo no celular pelo AsyncStorage (chave "listinha-store").
// Regra da Fase 1: só existe uma lista ativa por vez; as finalizadas vão para o histórico (mais recente primeiro).
// Cada mudança é gravada na hora; ao abrir o app, os dados são lidos e saneados antes das telas aparecerem.

export const CHAVE_ARMAZENAMENTO = 'listinha-store';

type ListaState = {
  listaAtiva: Lista | null;
  historico: Lista[];
  /** Cria uma lista nova; a ativa (se não estiver vazia) vai para o histórico. */
  novaLista: (nome: string, levarPendentes: boolean) => void;
  /** Adiciona na lista ativa (ou soma 1 se já estiver lá). Devolve o que aconteceu, para dar feedback. */
  adicionarItem: (nome: string) => ResultadoAdicionar | null;
  /** +/− num item da lista ativa. */
  mudarQuantidade: (itemId: string, direcao: 1 | -1) => void;
  mudarUnidade: (itemId: string, unidade: Unidade) => void;
  /** Salva a edição feita na tela de detalhe do item. */
  atualizarItem: (itemId: string, dados: DadosEdicao) => void;
  /** Exclui da lista ativa e devolve o necessário para o "Desfazer". */
  removerItem: (itemId: string) => ItemRemovido | null;
  restaurarItem: (removido: ItemRemovido) => void;
  /** Modo Mercado: marca/desmarca como pego. */
  definirPego: (itemId: string, pego: boolean) => void;
  /** Conclui a compra: a ativa vai para o histórico; com levarPendentes, o que faltou vira a nova ativa. */
  finalizarCompra: (levarPendentes: boolean) => void;
  /** Configurações: apaga a lista ativa e o histórico (no celular também). */
  limparDados: () => Promise<void>;
};

export const useListaStore = create<ListaState>()(
  persist(
    (set, get) => ({
      listaAtiva: null,
      historico: [],
      novaLista: (nome, levarPendentes) =>
        set((s) => {
          const { novaLista, finalizada } = iniciarNovaLista(s.listaAtiva, nome, levarPendentes);
          return { listaAtiva: novaLista, historico: finalizada ? [finalizada, ...s.historico] : s.historico };
        }),
      adicionarItem: (nome) => {
        const atual = get().listaAtiva;
        const resultado = atual ? adicionarNaLista(atual, nome) : null;
        if (resultado) set({ listaAtiva: resultado.lista });
        return resultado;
      },
      mudarQuantidade: (itemId, direcao) =>
        set((s) => (s.listaAtiva ? { listaAtiva: mudarQuantidade(s.listaAtiva, itemId, direcao) } : s)),
      mudarUnidade: (itemId, unidade) =>
        set((s) => (s.listaAtiva ? { listaAtiva: mudarUnidade(s.listaAtiva, itemId, unidade) } : s)),
      atualizarItem: (itemId, dados) =>
        set((s) =>
          s.listaAtiva ? { listaAtiva: alterarItem(s.listaAtiva, itemId, (i) => aplicarEdicao(i, dados)) } : s,
        ),
      removerItem: (itemId) => {
        const atual = get().listaAtiva;
        const r = atual ? removerDaLista(atual, itemId) : null;
        if (!r) return null;
        set({ listaAtiva: r.lista });
        return r.removido;
      },
      restaurarItem: (removido) =>
        set((s) => (s.listaAtiva ? { listaAtiva: restaurarNaLista(s.listaAtiva, removido) } : s)),
      definirPego: (itemId, pego) =>
        set((s) => (s.listaAtiva ? { listaAtiva: marcarPego(s.listaAtiva, itemId, pego) } : s)),
      finalizarCompra: (levarPendentes) =>
        set((s) => {
          if (!s.listaAtiva) return s;
          const { finalizada, proxima } = finalizarLista(s.listaAtiva, levarPendentes);
          return { listaAtiva: proxima, historico: [finalizada, ...s.historico] };
        }),
      limparDados: async () => {
        await useListaStore.persist.clearStorage();
        set({ listaAtiva: null, historico: [] });
      },
    }),
    {
      name: CHAVE_ARMAZENAMENTO,
      version: VERSAO_DADOS,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ listaAtiva: s.listaAtiva, historico: s.historico }),
      // Dados salvos passam sempre pela limpeza: nada corrompido chega às telas.
      migrate: (salvo, versao) => migrarDados(salvo, versao),
      merge: (salvo, atual) => ({ ...atual, ...sanearDados(salvo) }),
    },
  ),
);
