import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { CartaoLembretes } from '@/components/CartaoLembretes';
import { CartaoListaAtiva } from '@/components/CartaoListaAtiva';
import { ModalNovaLista } from '@/components/ModalNovaLista';
import { useListaStore } from '@/store/useListaStore';
import { cores, espaco, fonte, raio, toqueMinimo } from '@/theme';
import { formatarDataAmigavel } from '@/utils/datas';
import { sugestoesPorFrequencia } from '@/utils/frequencia';
import { calcularProgresso } from '@/utils/lista';

// Tela Início (seção 8.1): lista ativa em destaque, nova lista, repetir a última compra
// (Fase 2), despensa ("Acabou", Fase 2) e acesso ao histórico.
export default function Inicio() {
  const listaAtiva = useListaStore((s) => s.listaAtiva);
  const totalHistorico = useListaStore((s) => s.historico.length);
  const novaLista = useListaStore((s) => s.novaLista);
  const ultimaCompra = useListaStore((s) => s.historico[0]);
  const repetirUltimaCompra = useListaStore((s) => s.repetirUltimaCompra);
  const historico = useListaStore((s) => s.historico);
  const adicionarItem = useListaStore((s) => s.adicionarItem);

  // Fase 2: até 3 itens que já passaram do intervalo de costume e não estão na lista.
  const lembretes = useMemo(
    () => sugestoesPorFrequencia(historico, listaAtiva).filter((f) => f.atrasado).slice(0, 3),
    [historico, listaAtiva],
  );

  function adicionarLembrete(nome: string) {
    if (!useListaStore.getState().listaAtiva) novaLista('Compra da semana', false);
    adicionarItem(nome);
  }

  const [modal, setModal] = useState<{ levarPendentes: boolean; aviso?: string } | null>(null);

  function abrirLista(id: string, aviso?: string) {
    router.push({ pathname: '/lista/[id]', params: aviso ? { id, aviso } : { id } });
  }

  function repetir() {
    const r = repetirUltimaCompra();
    if (!r) return;
    if (r.adicionados === 0) {
      Alert.alert('Já está tudo aí 👍', 'Todos os itens da última compra já estão na sua lista.');
      return;
    }
    const aviso =
      `🔁 ${r.adicionados} ${r.adicionados === 1 ? 'item' : 'itens'} da última compra` +
      (r.jaEstavam ? ` (${r.jaEstavam} já estava${r.jaEstavam === 1 ? '' : 'm'} na lista)` : '');
    abrirLista(r.lista.id, aviso);
  }

  function pedirNovaLista() {
    // Lista atual vazia (ou nenhuma): não há o que finalizar.
    if (!listaAtiva || listaAtiva.itens.length === 0) {
      setModal({ levarPendentes: false });
      return;
    }

    const { faltam } = calcularProgresso(listaAtiva);
    const aviso = `"${listaAtiva.nome}" vai para o histórico.`;
    const cancelar = { text: 'Cancelar', style: 'cancel' as const };

    if (faltam === 0) {
      Alert.alert('Começar uma nova lista?', aviso, [cancelar, { text: 'Começar', onPress: () => setModal({ levarPendentes: false, aviso }) }]);
      return;
    }

    Alert.alert(
      'Começar uma nova lista?',
      `${aviso} ${faltam === 1 ? 'Ficou 1 item sem pegar' : `Ficaram ${faltam} itens sem pegar`}. Quer levá-${faltam === 1 ? 'lo' : 'los'} para a nova lista?`,
      [
        cancelar,
        { text: 'Não, do zero', onPress: () => setModal({ levarPendentes: false, aviso }) },
        {
          text: 'Sim, levar',
          onPress: () => setModal({ levarPendentes: true, aviso: `${aviso} ${faltam} ${faltam === 1 ? 'item vai' : 'itens vão'} junto.` }),
        },
      ],
    );
  }

  function criar(nome: string) {
    if (!modal) return;
    novaLista(nome, modal.levarPendentes);
    setModal(null);
    const nova = useListaStore.getState().listaAtiva;
    if (nova) abrirLista(nova.id);
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/configuracoes')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Configurações"
            >
              <Ionicons name="settings-outline" size={24} color={cores.primariaEscura} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.saudacao}>Bora às compras? 🛒</Text>

        {listaAtiva ? (
          <CartaoListaAtiva lista={listaAtiva} onPress={() => abrirLista(listaAtiva.id)} />
        ) : (
          <View style={styles.vazio}>
            <Text style={styles.vazioEmoji}>🧺</Text>
            <Text style={styles.vazioTitulo}>Nenhuma lista por aqui</Text>
            <Text style={styles.vazioTexto}>Crie sua primeira listinha e comece pelo café ☕</Text>
          </View>
        )}

        <CartaoLembretes lembretes={lembretes} onAdicionar={(f) => adicionarLembrete(f.nome)} />

        <Botao titulo="+ Nova lista" onPress={pedirNovaLista} />

        {ultimaCompra && ultimaCompra.itens.length > 0 && (
          <Pressable
            onPress={repetir}
            accessibilityRole="button"
            accessibilityLabel={`Repetir última compra: ${ultimaCompra.nome}, ${ultimaCompra.itens.length} itens`}
            style={({ pressed }) => [styles.repetir, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.repetirEmoji}>🔁</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.repetirTitulo}>Repetir última compra</Text>
              <Text style={styles.repetirDetalhe} numberOfLines={1}>
                {ultimaCompra.nome} · {formatarDataAmigavel(ultimaCompra.finalizadaEm ?? ultimaCompra.criadaEm)} ·{' '}
                {ultimaCompra.itens.length} {ultimaCompra.itens.length === 1 ? 'item' : 'itens'}
              </Text>
            </View>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.push('/despensa')}
          accessibilityRole="button"
          accessibilityLabel="Despensa: marcar o que acabou em casa"
          style={({ pressed }) => [styles.linhaHistorico, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.linhaEmoji}>🏠</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.linhaTexto}>Despensa</Text>
            <Text style={styles.contador}>Marque em casa o que acabou</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={cores.textoSuave} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/historico')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.linhaHistorico, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="time-outline" size={22} color={cores.primariaEscura} />
          <Text style={styles.linhaTexto}>Histórico de compras</Text>
          <Text style={styles.contador}>{totalHistorico}</Text>
          <Ionicons name="chevron-forward" size={20} color={cores.textoSuave} />
        </Pressable>
      </ScrollView>

      <ModalNovaLista visivel={modal !== null} aviso={modal?.aviso} onCancelar={() => setModal(null)} onCriar={criar} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: espaco.lg, gap: espaco.lg },
  saudacao: { fontSize: fonte.tamanho.grande, fontWeight: fonte.peso.negrito, color: cores.texto, marginTop: espaco.sm },
  vazio: {
    alignItems: 'center',
    gap: espaco.sm,
    paddingVertical: espaco.xxl,
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    borderStyle: 'dashed',
  },
  vazioEmoji: { fontSize: 56 },
  vazioTitulo: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  vazioTexto: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, textAlign: 'center', paddingHorizontal: espaco.xl },
  repetir: {
    minHeight: toqueMinimo + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
    borderRadius: raio.md,
    backgroundColor: cores.primariaClara,
    borderWidth: 1,
    borderColor: cores.primaria + '55',
  },
  repetirEmoji: { fontSize: 26 },
  repetirTitulo: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  repetirDetalhe: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  linhaHistorico: {
    minHeight: toqueMinimo + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingHorizontal: espaco.lg,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
  },
  linhaEmoji: { fontSize: 22 },
  linhaTexto: { flex: 1, fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.medio, color: cores.texto },
  contador: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
});
