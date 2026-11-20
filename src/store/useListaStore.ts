import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ORDEM_CATEGORIAS, moverCategoria } from '@/data/categorias';
import { gerarHistoricoExemplo } from '@/data/exemplo';
import type { CategoriaId, ItemLista, Lista, ListaCompartilhada, Unidade } from '@/types';
import { arquivarConclusaoRemota, concluirCompartilhada } from '@/sync/regras';
import { type CategoriasManuais, lembrarCategoria } from '@/utils/categoriasManuais';
import type { ProdutoLembrado } from '@/utils/codigoBarras';
import { chaveImagem } from '@/utils/imagens';
import {
  adicionarImportados,
  adicionarNaLista,
  type ItemParaImportar,
  alterarItem,
  aplicarEdicao,
  type DadosEdicao,
  finalizarLista,
  gerarId,
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
import { listaComItem, listaPorRemoto, nomeSemRepetir, resolverAtual, substituirLista } from '@/utils/listas';

import { type ImagemSalva, type PreferenciaTema, migrarDados, sanearDados, VERSAO_DADOS } from './persistencia';

// Estado global do app, salvo no celular pelo AsyncStorage (chave "listinha-store").
// Fase 3: várias listas abertas ao mesmo tempo ("listas"); a "lista atual" é a aberta por último
// ("listaAtualId") e recebe o que entra de fora dela (Despensa, leitor de código, lembretes, repetir,
// importar). "listaAtiva" é sempre a lista atual, recalculada a cada mudança (nunca gravada à parte).
// Ações de item agem na lista que tem o item (ids de item são únicos entre listas).
// Listas concluídas vão para o histórico (mais recente primeiro).

export const CHAVE_ARMAZENAMENTO = 'listinha-store';

type ListaState = {
  /** Listas abertas, na ordem em que foram criadas. */
  listas: Lista[];
  listaAtualId: string | null;
  /** A lista atual (derivada de listas + listaAtualId). */
  listaAtiva: Lista | null;
  historico: Lista[];
  /** Fase 2: cache de fotos do Open Food Facts por nome (chaveImagem). */
  imagens: Record<string, ImagemSalva>;
  imagensOnline: boolean;
  definirImagem: (chave: string, uri: string | null) => void;
  definirImagensOnline: (ligado: boolean) => void;
  /** Fase 3: modo escuro (sistema, claro ou escuro). */
  tema: PreferenciaTema;
  definirTema: (tema: PreferenciaTema) => void;
  /** Fase 2: ordem dos corredores escolhida pelo usuário. */
  ordemCategorias: CategoriaId[];
  moverCategoria: (id: CategoriaId, direcao: -1 | 1) => void;
  restaurarOrdemCategorias: () => void;
  /** Fase 2: categoria escolhida à mão por item; vale para as próximas vezes que ele entrar na lista. */
  categoriasManuais: CategoriasManuais;
  esquecerCategoriasManuais: () => void;
  /** Fase 3: produtos lidos pelo código de barras (nome e foto), para não consultar de novo. */
  produtosPorCodigo: Record<string, ProdutoLembrado>;
  lembrarProdutoPorCodigo: (codigo: string, produto: ProdutoLembrado) => void;
  /** Fase 3: adiciona o produto lido na lista atual (cria uma se não houver) e guarda a foto. */
  adicionarProdutoLido: (produto: ProdutoLembrado) => ResultadoAdicionar | null;
  /** Mensagem para a tela Lista mostrar ao voltar de outra tela (não é salva). */
  avisoPendente: string | null;
  definirAvisoPendente: (mensagem: string | null) => void;
  /** Fase 3: torna essa a lista atual (ao abrir a tela da lista ou trocar no seletor). */
  abrirLista: (id: string) => void;
  /** Cria mais uma lista (as outras continuam abertas) e a torna a atual. Devolve a lista criada. */
  novaLista: (nome: string) => Lista;
  renomearLista: (id: string, nome: string) => void;
  /** Tira a lista das abertas: arquivar manda para o histórico (se tiver itens); excluir não. */
  arquivarLista: (id: string) => void;
  excluirLista: (id: string) => void;
  /** Adiciona na lista (padrão: a atual) ou soma 1 se já estiver lá. */
  adicionarItem: (nome: string, listaId?: string) => ResultadoAdicionar | null;
  mudarQuantidade: (itemId: string, direcao: 1 | -1) => void;
  mudarUnidade: (itemId: string, unidade: Unidade) => void;
  /** Salva a edição feita na tela de detalhe do item. */
  atualizarItem: (itemId: string, dados: DadosEdicao) => void;
  /** Exclui o item e devolve o necessário para o "Desfazer". */
  removerItem: (itemId: string) => ItemRemovido | null;
  restaurarItem: (removido: ItemRemovido) => void;
  /** Modo Mercado: marca/desmarca como pego. */
  definirPego: (itemId: string, pego: boolean) => void;
  /** Fase 2: preço da etiqueta (por unidade de venda); undefined apaga. */
  definirPreco: (itemId: string, preco: number | undefined) => void;
  /** Fase 2: orçamento da lista (padrão: a atual); undefined tira. */
  definirOrcamento: (valor: number | undefined, listaId?: string) => void;
  /** Conclui a compra da lista (padrão: a atual); com levarPendentes, o que faltou continua aberto. */
  finalizarCompra: (levarPendentes: boolean, listaId?: string) => void;
  /** Fase 2: traz os itens da compra finalizada mais recente para a lista atual (ou cria uma). */
  repetirUltimaCompra: () => ResultadoRepetir | null;
  /** Fase 2: "Importar do WhatsApp" na lista atual (cria uma se não houver). */
  importarItens: (itens: ItemParaImportar[]) => ResultadoRepetir;
  /** Só para testes no Expo Go: acrescenta compras de exemplo ao histórico (ordem por data). */
  carregarHistoricoExemplo: () => void;
  /** Fase 3: marca a lista (padrão: a atual) como compartilhada ou deixa de ser (undefined). */
  definirCompartilhada: (info: ListaCompartilhada | undefined, listaId?: string) => void;
  /** Fase 3: abre a lista da família (troca a lista de mesmo id ou entra como mais uma) e a torna atual. */
  entrarNaFamilia: (novaLista: Lista, finalizada?: Lista) => void;
  /** Fase 3: aplica o que veio do servidor na lista ligada a esse id remoto. */
  aplicarRemoto: (remotoId: string, mudanca: { itens?: ItemLista[]; nome?: string; orcamento?: number | null }) => void;
  /** Fase 3: outra pessoa concluiu a compra da lista da família; arquiva a cópia daqui. */
  concluidaEmOutroCelular: (remotoId: string, em: number, itensProxima?: ItemLista[]) => void;
  /** Configurações: apaga as listas e o histórico (no celular também). */
  limparDados: () => Promise<void>;
};

/** Estado das listas com a lista atual recalculada (o id guardado é corrigido se a lista sumiu). */
function comListas(listas: Lista[], listaAtualId: string | null | undefined) {
  const listaAtiva = resolverAtual(listas, listaAtualId);
  return { listas, listaAtualId: listaAtiva?.id ?? null, listaAtiva };
}

function novaListaVazia(listas: Lista[], nome: string, agora = Date.now()): Lista {
  return { id: gerarId(), nome: nomeSemRepetir(listas, nome), itens: [], criadaEm: agora };
}

export const useListaStore = create<ListaState>()(
  persist(
    (set, get) => {
      /** Troca uma lista (por id) e recalcula a atual. */
      const trocar = (id: string, nova: Lista | null, atualId?: string | null) => {
        const s = get();
        set(comListas(substituirLista(s.listas, id, nova), atualId === undefined ? s.listaAtualId : atualId));
      };
      /** A lista atual; se não houver nenhuma, cria "Compra da semana". */
      const atualOuNova = (): Lista => {
        const atual = get().listaAtiva;
        if (atual) return atual;
        return get().novaLista('Compra da semana');
      };
      /** Muda um item onde quer que ele esteja. */
      const mudarItem = (itemId: string, mudar: (l: Lista) => Lista) => {
        const lista = listaComItem(get().listas, itemId);
        if (lista) trocar(lista.id, mudar(lista));
      };

      return {
        listas: [],
        listaAtualId: null,
        listaAtiva: null,
        historico: [],
        imagens: {},
        imagensOnline: true,
        definirImagem: (chave, uri) => set((s) => ({ imagens: { ...s.imagens, [chave]: { uri, em: Date.now() } } })),
        definirImagensOnline: (ligado) => set({ imagensOnline: ligado }),
        tema: 'sistema',
        definirTema: (tema) => set({ tema }),
        ordemCategorias: ORDEM_CATEGORIAS,
        moverCategoria: (id, direcao) => set((s) => ({ ordemCategorias: moverCategoria(s.ordemCategorias, id, direcao) })),
        restaurarOrdemCategorias: () => set({ ordemCategorias: ORDEM_CATEGORIAS }),
        categoriasManuais: {},
        esquecerCategoriasManuais: () => set({ categoriasManuais: {} }),
        produtosPorCodigo: {},
        lembrarProdutoPorCodigo: (codigo, produto) =>
          set((s) => ({ produtosPorCodigo: { ...s.produtosPorCodigo, [codigo]: produto } })),
        adicionarProdutoLido: (produto) => {
          const lista = atualOuNova();
          const resultado = get().adicionarItem(produto.nome, lista.id);
          // A foto do produto vira a foto do item (mesmo cache das fotos online).
          if (resultado && produto.imagem) get().definirImagem(chaveImagem(resultado.item.nome), produto.imagem);
          return resultado;
        },
        avisoPendente: null,
        definirAvisoPendente: (mensagem) => set({ avisoPendente: mensagem }),

        abrirLista: (id) => {
          if (get().listaAtualId !== id && get().listas.some((l) => l.id === id)) set(comListas(get().listas, id));
        },
        novaLista: (nome) => {
          const nova = novaListaVazia(get().listas, nome);
          set(comListas([...get().listas, nova], nova.id));
          return nova;
        },
        renomearLista: (id, nome) => {
          const lista = get().listas.find((l) => l.id === id);
          const limpo = nome.trim().replace(/\s+/g, ' ').slice(0, 40);
          if (lista && limpo && limpo !== lista.nome) trocar(id, { ...lista, nome: limpo });
        },
        arquivarLista: (id) => {
          const lista = get().listas.find((l) => l.id === id);
          if (!lista) return;
          const { compartilhada: _c, ...semCompartilhada } = lista;
          trocar(id, null);
          if (lista.itens.length > 0) set((s) => ({ historico: [{ ...semCompartilhada, finalizadaEm: Date.now() }, ...s.historico] }));
        },
        excluirLista: (id) => trocar(id, null),

        adicionarItem: (nome, listaId) => {
          const { listas, listaAtiva, categoriasManuais } = get();
          const alvo = listaId ? listas.find((l) => l.id === listaId) : listaAtiva;
          const resultado = alvo ? adicionarNaLista(alvo, nome, Date.now(), categoriasManuais) : null;
          if (alvo && resultado) trocar(alvo.id, resultado.lista);
          return resultado;
        },
        mudarQuantidade: (itemId, direcao) => mudarItem(itemId, (l) => mudarQuantidade(l, itemId, direcao)),
        mudarUnidade: (itemId, unidade) => mudarItem(itemId, (l) => mudarUnidade(l, itemId, unidade)),
        atualizarItem: (itemId, dados) => {
          if (!listaComItem(get().listas, itemId)) return;
          mudarItem(itemId, (l) => alterarItem(l, itemId, (i) => aplicarEdicao(i, dados)));
          // Categoria diferente da automática fica lembrada para esse nome; voltar à automática esquece.
          set((s) => ({ categoriasManuais: lembrarCategoria(s.categoriasManuais, dados.nome, dados.categoria) }));
        },
        removerItem: (itemId) => {
          const lista = listaComItem(get().listas, itemId);
          const r = lista ? removerDaLista(lista, itemId) : null;
          if (!lista || !r) return null;
          trocar(lista.id, r.lista);
          return r.removido;
        },
        restaurarItem: (removido) => {
          const lista = get().listas.find((l) => l.id === removido.listaId);
          if (lista) trocar(lista.id, restaurarNaLista(lista, removido));
        },
        definirPego: (itemId, pego) => mudarItem(itemId, (l) => marcarPego(l, itemId, pego)),
        definirPreco: (itemId, preco) =>
          mudarItem(itemId, (l) => alterarItem(l, itemId, (i) => ({ ...i, preco: preco && preco > 0 ? preco : undefined }))),
        definirOrcamento: (valor, listaId) => {
          const lista = listaId ? get().listas.find((l) => l.id === listaId) : get().listaAtiva;
          if (lista) trocar(lista.id, { ...lista, orcamento: valor && valor > 0 ? valor : undefined });
        },
        finalizarCompra: (levarPendentes, listaId) => {
          const lista = listaId ? get().listas.find((l) => l.id === listaId) : get().listaAtiva;
          if (!lista) return;
          if (lista.compartilhada) {
            // Lista da família: continua aberta (mesmo código), só com o que faltou (se levar).
            const r = concluirCompartilhada(lista, levarPendentes);
            const eraAtual = get().listaAtualId === lista.id;
            trocar(lista.id, r.proxima, eraAtual ? r.proxima.id : undefined);
            set((s) => ({ historico: [r.finalizada, ...s.historico] }));
            return;
          }
          const { finalizada, proxima } = finalizarLista(lista, levarPendentes, Date.now(), lista.nome);
          const eraAtual = get().listaAtualId === lista.id;
          trocar(lista.id, proxima, eraAtual ? (proxima?.id ?? null) : undefined);
          set((s) => ({ historico: [finalizada, ...s.historico] }));
        },
        repetirUltimaCompra: () => {
          const { listaAtiva, historico, categoriasManuais } = get();
          const ultima = historico[0];
          if (!ultima) return null;
          const resultado = repetirCompra(listaAtiva, ultima, Date.now(), categoriasManuais);
          if (listaAtiva) trocar(listaAtiva.id, resultado.lista);
          else {
            const nova = { ...resultado.lista, nome: nomeSemRepetir(get().listas, resultado.lista.nome) };
            set(comListas([...get().listas, nova], nova.id));
            return { ...resultado, lista: nova };
          }
          return resultado;
        },
        importarItens: (itens) => {
          const lista = atualOuNova();
          const resultado = adicionarImportados(lista, itens, Date.now(), get().categoriasManuais);
          trocar(lista.id, resultado.lista);
          return resultado;
        },
        carregarHistoricoExemplo: () =>
          set((s) => ({
            historico: [...s.historico, ...gerarHistoricoExemplo()].sort(
              (a, b) => (b.finalizadaEm ?? b.criadaEm) - (a.finalizadaEm ?? a.criadaEm),
            ),
          })),
        definirCompartilhada: (info, listaId) => {
          const lista = listaId ? get().listas.find((l) => l.id === listaId) : get().listaAtiva;
          if (lista) trocar(lista.id, { ...lista, compartilhada: info });
        },
        entrarNaFamilia: (novaLista, finalizada) => {
          let listas = substituirLista(get().listas, novaLista.id, novaLista);
          if (finalizada) listas = substituirLista(listas, finalizada.id, null);
          set({ ...comListas(listas, novaLista.id), historico: finalizada ? [finalizada, ...get().historico] : get().historico });
        },
        aplicarRemoto: (remotoId, mudanca) => {
          const l = listaPorRemoto(get().listas, remotoId);
          if (!l) return;
          trocar(l.id, {
            ...l,
            itens: mudanca.itens ?? l.itens,
            nome: mudanca.nome?.trim() ? mudanca.nome : l.nome,
            orcamento:
              mudanca.orcamento === undefined ? l.orcamento : mudanca.orcamento && mudanca.orcamento > 0 ? mudanca.orcamento : undefined,
          });
        },
        concluidaEmOutroCelular: (remotoId, em, itensProxima) => {
          const l = listaPorRemoto(get().listas, remotoId);
          if (!l) return;
          const r = arquivarConclusaoRemota(l, em);
          const proxima = itensProxima ? { ...r.proxima, itens: itensProxima } : r.proxima;
          const eraAtual = get().listaAtualId === l.id;
          trocar(l.id, proxima, eraAtual ? proxima.id : undefined);
          if (r.finalizada) set((s) => ({ historico: [r.finalizada!, ...s.historico] }));
        },
        limparDados: async () => {
          await useListaStore.persist.clearStorage();
          set({ ...comListas([], null), historico: [], imagens: {}, categoriasManuais: {}, produtosPorCodigo: {} });
        },
      };
    },
    {
      name: CHAVE_ARMAZENAMENTO,
      version: VERSAO_DADOS,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        listas: s.listas,
        listaAtualId: s.listaAtualId,
        historico: s.historico,
        imagens: s.imagens,
        imagensOnline: s.imagensOnline,
        ordemCategorias: s.ordemCategorias,
        categoriasManuais: s.categoriasManuais,
        produtosPorCodigo: s.produtosPorCodigo,
        tema: s.tema,
      }),
      // Dados salvos passam sempre pela limpeza: nada corrompido chega às telas.
      migrate: (salvo, versao) => migrarDados(salvo, versao),
      merge: (salvo, atual) => {
        const dados = sanearDados(salvo);
        return { ...atual, ...dados, ...comListas(dados.listas, dados.listaAtualId) };
      },
    },
  ),
);
