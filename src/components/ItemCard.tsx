import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { obterCategoria } from '@/data/categorias';
import { cores, espaco, fonte, raio, toqueMinimo } from '@/theme';
import type { ItemLista } from '@/types';
import { formatarQuantidade, podeDiminuir } from '@/utils/quantidade';

type Props = {
  item: ItemLista;
  /** Sem os handlers (lista do histórico), o item fica só para leitura. */
  onMais?: () => void;
  onMenos?: () => void;
  onUnidade?: () => void;
  /** Toque no nome/emoji abre a edição do item. */
  onEditar?: () => void;
};

// Linha de um item da lista: faixa da categoria, emoji grande, nome, observação e quantidade com +/−.
// Tocar no nome abre a edição. Deslizar para excluir entra na próxima etapa.
export function ItemCard({ item, onMais, onMenos, onUnidade, onEditar }: Props) {
  const categoria = obterCategoria(item.categoria);
  const editavel = !!(onMais && onMenos);
  const menosAtivo = podeDiminuir(item.quantidade, item.unidade);

  return (
    <View style={styles.cartao}>
      <View style={[styles.faixa, { backgroundColor: categoria.cor }]} />
      <Pressable
        onPress={onEditar}
        disabled={!onEditar}
        accessibilityRole={onEditar ? 'button' : undefined}
        accessibilityLabel={onEditar ? `Editar ${item.nome}` : undefined}
        style={({ pressed }) => [styles.areaEditar, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.emoji}>{item.emoji}</Text>
        <View style={styles.textos}>
          <Text style={[styles.nome, item.pego && styles.nomePego]} numberOfLines={2}>
            {item.pego ? '✓ ' : ''}
            {item.nome}
          </Text>
          {item.observacao ? (
            <Text style={styles.observacao} numberOfLines={1}>
              {item.observacao}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {editavel ? (
        <View style={styles.controles}>
          <Pressable
            onPress={onMenos}
            disabled={!menosAtivo}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Diminuir ${item.nome}`}
            style={({ pressed }) => [styles.botao, !menosAtivo && styles.botaoDesligado, pressed && styles.botaoApertado]}
          >
            <Ionicons name="remove" size={20} color={menosAtivo ? cores.primariaEscura : cores.textoSuave} />
          </Pressable>
          <Pressable
            onPress={onUnidade}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${formatarQuantidade(item.quantidade)} ${item.unidade}. Toque para trocar a unidade`}
            style={({ pressed }) => [styles.quantidadeCaixa, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.quantidade}>{formatarQuantidade(item.quantidade)}</Text>
            <Text style={styles.unidade}>{item.unidade}</Text>
          </Pressable>
          <Pressable
            onPress={onMais}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Aumentar ${item.nome}`}
            style={({ pressed }) => [styles.botao, pressed && styles.botaoApertado]}
          >
            <Ionicons name="add" size={20} color={cores.primariaEscura} />
          </Pressable>
        </View>
      ) : (
        <Text style={styles.quantidadeLeitura}>
          {formatarQuantidade(item.quantidade)} {item.unidade}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    minHeight: toqueMinimo + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingRight: espaco.sm,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    overflow: 'hidden',
  },
  faixa: { width: 5, alignSelf: 'stretch' },
  areaEditar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco.md, alignSelf: 'stretch' },
  emoji: { fontSize: fonte.tamanho.emoji },
  textos: { flex: 1, paddingVertical: espaco.sm },
  nome: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.medio, color: cores.texto },
  nomePego: { textDecorationLine: 'line-through', color: cores.textoSuave },
  observacao: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  botao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.primariaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDesligado: { backgroundColor: cores.fundo },
  botaoApertado: { backgroundColor: cores.borda },
  quantidadeCaixa: { minWidth: 46, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  quantidade: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  unidade: { fontSize: 11, color: cores.textoSecundario, textDecorationLine: 'underline' },
  quantidadeLeitura: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, fontWeight: fonte.peso.medio, paddingRight: espaco.sm },
});
