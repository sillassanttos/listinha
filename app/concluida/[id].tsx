import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { useListaStore } from '@/store/useListaStore';
import { cores, espaco, fonte, raio, sombraCartao } from '@/theme';
import { calcularProgresso } from '@/utils/lista';
import { calcularTotalCarrinho, formatarReais } from '@/utils/preco';
import { formatarQuantidadeUnidade } from '@/utils/quantidade';
import { vibrarSucesso } from '@/utils/vibrar';

// "Compra concluída 🎉" (seção 8.3): finalizar a lista (vai para o histórico)
// e, se faltou algo, levar os itens não comprados para a próxima lista.
export default function CompraConcluidaTela() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lista = useListaStore((s) => (s.listaAtiva?.id === id ? s.listaAtiva : undefined));
  const finalizarCompra = useListaStore((s) => s.finalizarCompra);
  const finalizando = useRef(false);

  const progresso = lista ? calcularProgresso(lista) : null;
  const completa = !!progresso && progresso.total > 0 && progresso.faltam === 0;

  useEffect(() => {
    if (completa) vibrarSucesso();
    // só ao abrir a tela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lista || !progresso) {
    return (
      <View style={styles.centro}>
        <Stack.Screen options={{ title: 'Compra concluída' }} />
        <Text style={styles.texto}>{finalizando.current ? 'Compra finalizada ✅' : 'Essa lista já foi finalizada.'}</Text>
      </View>
    );
  }

  const pendentes = lista.itens.filter((i) => !i.pego);
  const carrinho = calcularTotalCarrinho(lista);

  function finalizar(levarPendentes: boolean) {
    finalizando.current = true;
    finalizarCompra(levarPendentes);
    router.dismissAll(); // volta para o Início
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: completa ? 'Compra concluída' : 'Concluir compra' }} />

      <Text style={styles.festa}>{completa ? '🎉' : '🛍️'}</Text>
      <Text style={styles.titulo}>{completa ? 'Compra concluída!' : 'Terminar por aqui?'}</Text>
      <Text style={styles.texto}>
        {progresso.pegos} de {progresso.total} {progresso.total === 1 ? 'item' : 'itens'} no carrinho
        {completa ? '. Mandou bem! 🛒' : '.'}
      </Text>
      {carrinho.comPreco > 0 && (
        <Text style={styles.total}>
          Total: {formatarReais(carrinho.total)}
          {carrinho.semPreco > 0 ? ` (+ ${carrinho.semPreco} sem preço)` : ''}
        </Text>
      )}

      {pendentes.length > 0 && (
        <View style={styles.cartao}>
          <Text style={styles.rotulo}>
            {pendentes.length === 1 ? 'Ficou 1 item sem pegar' : `Ficaram ${pendentes.length} itens sem pegar`}
          </Text>
          {pendentes.slice(0, 8).map((i) => (
            <Text key={i.id} style={styles.pendente}>
              {i.emoji} {i.nome} — {formatarQuantidadeUnidade(i.quantidade, i.unidade)}
            </Text>
          ))}
          {pendentes.length > 8 && <Text style={styles.pendente}>… e mais {pendentes.length - 8}</Text>}
        </View>
      )}

      {lista.compartilhada && (
        <Text style={styles.ajuda}>
          👨‍👩‍👧 Lista da família: finalizar vale para todo mundo. A compra vai para o histórico de cada um e a lista
          da família continua, com o mesmo código, só com o que você levar.
        </Text>
      )}

      <View style={styles.botoes}>
        {pendentes.length > 0 ? (
          <>
            <Botao
              titulo={`Finalizar e levar ${pendentes.length === 1 ? 'o que faltou' : `os ${pendentes.length} que faltaram`}`}
              onPress={() => finalizar(true)}
            />
            <Botao titulo="Finalizar sem levar" variante="secundario" onPress={() => finalizar(false)} />
          </>
        ) : (
          <Botao titulo="Finalizar compra" onPress={() => finalizar(false)} />
        )}
        <Botao titulo="Voltar ao mercado" variante="secundario" onPress={() => router.back()} />
      </View>

      <Text style={styles.ajuda}>
        A lista finalizada vai para o Histórico.
        {pendentes.length > 0 ? ' Levando o que faltou, ele vira sua próxima lista.' : ''}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  container: { padding: espaco.xl, gap: espaco.md, alignItems: 'stretch' },
  festa: { fontSize: 80, textAlign: 'center', marginTop: espaco.lg },
  titulo: { fontSize: fonte.tamanho.titulo, fontWeight: fonte.peso.negrito, color: cores.texto, textAlign: 'center' },
  texto: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, textAlign: 'center' },
  total: { fontSize: fonte.tamanho.grande, fontWeight: fonte.peso.negrito, color: cores.primariaEscura, textAlign: 'center' },
  cartao: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.xs, ...sombraCartao },
  rotulo: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario, marginBottom: espaco.xs },
  pendente: { fontSize: fonte.tamanho.normal, color: cores.texto },
  botoes: { gap: espaco.md, marginTop: espaco.md },
  ajuda: { fontSize: fonte.tamanho.pequeno, color: cores.textoSuave, textAlign: 'center' },
});
