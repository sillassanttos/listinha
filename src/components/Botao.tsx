import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { espaco, fonte, raio, toqueMinimo } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  style?: StyleProp<ViewStyle>;
};

// Botão padrão do app: altura mínima de 48 px e leve escurecimento ao tocar.
export function Botao({ titulo, onPress, variante = 'primario', style }: Props) {
  const cores = useCores();
  const styles = useEstilos();
  const primario = variante === 'primario';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primario ? styles.primario : styles.secundario,
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Text style={[styles.texto, { color: primario ? cores.textoSobrePrimaria : cores.primariaEscura }]}>{titulo}</Text>
    </Pressable>
  );
}

const useEstilos = criarEstilos((cores) => ({
  base: {
    minHeight: toqueMinimo,
    paddingHorizontal: espaco.xl,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primario: { backgroundColor: cores.primaria },
  secundario: { backgroundColor: cores.primariaClara },
  texto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito },
}));
