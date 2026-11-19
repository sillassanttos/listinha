import { Pressable, StyleSheet, Text } from 'react-native';

import { obterCategoria } from '@/data/categorias';
import { espaco, fonte, raio } from '@/theme';
import type { Sugestao } from '@/utils/sugestoes';

type Props = { sugestao: Sugestao; onPress: () => void };

// Chip de sugestão rápida: um toque e o item entra na lista.
export function ChipSugestao({ sugestao, onPress }: Props) {
  const categoria = obterCategoria(sugestao.categoria);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Adicionar ${sugestao.nome}`}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: categoria.corFundo, borderColor: categoria.cor + '40' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={styles.texto}>
        {sugestao.emoji} {sugestao.nome}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pilula,
    borderWidth: 1,
    justifyContent: 'center',
  },
  texto: { fontSize: fonte.tamanho.normal - 1, fontWeight: fonte.peso.medio },
});
