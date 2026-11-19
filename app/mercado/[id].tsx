import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Botao } from '@/components/Botao';
import { BarraProgresso } from '@/components/BarraProgresso';
import { CategoriaHeader } from '@/components/CategoriaHeader';
import { ItemMercado } from '@/components/ItemMercado';
import { useListaStore } from '@/store/useListaStore';
import { cores, duracaoAnimacao, espaco, fonte, raio } from '@/theme';
import type { ItemLista } from '@/types';
import { secoesMercado } from '@/utils/agrupar';
import { calcularProgresso } from '@/utils/lista';
import { vibrarLeve, vibrarPego } from '@/utils/vibrar';

// Modo Mercado (seção 8.3): tela sempre ligada, itens grandes, tocar = pego.
// O pego vibra, fica riscado e desce para "No carrinho". Dá para desfazer pelo aviso
// ou tocando de novo no item. "Concluir" (cabeçalho, ou o botão quando tudo foi pego)
// abre a tela "Compra concluída".
export default function MercadoTela() {
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const lista = useListaStore((s) => (s.listaAtiva?.id === id ? s.listaAtiva : undefined));
  const definirPego = useListaStore((s) => s.definirPego);
  const [aviso, setAviso] = useState<{ mensagem: string; chave: number; desfazer?: () => void } | null>(null);

  const secoes = useMemo(() => (lista ? secoesMercado(lista.itens) : []), [lista]);

  if (!lista) {
    return (
      <View style={styles.centro}>
        <Text style={styles.textoVazio}>O Modo Mercado só funciona com a lista ativa 🛒</Text>
      </View>
    );
  }

  const progresso = calcularProgresso(lista);
  const terminou = progresso.total > 0 && progresso.faltam === 0;

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
        {terminou && <Botao titulo="Concluir compra 🎉" onPress={concluir} style={{ marginTop: espaco.sm }} />}
      </View>

      <SectionList
        sections={secoes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemMercado item={item} onPress={() => alternar(item)} />}
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
        onFechar={() => setAviso(null)}
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
