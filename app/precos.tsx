import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { VariacaoPreco } from '@/components/VariacaoPreco';
import { useListaStore } from '@/store/useListaStore';
import { espaco, fonte, raio, toqueMinimo } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';
import { historicoDePrecos, resumoPrecos } from '@/utils/historicoPrecos';
import { chaveBusca } from '@/utils/normalizar';
import { formatarReais } from '@/utils/preco';

// Histórico de preços (Fase 3): todos os produtos que já tiveram preço digitado numa compra concluída,
// com o último preço e quanto mudou em relação à compra anterior. Toque abre o gráfico do produto.
export default function PrecosTela() {
  const cores = useCores();
  const styles = useEstilos();
  const historico = useListaStore((s) => s.historico);
  const produtos = useMemo(() => historicoDePrecos(historico), [historico]);
  const [busca, setBusca] = useState('');
  const chave = chaveBusca(busca);
  const filtrados = chave ? produtos.filter((p) => p.chave.includes(chave)) : produtos;

  if (produtos.length === 0) {
    return (
      <View style={styles.vazio}>
        <Text style={styles.vazioEmoji}>📈</Text>
        <Text style={styles.vazioTitulo}>Ainda sem preços</Text>
        <Text style={styles.vazioTexto}>
          No Modo Mercado, digite o preço ao marcar um item. Depois de concluir a compra, o preço aparece aqui e, a
          partir da segunda compra, dá para ver se subiu ou baixou.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filtrados}
      keyExtractor={(p) => p.chave}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.busca}>
          <Ionicons name="search" size={20} color={cores.textoSuave} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Procurar produto"
            placeholderTextColor={cores.textoSuave}
            style={styles.buscaCampo}
            autoCorrect={false}
            accessibilityLabel="Procurar produto"
          />
        </View>
      }
      ListEmptyComponent={<Text style={styles.nada}>Nenhum produto com esse nome.</Text>}
      renderItem={({ item: p }) => {
        const r = resumoPrecos(p.pontos)!;
        return (
          <Pressable
            onPress={() => router.push({ pathname: '/preco/[chave]', params: { chave: p.chave } })}
            accessibilityRole="button"
            accessibilityLabel={`${p.nome}, último preço ${formatarReais(r.ultimo)} por ${p.unidadePreco}`}
            style={({ pressed }) => [styles.linha, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.emoji}>{p.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nome} numberOfLines={1}>
                {p.nome}
              </Text>
              <Text style={styles.detalhe}>
                {formatarReais(r.ultimo)} por {p.unidadePreco} · {p.pontos.length}{' '}
                {p.pontos.length === 1 ? 'compra' : 'compras'}
              </Text>
            </View>
            <VariacaoPreco variacao={r.variacao} />
            <Ionicons name="chevron-forward" size={18} color={cores.textoSuave} />
          </Pressable>
        );
      }}
    />
  );
}

const useEstilos = criarEstilos((cores) => ({
  container: { padding: espaco.lg, gap: espaco.sm, paddingBottom: espaco.xxl },
  busca: {
    minHeight: toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    marginBottom: espaco.sm,
  },
  buscaCampo: { flex: 1, minHeight: toqueMinimo, fontSize: fonte.tamanho.normal, color: cores.texto },
  linha: {
    minHeight: toqueMinimo + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
  },
  emoji: { fontSize: 26 },
  nome: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.medio, color: cores.texto },
  detalhe: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  nada: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, textAlign: 'center', marginTop: espaco.lg },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl, gap: espaco.sm },
  vazioEmoji: { fontSize: 56 },
  vazioTitulo: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  vazioTexto: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, textAlign: 'center' },
}));
