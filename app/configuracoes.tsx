import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ORDEM_CATEGORIAS, obterCategoria } from '@/data/categorias';
import { PRODUTOS } from '@/data/produtos';
import { useListaStore } from '@/store/useListaStore';
import { cores, espaco, fonte, raio, toqueMinimo } from '@/theme';
import type { CategoriaId } from '@/types';

const totalPorCategoria = PRODUTOS.reduce<Partial<Record<CategoriaId, number>>>((acc, produto) => {
  acc[produto.categoria] = (acc[produto.categoria] ?? 0) + 1;
  return acc;
}, {});

// Configurações: dados salvos no celular ("Limpar dados"), fotos online, testes (só no Expo Go)
// e a ordem dos corredores (reordenar categorias com ↑/↓, Fase 2).
export default function ConfiguracoesTela() {
  const listaAtiva = useListaStore((s) => s.listaAtiva);
  const historico = useListaStore((s) => s.historico);
  const limparDados = useListaStore((s) => s.limparDados);
  const carregarHistoricoExemplo = useListaStore((s) => s.carregarHistoricoExemplo);
  const imagensOnline = useListaStore((s) => s.imagensOnline);
  const definirImagensOnline = useListaStore((s) => s.definirImagensOnline);
  const totalFotos = useListaStore((s) => Object.values(s.imagens).filter((i) => i.uri).length);
  const ordemCategorias = useListaStore((s) => s.ordemCategorias);
  const moverCategoria = useListaStore((s) => s.moverCategoria);
  const restaurarOrdemCategorias = useListaStore((s) => s.restaurarOrdemCategorias);
  const totalCategoriasManuais = useListaStore((s) => Object.keys(s.categoriasManuais).length);
  const esquecerCategoriasManuais = useListaStore((s) => s.esquecerCategoriasManuais);
  const ordemPersonalizada = ordemCategorias.some((id, i) => id !== ORDEM_CATEGORIAS[i]);

  const totalItens = (listaAtiva?.itens.length ?? 0) + historico.reduce((n, l) => n + l.itens.length, 0);
  const temDados = !!listaAtiva || historico.length > 0;

  function confirmarEsquecer() {
    Alert.alert(
      'Esquecer categorias escolhidas?',
      'Os próximos itens voltam a entrar na categoria automática. Os itens que já estão na lista não mudam.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Esquecer', style: 'destructive', onPress: esquecerCategoriasManuais },
      ],
    );
  }

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

      <Text style={[styles.secao, { marginTop: espaco.lg }]}>Fotos dos produtos</Text>
      <View style={styles.cartao}>
        <View style={styles.linhaSwitch}>
          <View style={{ flex: 1 }}>
            <Text style={styles.textoDados}>Buscar fotos na internet</Text>
            <Text style={styles.ajuda}>
              Para itens fora do catálogo de emojis, procura a foto no Open Food Facts (gratuito). Só o nome do item
              é enviado. A foto fica guardada no celular; sem foto ou sem sinal, aparece o emoji.
              {totalFotos ? ` ${totalFotos} ${totalFotos === 1 ? 'foto guardada' : 'fotos guardadas'}.` : ''}
            </Text>
          </View>
          <Switch
            value={imagensOnline}
            onValueChange={definirImagensOnline}
            trackColor={{ true: cores.primaria, false: cores.borda }}
            thumbColor={cores.superficie}
            accessibilityLabel="Buscar fotos na internet"
          />
        </View>
      </View>

      <Text style={[styles.secao, { marginTop: espaco.lg }]}>Categorias escolhidas</Text>
      <View style={styles.cartao}>
        <Text style={styles.textoDados}>
          {totalCategoriasManuais
            ? `${totalCategoriasManuais} ${totalCategoriasManuais === 1 ? 'item lembrado' : 'itens lembrados'}`
            : 'Nenhum item lembrado ainda.'}
        </Text>
        <Text style={styles.ajuda}>
          Quando você troca a categoria de um item (tocando no nome dele na lista), o Listinha lembra e, da próxima
          vez, o item já entra nessa categoria.
        </Text>
        {totalCategoriasManuais > 0 && (
          <Pressable onPress={confirmarEsquecer} hitSlop={8} accessibilityRole="button">
            <Text style={styles.linkRestaurar}>Esquecer escolhas</Text>
          </Pressable>
        )}
      </View>

      {__DEV__ && (
        <View style={[styles.cartao, { marginTop: espaco.sm }]}>
          <Text style={styles.textoDados}>🧪 Testes (só no Expo Go)</Text>
          <Text style={styles.ajuda}>
            Acrescenta 4 compras de exemplo nas últimas semanas, para ver as sugestões por frequência. Não apaga nada.
          </Text>
          <Pressable
            onPress={() => {
              carregarHistoricoExemplo();
              Alert.alert('Pronto 🧪', '4 compras de exemplo foram para o histórico.');
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.botaoTeste, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.botaoTesteTexto}>Gerar histórico de exemplo</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.linhaSecao, { marginTop: espaco.lg }]}>
        <Text style={styles.secao}>Ordem dos corredores</Text>
        {ordemPersonalizada && (
          <Pressable onPress={restaurarOrdemCategorias} hitSlop={8} accessibilityRole="button">
            <Text style={styles.linkRestaurar}>Restaurar padrão</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.ajuda}>
        Arrume na ordem em que você passa pelos corredores do seu mercado: a lista, o Modo Mercado e o texto
        compartilhado seguem essa ordem. {PRODUTOS.length} produtos conhecidos no catálogo.
      </Text>

      {ordemCategorias.map((id, indice) => {
        const c = obterCategoria(id);
        const primeiro = indice === 0;
        const ultimo = indice === ordemCategorias.length - 1;
        return (
          <View key={id} style={[styles.linha, { backgroundColor: c.corFundo }]}>
            <View style={[styles.faixa, { backgroundColor: c.cor }]} />
            <Text style={styles.posicao}>{indice + 1}</Text>
            <Text style={styles.emoji}>{c.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nome, { color: c.cor }]}>{c.nome}</Text>
              <Text style={styles.contador}>{totalPorCategoria[id] ?? 0} no catálogo</Text>
            </View>
            <Pressable
              onPress={() => moverCategoria(id, -1)}
              disabled={primeiro}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`Subir ${c.nome}`}
              style={({ pressed }) => [styles.seta, primeiro && { opacity: 0.25 }, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="chevron-up" size={22} color={c.cor} />
            </Pressable>
            <Pressable
              onPress={() => moverCategoria(id, 1)}
              disabled={ultimo}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`Descer ${c.nome}`}
              style={({ pressed }) => [styles.seta, ultimo && { opacity: 0.25 }, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="chevron-down" size={22} color={c.cor} />
            </Pressable>
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
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
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
  botaoTeste: {
    minHeight: toqueMinimo,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raio.md,
    backgroundColor: cores.primariaClara,
  },
  botaoTesteTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
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
  contador: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  linhaSecao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRestaurar: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  posicao: { width: 18, fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario, textAlign: 'center' },
  seta: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
