import { StyleSheet, View } from 'react-native';

import { cores, raio } from '@/theme';

type Props = { fracao: number; altura?: number; cor?: string; corTrilho?: string };

// Barra de progresso simples (0 a 1).
export function BarraProgresso({ fracao, altura = 8, cor, corTrilho }: Props) {
  const largura = `${Math.round(Math.min(Math.max(fracao, 0), 1) * 100)}%` as const;
  return (
    <View
      style={[styles.trilho, { height: altura }, corTrilho ? { backgroundColor: corTrilho } : null]}
      accessibilityRole="progressbar"
    >
      <View style={[styles.preenchido, { width: largura }, cor ? { backgroundColor: cor } : null]} />
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: { alignSelf: 'stretch', backgroundColor: cores.primariaClara, borderRadius: raio.pilula, overflow: 'hidden' },
  preenchido: { height: '100%', backgroundColor: cores.primaria, borderRadius: raio.pilula },
});
