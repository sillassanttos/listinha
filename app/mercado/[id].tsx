import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Botao } from '@/components/Botao';
import { BarraProgresso } from '@/components/BarraProgresso';
import { CategoriaHeader } from '@/components/CategoriaHeader';
import { ItemMercado } from '@/components/ItemMercado';
import { ModalOrcamento } from '@/components/ModalOrcamento';
import { ModalPreco } from '@/components/ModalPreco';
import { SeloFamilia } from '@/components/SeloFamilia';
import { useBuscarImagens } from '@/store/useBuscarImagens';
import { useListaStore } from '@/store/useListaStore';
import { cores, duracaoAnimacao, espaco, fonte, raio } from '@/theme';
import type { ItemLista } from '@/types';
import { secoesMercado } from '@/utils/agrupar';
import { calcularProgresso } from '@/utils/lista';
import { type EstadoOrcamento, calcularTotalCarrinho, formatarReais, situacaoOrcamento, ultimoPreco } from '@/utils/preco';
import { vibrarLeve, vibrarPego, vibrarSucesso } from '@/utils/vibrar';

const COR_ORCAMENTO: Record<EstadoOrcamento, string> = {
  ok: cores.primaria,
  perto: cores.destaque,
  estourou: cores.perigo,
};

// Modo Mercado (seção 8.3): tela sempre ligada, itens grandes, tocar = pego.
// O pego vibra, fica riscado e desce para "No carrinho". Dá para desfazer pelo aviso
// ou tocando de novo no item. "Concluir" (cabeçalho, ou o botão quando tudo foi pego)
// abre a tela "Compra concluída".
// Fase 2: preço opcional no item pego ("Preço" no aviso ou "+ R$" no item) e total do carrinho no painel.
export default function MercadoTela() {
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const lista = useListaStore((s) => s.listas.find((l) => l.id === id));
  const definirPego = useListaStore((s) => s.definirPego);
  const definirPreco = useListaStore((s) => s.definirPreco);
  const historico = useListaStore((s) => s.historico);
  const [aviso, setAviso] = useState<{ mensagem: string; chave: number; desfazer?: () => void; precoDe?: string } | null>(
    null,
  );
  const [itemPrecoId, setItemPrecoId] = useState<string | null>(null);

  const ordemCategorias = useListaStore((s) => s.ordemCategorias);
  const secoes = useMemo(() => (lista ? secoesMercado(lista.itens, ordemCategorias) : []), [lista, ordemCategorias]);
  useBuscarImagens(lista?.itens);

  // Fase 2: orçamento. Avisa (vibração + aviso) quando o carrinho passa do limite.
  const definirOrcamento = useListaStore((s) => s.definirOrcamento);
  const [editandoOrcamento, setEditandoOrcamento] = useState(false);
  const totalAtual = lista ? calcularTotalCarrinho(lista).total : 0;
  const orcamento = lista ? situacaoOrcamento(totalAtual, lista.orcamento) : null;
  const estadoAnterior = useRef(orcamento?.estado);
  useEffect(() => {
    const anterior = estadoAnterior.current;
    estadoAnterior.current = orcamento?.estado;
    if (orcamento?.estado === 'estourou' && anterior !== 'estourou' && anterior !== undefined) {
      vibrarSucesso(); // padrão de vibração diferente do "pego", para chamar atenção
      setAviso({ mensagem: `🚨 Passou ${formatarReais(-orcamento.restante)} do orçamento`, chave: Date.now() });
    }
  }, [orcamento?.estado, orcamento?.restante]);

  if (!lista) {
    return (
      <View style={styles.centro}>
        <Text style={styles.textoVazio}>O Modo Mercado só funciona com a lista ativa 🛒</Text>
      </View>
    );
  }

  const progresso = calcularProgresso(lista);
  const terminou = progresso.total > 0 && progresso.faltam === 0;
  const carrinho = calcularTotalCarrinho(lista);
  const itemPreco = itemPrecoId ? (lista.itens.find((i) => i.id === itemPrecoId) ?? null) : null;

  function animar() {
    LayoutAnimation.configureNext({
      duration: duracaoAnimacao,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  }

  function concluir() {
    if (lista) router.push({ pathname: '/concluida/[id]', params: { id: lista.id } });
  }

  function alternar(item: ItemLista) {
    animar();
    if (!item.pego) {
      vibrarPego();
      definirPego(item.id, true);
      setAviso({
        mensagem: `✓ ${item.nome} no carrinho`,
        chave: Date.now(),
        precoDe: item.preco === undefined ? item.id : undefined,
        desfazer: () => {
          animar();
          definirPego(item.id, false);
          setAviso(null);
        },
      });
    } else {
      vibrarLeve();
      definirPego(item.id, false);
      setAviso({ mensagem: `${item.nome} voltou para a lista`, chave: Date.now() });
    }
  }

  return (
    <View style={styles.tela}>
      <Stack.Screen
        options={{
          title: lista.nome,
          headerRight:
            progresso.total > 0
              ? () => (
                  <Pressable onPress={concluir} hitSlop={12} accessibilityRole="button" accessibilityLabel="Concluir compra">
                    <Text style={styles.concluirTopo}>Concluir</Text>
                  </Pressable>
                )
              : undefined,
        }}
      />

      <View style={styles.painel}>
        {lista.compartilhada && <SeloFamilia remotoId={lista.compartilhada.id} listaId={lista.id} />}
        <Text style={styles.faltam} accessibilityLiveRegion="polite">
          {progresso.total === 0
            ? 'Lista vazia'
            : terminou
              ? 'Tudo no carrinho! 🎉'
              : `Faltam ${progresso.faltam} ${progresso.faltam === 1 ? 'item' : 'itens'}`}
        </Text>
        <BarraProgresso fracao={progresso.fracao} altura={12} />
        <Text style={styles.subtitulo}>
          {progresso.pegos} de {progresso.total} no carrinho · tela fica ligada 💡
        </Text>
        {orcamento && lista.orcamento ? (
          <Pressable
            onPress={() => setEditandoOrcamento(true)}
            accessibilityRole="button"
            accessibilityHint="Toque para mudar o orçamento"
            style={({ pressed }) => [styles.blocoOrcamento, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.linhaTotal}>
              <Text style={styles.totalRotulo}>🛒 {formatarReais(carrinho.total)}</Text>
              <Text style={styles.totalRotulo}>de {formatarReais(lista.orcamento)}</Text>
            </View>
            <BarraProgresso
              fracao={orcamento.fracao}
              altura={10}
              cor={COR_ORCAMENTO[orcamento.estado]}
              corTrilho={orcamento.estado === 'ok' ? undefined : COR_ORCAMENTO[orcamento.estado] + '33'}
            />
            <Text style={[styles.textoOrcamento, { color: COR_ORCAMENTO[orcamento.estado] }]} accessibilityLiveRegion="polite">
              {orcamento.estado === 'estourou'
                ? `🚨 Passou ${formatarReais(-orcamento.restante)} do orçamento`
                : orcamento.estado === 'perto'
                  ? `⚠️ Quase lá: restam ${formatarReais(orcamento.restante)}`
                  : `Ainda dá para gastar ${formatarReais(orcamento.restante)}`}
            </Text>
          </Pressable>
        ) : (
          <>
            {carrinho.comPreco > 0 && (
              <View style={styles.linhaTotal} accessibilityLiveRegion="polite">
                <Text style={styles.totalRotulo}>🛒 Total do carrinho</Text>
                <Text style={styles.totalValor}>{formatarReais(carrinho.total)}</Text>
              </View>
            )}
            <Pressable onPress={() => setEditandoOrcamento(true)} hitSlop={6} accessibilityRole="button">
              <Text style={styles.linkOrcamento}>💰 Definir orçamento</Text>
            </Pressable>
          </>
        )}
        {carrinho.comPreco > 0 && carrinho.semPreco > 0 && (
          <Text style={styles.subtitulo}>
            {carrinho.semPreco} {carrinho.semPreco === 1 ? 'item sem preço' : 'itens sem preço'} não {carrinho.semPreco === 1 ? 'entra' : 'entram'} na soma
          </Text>
        )}
        {terminou && <Botao titulo="Concluir compra 🎉" onPress={concluir} style={{ marginTop: espaco.sm }} />}
      </View>

      <SectionList
        sections={secoes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemMercado item={item} onPress={() => alternar(item)} onPreco={() => setItemPrecoId(item.id)} />
        )}
        renderSectionHeader={({ section }) =>
          section.tipo === 'categoria' ? (
            <CategoriaHeader categoria={section.categoria} quantidade={section.data.length} />
          ) : (
            <View style={styles.cabecalhoCarrinho} accessibilityRole="header">
              <Text style={styles.cabecalhoCarrinhoTexto}>🛒 No carrinho</Text>
              <Text style={styles.cabecalhoCarrinhoContador}>{section.data.length}</Text>
            </View>
          )
        }
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: espaco.sm }} />}
        contentContainerStyle={styles.itens}
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Text style={styles.vazioEmoji}>📝</Text>
            <Text style={styles.textoVazio}>Adicione itens na lista antes de ir ao mercado.</Text>
          </View>
        }
      />

      <Aviso
        mensagem={aviso?.mensagem ?? null}
        chave={aviso?.chave}
        duracao={aviso?.desfazer ? 4000 : 2000}
        acao={aviso?.desfazer ? { titulo: 'Desfazer', onPress: aviso.desfazer } : undefined}
        acao2={
          aviso?.precoDe
            ? {
                titulo: 'Preço',
                onPress: () => {
                  setItemPrecoId(aviso.precoDe ?? null);
                  setAviso(null);
                },
              }
            : undefined
        }
        onFechar={() => setAviso(null)}
      />

      <ModalOrcamento
        visivel={editandoOrcamento}
        atual={lista.orcamento}
        onFechar={() => setEditandoOrcamento(false)}
        onSalvar={(valor) => {
          definirOrcamento(valor, lista?.id);
          setEditandoOrcamento(false);
        }}
      />

      <ModalPreco
        item={itemPreco}
        ultimo={itemPreco ? ultimoPreco(historico, itemPreco.nome, itemPreco.unidade) : undefined}
        onFechar={() => setItemPrecoId(null)}
        onSalvar={(preco) => {
          if (itemPreco) definirPreco(itemPreco.id, preco);
          setItemPrecoId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  painel: {
    margin: espaco.lg,
    marginBottom: 0,
    padding: espaco.lg,
    gap: espaco.sm,
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
  },
  faltam: { fontSize: fonte.tamanho.titulo, fontWeight: fonte.peso.negrito, color: cores.texto },
  subtitulo: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  linhaTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espaco.xs,
    paddingTop: espaco.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  blocoOrcamento: { gap: espaco.xs },
  textoOrcamento: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito },
  linkOrcamento: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.primariaEscura, paddingTop: espaco.xs },
  totalRotulo: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.medio, color: cores.textoSecundario },
  totalValor: { fontSize: fonte.tamanho.grande, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  concluirTopo: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  itens: { paddingHorizontal: espaco.lg, paddingTop: espaco.sm, paddingBottom: 120 },
  cabecalhoCarrinho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    marginTop: espaco.xl,
    marginBottom: espaco.xs,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.md,
    backgroundColor: cores.primariaClara,
  },
  cabecalhoCarrinhoTexto: { flex: 1, fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  cabecalhoCarrinhoContador: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  vazio: { alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xxl },
  vazioEmoji: { fontSize: 56 },
  textoVazio: { fontSize: fonte.tamanho.normal, textAlign: 'center', color: cores.textoSecundario },
});
