import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { obterCategoria } from '@/data/categorias';
import { useListaStore } from '@/store/useListaStore';
import { espaco, fonte, raio, sombraCartao } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';
import type { Lista } from '@/types';
import { formatarDataAmigavel } from '@/utils/datas';
import { calcularProgresso } from '@/utils/lista';

// Histórico (seção 8.1): listas finalizadas, da mais recente para a mais antiga.
// Tocar abre a lista só para leitura.
export default function HistoricoTela() {
  const styles = useEstilos();
  const historico = useListaStore((s) => s.historico);

  return (
    <FlatList
      data={historico}
      keyExtractor={(l) => l.id}
      contentContainerStyle={styles.container}
      ItemSeparatorComponent={() => <View style={{ height: espaco.md }} />}
      ListHeaderComponent={
        historico.length > 0 ? (
          <Text style={styles.resumo}>
            {historico.length} {historico.length === 1 ? 'compra finalizada' : 'compras finalizadas'}
          </Text>
        ) : undefined
      }
      renderItem={({ item }) => <CartaoHistorico lista={item} />}
      ListEmptyComponent={
        <View style={styles.vazio}>
          <Text style={styles.vazioEmoji}>📋</Text>
          <Text style={styles.vazioTitulo}>Nenhuma compra finalizada ainda</Text>
          <Text style={styles.vazioTexto}>Quando concluir uma compra no Modo Mercado, ela aparece aqui.</Text>
        </View>
      }
    />
  );
}

function CartaoHistorico({ lista }: { lista: Lista }) {
  const cores = useCores();
  const styles = useEstilos();
  const { total, pegos } = calcularProgresso(lista);
  const emojis = [...new Set(lista.itens.map((i) => obterCategoria(i.categoria).emoji))].slice(0, 7);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/lista/[id]', params: { id: lista.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${lista.nome}, ${pegos} de ${total} itens comprados`}
      style={({ pressed }) => [styles.cartao, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.nome} numberOfLines={1}>
          {lista.nome}
        </Text>
        <Text style={styles.data}>Finalizada {formatarDataAmigavel(lista.finalizadaEm ?? lista.criadaEm)}</Text>
        <Text style={styles.detalhe}>
          {pegos} de {total} {total === 1 ? 'item comprado' : 'itens comprados'}
        </Text>
        {emojis.length > 0 && <Text style={styles.emojis}>{emojis.join(' ')}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={22} color={cores.textoSuave} />
    </Pressable>
  );
}

const useEstilos = criarEstilos((cores) => ({
  container: { padding: espaco.lg, flexGrow: 1 },
  resumo: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario, marginBottom: espaco.md },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    ...sombraCartao,
  },
  nome: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  data: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  detalhe: { fontSize: fonte.tamanho.pequeno, color: cores.primariaEscura, fontWeight: fonte.peso.medio },
  emojis: { fontSize: 18, marginTop: 2 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaco.sm, padding: espaco.xl },
  vazioEmoji: { fontSize: 56 },
  vazioTitulo: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  vazioTexto: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, textAlign: 'center' },
}));
