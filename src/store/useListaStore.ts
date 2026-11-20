import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ORDEM_CATEGORIAS, moverCategoria } from '@/data/categorias';
import { gerarHistoricoExemplo } from '@/data/exemplo';
import type { CategoriaId, Lista, Unidade } from '@/types';
import { type CategoriasManuais, lembrarCategoria } from '@/utils/categoriasManuais';
import {
  adicionarImportados,
  adicionarNaLista,
  type ItemParaImportar,
  alterarItem,
  aplicarEdicao,
  type DadosEdicao,
  finalizarLista,
  iniciarNovaLista,
  type ItemRemovido,
  marcarPego,
  removerDaLista,
  repetirCompra,
  type ResultadoRepetir,
  restaurarNaLista,
  mudarQuantidade,
  mudarUnidade,
  type ResultadoAdicionar,
} from '@/utils/lista';

import { type ImagemSalva, migrarDados, sanearDados, VERSAO_DADOS } from './persistencia';

// Estado global do app, salvo no celular pelo AsyncStorage (chave "listinha-store").
// Regra da Fase 1: só existe uma lista ativa por vez; as finalizadas vão para o histórico (mais recente primeiro).
// Cada mudança é gravada na hora; ao abrir o app, os dados são lidos e saneados antes das telas aparecerem.

export const CHAVE_ARMAZENAMENTO = 'listinha-store';

type ListaState = {
  listaAtiva: Lista | null;
  historico: Lista[];
  /** Fase 2: cache de fotos do Open Food Facts por nome (chaveImagem). */
  imagens: Record<string, ImagemSalva>;
  imagensOnline: boolean;
  definirImagem: (chave: string, uri: string | null) => void;
  definirImagensOnline: (ligado: boolean) => void;
  /** Fase 2: ordem dos corredores escolhida pelo usuário. */
  ordemCategorias: CategoriaId[];
  moverCategoria: (id: CategoriaId, direcao: -1 | 1) => void;
  restaurarOrdemCategorias: () => void;
  /** Fase 2: categoria escolhida à mão por item; vale para as próximas vezes que ele entrar na lista. */
  categoriasManuais: CategoriasManuais;
  esquecerCategoriasManuais: () => void;
  /** Mensagem para a tela Lista mostrar ao voltar de outra tela (não é salva). */
  avisoPendente: string | null;
  definirAvisoPendente: (mensagem: string | null) => void;
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
  /** Fase 2: preço da etiqueta (por unidade de venda); undefined apaga. */
  definirPreco: (itemId: string, preco: number | undefined) => void;
  /** Fase 2: orçamento da lista ativa; undefined tira. */
  definirOrcamento: (valor: number | undefined) => void;
  /** Conclui a compra: a ativa vai para o histórico; com levarPendentes, o que faltou vira a nova ativa. */
  finalizarCompra: (levarPendentes: boolean) => void;
  /** Fase 2: traz os itens da compra finalizada mais recente para a lista ativa (ou cria uma). */
  repetirUltimaCompra: () => ResultadoRepetir | null;
  /** Fase 2: "Importar do WhatsApp". Cria a lista ativa se não houver. */
  importarItens: (itens: ItemParaImportar[]) => ResultadoRepetir;
  /** Só para testes no Expo Go: acrescenta compras de exemplo ao histórico (ordem por data). */
  carregarHistoricoExemplo: () => void;
  /** Configurações: apaga a lista ativa e o histórico (no celular também). */
  limparDados: () => Promise<void>;
};

export const useListaStore = create<ListaState>()(
  persist(
    (set, get) => ({
      listaAtiva: null,
      historico: [],
      imagens: {},
      imagensOnline: true,
      definirImagem: (chave, uri) => set((s) => ({ imagens: { ...s.imagens, [chave]: { uri, em: Date.now() } } })),
      definirImagensOnline: (ligado) => set({ imagensOnline: ligado }),
      ordemCategorias: ORDEM_CATEGORIAS,
      moverCategoria: (id, direcao) => set((s) => ({ ordemCategorias: moverCategoria(s.ordemCategorias, id, direcao) })),
      restaurarOrdemCategorias: () => set({ ordemCategorias: ORDEM_CATEGORIAS }),
      categoriasManuais: {},
      esquecerCategoriasManuais: () => set({ categoriasManuais: {} }),
      avisoPendente: null,
      definirAvisoPendente: (mensagem) => set({ avisoPendente: mensagem }),
      novaLista: (nome, levarPendentes) =>
        set((s) => {
          const { novaLista, finalizada } = iniciarNovaLista(s.listaAtiva, nome, levarPendentes);
          return { listaAtiva: novaLista, historico: finalizada ? [finalizada, ...s.historico] : s.historico };
        }),
      adicionarItem: (nome) => {
        const { listaAtiva: atual, categoriasManuais } = get();
        const resultado = atual ? adicionarNaLista(atual, nome, Date.now(), categoriasManuais) : null;
        if (resultado) set({ listaAtiva: resultado.lista });
        return resultado;
      },
      mudarQuantidade: (itemId, direcao) =>
        set((s) => (s.listaAtiva ? { listaAtiva: mudarQuantidade(s.listaAtiva, itemId, direcao) } : s)),
      mudarUnidade: (itemId, unidade) =>
        set((s) => (s.listaAtiva ? { listaAtiva: mudarUnidade(s.listaAtiva, itemId, unidade) } : s)),
      atualizarItem: (itemId, dados) =>
        set((s) =>
          s.listaAtiva
            ? {
                listaAtiva: alterarItem(s.listaAtiva, itemId, (i) => aplicarEdicao(i, dados)),
                // Categoria diferente da automática fica lembrada para esse nome; voltar à automática esquece.
                categoriasManuais: lembrarCategoria(s.categoriasManuais, dados.nome, dados.categoria),
              }
            : s,
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
      definirOrcamento: (valor) =>
        set((s) =>
          s.listaAtiva ? { listaAtiva: { ...s.listaAtiva, orcamento: valor && valor > 0 ? valor : undefined } } : s,
        ),
      definirPreco: (itemId, preco) =>
        set((s) =>
          s.listaAtiva
            ? { listaAtiva: alterarItem(s.listaAtiva, itemId, (i) => ({ ...i, preco: preco && preco > 0 ? preco : undefined })) }
            : s,
        ),
      finalizarCompra: (levarPendentes) =>
        set((s) => {
          if (!s.listaAtiva) return s;
          const { finalizada, proxima } = finalizarLista(s.listaAtiva, levarPendentes);
          return { listaAtiva: proxima, historico: [finalizada, ...s.historico] };
        }),
      repetirUltimaCompra: () => {
        const { listaAtiva, historico, categoriasManuais } = get();
        const ultima = historico[0];
        if (!ultima) return null;
        const resultado = repetirCompra(listaAtiva, ultima, Date.now(), categoriasManuais);
        set({ listaAtiva: resultado.lista });
        return resultado;
      },
      importarItens: (itens) => {
        const atual = get().listaAtiva ?? iniciarNovaLista(null, 'Compra da semana', false).novaLista;
        const resultado = adicionarImportados(atual, itens, Date.now(), get().categoriasManuais);
        set({ listaAtiva: resultado.lista });
        return resultado;
      },
      carregarHistoricoExemplo: () =>
        set((s) => ({
          historico: [...s.historico, ...gerarHistoricoExemplo()].sort(
            (a, b) => (b.finalizadaEm ?? b.criadaEm) - (a.finalizadaEm ?? a.criadaEm),
          ),
        })),
      limparDados: async () => {
        await useListaStore.persist.clearStorage();
        set({ listaAtiva: null, historico: [], imagens: {}, categoriasManuais: {} });
      },
    }),
    {
      name: CHAVE_ARMAZENAMENTO,
      version: VERSAO_DADOS,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        listaAtiva: s.listaAtiva,
        historico: s.historico,
        imagens: s.imagens,
        imagensOnline: s.imagensOnline,
        ordemCategorias: s.ordemCategorias,
        categoriasManuais: s.categoriasManuais,
      }),
      // Dados salvos passam sempre pela limpeza: nada corrompido chega às telas.
      migrate: (salvo, versao) => migrarDados(salvo, versao),
      merge: (salvo, atual) => ({ ...atual, ...sanearDados(salvo) }),
    },
  ),
);
