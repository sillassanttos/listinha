import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { obterCategoria } from '@/data/categorias';
import { cores, espaco, fonte, raio } from '@/theme';
import type { ItemLista } from '@/types';
import { formatarReais, totalDoItem } from '@/utils/preco';
import { formatarQuantidadeUnidade } from '@/utils/quantidade';

import { ItemImagem } from './ItemImagem';

type Props = {
  item: ItemLista;
  onPress: () => void;
  /** Fase 2: abre o preço (só aparece no item pego). */
  onPreco?: () => void;
};

// Item do Modo Mercado: grande, para usar com uma mão. A linha inteira é a área de toque.
export function ItemMercado({ item, onPress, onPreco }: Props) {
  const categoria = obterCategoria(item.categoria);
  const pego = item.pego;
  const total = totalDoItem(item);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: pego }}
      accessibilityLabel={`${item.nome}, ${formatarQuantidadeUnidade(item.quantidade, item.unidade)}`}
      accessibilityHint={pego ? 'Toque para tirar do carrinho' : 'Toque para marcar como pego'}
      style={({ pressed }) => [styles.cartao, pego && styles.cartaoPego, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={[styles.faixa, { backgroundColor: pego ? cores.borda : categoria.cor }]} />
      <ItemImagem nome={item.nome} emoji={item.emoji} tamanho={44} apagado={pego} />
      <View style={styles.textos}>
        <Text style={[styles.nome, pego && styles.textoPego]} numberOfLines={2}>
          {item.nome}
        </Text>
        <Text style={[styles.detalhe, pego && styles.textoPego]} numberOfLines={1}>
          {formatarQuantidadeUnidade(item.quantidade, item.unidade)}
          {item.observacao ? ` · ${item.observacao}` : ''}
        </Text>
      </View>
      {pego && onPreco && (
        <Pressable
          onPress={onPreco}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={total !== undefined ? `Preço ${formatarReais(total)}. Toque para mudar` : 'Pôr preço'}
          style={({ pressed }) => [styles.preco, total !== undefined && styles.precoComValor, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.precoTexto, total !== undefined && styles.precoTextoComValor]}>
            {total !== undefined ? formatarReais(total) : '+ R$'}
          </Text>
        </Pressable>
      )}
      <View style={[styles.marcador, pego && styles.marcadorPego]}>
        {pego && <Ionicons name="checkmark" size={26} color={cores.textoSobrePrimaria} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingRight: espaco.lg,
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    overflow: 'hidden',
  },
  cartaoPego: { backgroundColor: cores.fundo },
  faixa: { width: 6, alignSelf: 'stretch' },
  preco: {
    minHeight: 40,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pilula,
    borderWidth: 1,
    borderColor: cores.primaria,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  precoComValor: { borderStyle: 'solid', backgroundColor: cores.primariaClara },
  precoTexto: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  precoTextoComValor: { fontSize: fonte.tamanho.normal },
  textos: { flex: 1, paddingVertical: espaco.md },
  nome: { fontSize: fonte.tamanho.grande - 1, fontWeight: fonte.peso.negrito, color: cores.texto },
  detalhe: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, marginTop: 2 },
  textoPego: { textDecorationLine: 'line-through', color: cores.textoSuave },
  marcador: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorPego: { backgroundColor: cores.primaria },
});
