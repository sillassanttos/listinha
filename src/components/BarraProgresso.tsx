import { StyleSheet, View } from 'react-native';

import { cores, raio } from '@/theme';

type Props = { fracao: number; altura?: number };

// Barra de progresso simples (0 a 1).
export function BarraProgresso({ fracao, altura = 8 }: Props) {
  const largura = `${Math.round(Math.min(Math.max(fracao, 0), 1) * 100)}%` as const;
  return (
    <View style={[styles.trilho, { height: altura }]} accessibilityRole="progressbar">
      <View style={[styles.preenchido, { width: largura }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: { alignSelf: 'stretch', backgroundColor: cores.primariaClara, borderRadius: raio.pilula, overflow: 'hidden' },
  preenchido: { height: '100%', backgroundColor: cores.primaria, borderRadius: raio.pilula },
});
