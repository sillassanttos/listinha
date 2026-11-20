import { StyleSheet, View } from 'react-native';

import { raio } from '@/theme';
import { criarEstilos } from '@/theme/useCores';

type Props = { fracao: number; altura?: number; cor?: string; corTrilho?: string };

// Barra de progresso simples (0 a 1).
export function BarraProgresso({ fracao, altura = 8, cor, corTrilho }: Props) {
  const styles = useEstilos();
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

const useEstilos = criarEstilos((cores) => ({
  trilho: { alignSelf: 'stretch', backgroundColor: cores.primariaClara, borderRadius: raio.pilula, overflow: 'hidden' },
  preenchido: { height: '100%', backgroundColor: cores.primaria, borderRadius: raio.pilula },
}));
