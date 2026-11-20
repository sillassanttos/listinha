import { Pressable, StyleSheet, Text } from 'react-native';

import { espaco, fonte, raio } from '@/theme';
import { criarEstilos, useCores, useVerCategoria } from '@/theme/useCores';
import type { Sugestao } from '@/utils/sugestoes';

type Props = {
  sugestao: Pick<Sugestao, 'nome' | 'emoji' | 'categoria'>;
  onPress: () => void;
  /** Texto pequeno depois do nome, ex.: "12 dias". */
  detalhe?: string;
  /** Destaque laranja (item que provavelmente está acabando). */
  destaque?: boolean;
};

// Chip de sugestão rápida: um toque e o item entra na lista.
export function ChipSugestao({ sugestao, onPress, detalhe, destaque }: Props) {
  const cores = useCores();
  const verCategoria = useVerCategoria();
  const styles = useEstilos();
  const categoria = verCategoria(sugestao.categoria);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Adicionar ${sugestao.nome}`}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: categoria.corFundo, borderColor: categoria.cor + '40' },
        destaque && { borderColor: cores.destaque, borderWidth: 2 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={styles.texto}>
        {sugestao.emoji} {sugestao.nome}
        {detalhe ? <Text style={[styles.detalhe, destaque && { color: cores.destaque }]}> · {detalhe}</Text> : null}
      </Text>
    </Pressable>
  );
}

const useEstilos = criarEstilos((cores) => ({
  chip: {
    minHeight: 40,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pilula,
    borderWidth: 1,
    justifyContent: 'center',
  },
  texto: { fontSize: fonte.tamanho.normal - 1, fontWeight: fonte.peso.medio, color: cores.texto },
  detalhe: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario },
}));
