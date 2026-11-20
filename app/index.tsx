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

// Tela Início (seção 8.1): as listas abertas (Fase 3: várias ao mesmo tempo), nova lista, repetir a
// última compra (Fase 2), lembretes, família, preços, despensa e histórico.
// O que entra daqui (lembretes, repetir) vai para a lista atual (a aberta por último).
export default function Inicio() {
  const listas = useListaStore((s) => s.listas);
  const listaAtiva = useListaStore((s) => s.listaAtiva);
  const totalHistorico = useListaStore((s) => s.historico.length);
  const novaLista = useListaStore((s) => s.novaLista);
  const ultimaCompra = useListaStore((s) => s.historico[0]);
  const repetirUltimaCompra = useListaStore((s) => s.repetirUltimaCompra);
  const historico = useListaStore((s) => s.historico);
  const adicionarItem = useListaStore((s) => s.adicionarItem);

  // Fase 2: até 3 itens que já passaram do intervalo de costume e não estão na lista atual.
  const lembretes = useMemo(
    () => sugestoesPorFrequencia(historico, listaAtiva).filter((f) => f.atrasado).slice(0, 3),
    [historico, listaAtiva],
  );

  function adicionarLembrete(nome: string) {
    if (!useListaStore.getState().listaAtiva) novaLista('Compra da semana');
    adicionarItem(nome);
  }

  const [modalAberto, setModalAberto] = useState(false);

  function abrirLista(id: string, aviso?: string) {
    router.push({ pathname: '/lista/[id]', params: aviso ? { id, aviso } : { id } });
  }

  function repetir() {
    const r = repetirUltimaCompra();
    if (!r) return;
    if (r.adicionados === 0) {
      Alert.alert('Já está tudo aí 👍', `Todos os itens da última compra já estão em "${r.lista.nome}".`);
      return;
    }
    const aviso =
      `🔁 ${r.adicionados} ${r.adicionados === 1 ? 'item' : 'itens'} da última compra` +
      (r.jaEstavam ? ` (${r.jaEstavam} já estava${r.jaEstavam === 1 ? '' : 'm'} na lista)` : '');
    abrirLista(r.lista.id, aviso);
  }

  // Várias listas: a nova entra ao lado das outras, que continuam abertas.
  function criar(nome: string) {
    const nova = novaLista(nome);
    setModalAberto(false);
    abrirLista(nova.id);
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

        {listas.length > 1 && <Text style={styles.secao}>Suas listas ({listas.length})</Text>}
        {listas.length > 0 ? (
          listas.map((l) => <CartaoListaAtiva key={l.id} lista={l} onPress={() => abrirLista(l.id)} />)
        ) : (
          <View style={styles.vazio}>
            <Text style={styles.vazioEmoji}>🧺</Text>
            <Text style={styles.vazioTitulo}>Nenhuma lista por aqui</Text>
            <Text style={styles.vazioTexto}>Crie sua primeira listinha e comece pelo café ☕</Text>
          </View>
        )}

        <CartaoLembretes lembretes={lembretes} onAdicionar={(f) => adicionarLembrete(f.nome)} />

        <Botao titulo="+ Nova lista" onPress={() => setModalAberto(true)} />

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
                {listas.length > 1 && listaAtiva ? ` → ${listaAtiva.nome}` : ''}
              </Text>
            </View>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.push('/familia')}
          accessibilityRole="button"
          accessibilityLabel="Família: dividir a lista"
          style={({ pressed }) => [styles.linhaHistorico, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.linhaEmoji}>👨‍👩‍👧</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.linhaTexto}>Família</Text>
            <Text style={styles.contador}>
              {listaAtiva?.compartilhada ? 'Lista dividida · código ' + listaAtiva.compartilhada.codigo : 'Divida a lista ou entre com um código'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={cores.textoSuave} />
        </Pressable>

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
          onPress={() => router.push('/precos')}
          accessibilityRole="button"
          accessibilityLabel="Preços: ver quanto cada produto custou"
          style={({ pressed }) => [styles.linhaHistorico, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.linhaEmoji}>📈</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.linhaTexto}>Preços</Text>
            <Text style={styles.contador}>Quanto cada produto custou, compra a compra</Text>
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

      <ModalNovaLista visivel={modalAberto} onCancelar={() => setModalAberto(false)} onCriar={criar} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: espaco.lg, gap: espaco.lg },
  secao: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario, marginBottom: -espaco.sm },
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
