import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GraficoPrecos } from '@/components/GraficoPrecos';
import { VariacaoPreco } from '@/components/VariacaoPreco';
import { useListaStore } from '@/store/useListaStore';
import { cores, espaco, fonte, raio } from '@/theme';
import { formatarDataAmigavel } from '@/utils/datas';
import { historicoDePrecos, resumoPrecos } from '@/utils/historicoPrecos';
import { formatarReais } from '@/utils/preco';

// Preço de um produto ao longo das compras (Fase 3): gráfico, menor/média/maior e a lista de compras
// (a lista é a "tabela" do gráfico: todos os valores sem precisar tocar nele).
export default function PrecoProdutoTela() {
  const { chave } = useLocalSearchParams<{ chave: string }>();
  const historico = useListaStore((s) => s.historico);
  const produto = useMemo(() => historicoDePrecos(historico).find((p) => p.chave === chave), [historico, chave]);

  if (!produto) {
    return (
      <View style={styles.centro}>
        <Stack.Screen options={{ title: 'Preço' }} />
        <Text style={styles.texto}>Esse produto não tem preços no histórico 🤔</Text>
      </View>
    );
  }

  const r = resumoPrecos(produto.pontos)!;
  const linhas = produto.pontos.map((p, i) => ({ ...p, anterior: i > 0 ? produto.pontos[i - 1].preco : undefined })).reverse();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: `${produto.emoji} ${produto.nome}` }} />

      <View style={styles.cartao}>
        <GraficoPrecos pontos={produto.pontos} unidade={produto.unidadePreco} nomeProduto={produto.nome} />
      </View>

      {produto.pontos.length > 1 && (
        <View style={styles.resumo}>
          <Resumo rotulo="Menor" valor={r.minimo} />
          <Resumo rotulo="Média" valor={r.media} />
          <Resumo rotulo="Maior" valor={r.maximo} />
        </View>
      )}

      <Text style={styles.secao}>Compras ({produto.pontos.length})</Text>
      <View style={styles.cartao}>
        {linhas.map((l, i) => (
          <View key={`${l.listaId}-${i}`} style={[styles.linha, i > 0 && styles.linhaBorda]}>
            <Text style={styles.data}>{formatarDataAmigavel(l.em)}</Text>
            <Text style={styles.valor}>{formatarReais(l.preco)}</Text>
            <View style={styles.colVariacao}>
              <VariacaoPreco variacao={l.anterior ? (l.preco - l.anterior) / l.anterior : undefined} />
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.ajuda}>
        Preço da etiqueta por {produto.unidadePreco}. Só entram compras concluídas com o preço digitado no Modo
        Mercado.
      </Text>
    </ScrollView>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <View style={styles.resumoCaixa}>
      <Text style={styles.resumoRotulo}>{rotulo}</Text>
      <Text style={styles.resumoValor}>{formatarReais(valor)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  container: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },
  texto: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, textAlign: 'center' },
  cartao: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.lg },
  resumo: { flexDirection: 'row', gap: espaco.sm },
  resumoCaixa: { flex: 1, backgroundColor: cores.superficie, borderRadius: raio.md, padding: espaco.md, alignItems: 'center' },
  resumoRotulo: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  resumoValor: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.texto },
  secao: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario, marginTop: espaco.sm },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: espaco.sm, gap: espaco.md },
  linhaBorda: { borderTopWidth: 1, borderTopColor: cores.borda },
  data: { flex: 1, fontSize: fonte.tamanho.normal, color: cores.texto },
  valor: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.texto },
  colVariacao: { width: 84, alignItems: 'flex-end' },
  ajuda: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
});
