import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ORDEM_CATEGORIAS, obterCategoria } from '@/data/categorias';
import { PRODUTOS } from '@/data/produtos';
import { useListaStore } from '@/store/useListaStore';
import { cores, espaco, fonte, raio, toqueMinimo } from '@/theme';
import type { CategoriaId } from '@/types';

const totalPorCategoria = PRODUTOS.reduce<Partial<Record<CategoriaId, number>>>((acc, produto) => {
  acc[produto.categoria] = (acc[produto.categoria] ?? 0) + 1;
  return acc;
}, {});

// Configurações da Fase 1: dados salvos no celular ("Limpar dados") e as categorias
// na ordem dos corredores (só leitura). Reordenar categorias, unidade padrão e backup ficam para a Fase 2.
export default function ConfiguracoesTela() {
  const listaAtiva = useListaStore((s) => s.listaAtiva);
  const historico = useListaStore((s) => s.historico);
  const limparDados = useListaStore((s) => s.limparDados);

  const totalItens = (listaAtiva?.itens.length ?? 0) + historico.reduce((n, l) => n + l.itens.length, 0);
  const temDados = !!listaAtiva || historico.length > 0;

  function confirmarLimpeza() {
    Alert.alert(
      'Apagar todos os dados?',
      'A lista ativa e todo o histórico de compras serão apagados deste celular. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            await limparDados();
            router.dismissAll(); // volta para o Início, já vazio
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.secao}>Seus dados</Text>
      <View style={styles.cartao}>
        <Text style={styles.textoDados}>
          {temDados
            ? `${listaAtiva ? '1 lista ativa' : 'Nenhuma lista ativa'} · ${historico.length} ${
                historico.length === 1 ? 'compra' : 'compras'
              } no histórico · ${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`
            : 'Nada salvo ainda.'}
        </Text>
        <Text style={styles.ajuda}>Tudo fica salvo só neste celular e funciona sem internet.</Text>
        <Pressable
          onPress={confirmarLimpeza}
          disabled={!temDados}
          accessibilityRole="button"
          accessibilityLabel="Limpar dados"
          style={({ pressed }) => [styles.botaoPerigo, !temDados && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="trash-outline" size={20} color={cores.perigo} />
          <Text style={styles.botaoPerigoTexto}>Limpar dados</Text>
        </Pressable>
      </View>

      <Text style={[styles.secao, { marginTop: espaco.lg }]}>Categorias</Text>
      <Text style={styles.ajuda}>
        Ordem dos corredores. Em breve você vai poder arrumar do seu jeito.{'\n'}
        {PRODUTOS.length} produtos conhecidos no catálogo.
      </Text>

      {ORDEM_CATEGORIAS.map((id) => {
        const c = obterCategoria(id);
        return (
          <View key={id} style={[styles.linha, { backgroundColor: c.corFundo }]}>
            <View style={[styles.faixa, { backgroundColor: c.cor }]} />
            <Text style={styles.emoji}>{c.emoji}</Text>
            <Text style={[styles.nome, { color: c.cor }]}>{c.nome}</Text>
            <Text style={styles.contador}>{totalPorCategoria[id] ?? 0}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: espaco.lg, gap: espaco.sm },
  secao: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  ajuda: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario, marginBottom: espaco.sm },
  cartao: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm },
  textoDados: { fontSize: fonte.tamanho.normal, color: cores.texto },
  botaoPerigo: {
    minHeight: toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.sm,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.perigo,
  },
  botaoPerigoTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.perigo },
  linha: {
    minHeight: toqueMinimo + 8,
    borderRadius: raio.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    gap: espaco.md,
  },
  faixa: { width: 6, alignSelf: 'stretch' },
  emoji: { fontSize: fonte.tamanho.emoji },
  nome: { flex: 1, fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito },
  contador: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario, marginRight: espaco.lg },
});
