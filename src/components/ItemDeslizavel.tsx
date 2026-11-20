import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { espaco, fonte, raio } from '@/theme';
import { criarEstilos } from '@/theme/useCores';

type Props = {
  children: ReactNode;
  /** Chamado quando o usuário desliza o item até o fim, para qualquer lado. */
  onExcluir: () => void;
};

const LARGURA_ACAO = 96;

function PainelExcluir({ lado }: { lado: 'esquerda' | 'direita' }) {
  const styles = useEstilos();
  return (
    <View style={[styles.painel, lado === 'esquerda' ? styles.painelEsquerda : styles.painelDireita]}>
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      <Text style={styles.painelTexto}>Excluir</Text>
    </View>
  );
}

// Deslizar o item para o lado exclui (seção 8.2). O "Desfazer" fica no aviso da tela.
export function ItemDeslizavel({ children, onExcluir }: Props) {
  const styles = useEstilos();
  return (
    <ReanimatedSwipeable
      friction={1.5}
      leftThreshold={LARGURA_ACAO}
      rightThreshold={LARGURA_ACAO}
      overshootFriction={8}
      renderLeftActions={() => <PainelExcluir lado="esquerda" />}
      renderRightActions={() => <PainelExcluir lado="direita" />}
      onSwipeableWillOpen={onExcluir}
      containerStyle={styles.container}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const useEstilos = criarEstilos((cores) => ({
  container: { borderRadius: raio.md, backgroundColor: cores.perigo },
  painel: {
    width: LARGURA_ACAO,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: cores.perigo,
  },
  painelEsquerda: { paddingRight: espaco.sm },
  painelDireita: { paddingLeft: espaco.sm },
  painelTexto: { color: '#FFFFFF', fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito },
}));
