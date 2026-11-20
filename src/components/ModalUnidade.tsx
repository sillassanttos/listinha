import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { espaco, fonte, raio, toqueMinimo } from '@/theme';
import { criarEstilos } from '@/theme/useCores';
import type { Unidade } from '@/types';
import { UNIDADES } from '@/utils/quantidade';

type Props = {
  visivel: boolean;
  nomeItem?: string;
  atual?: Unidade;
  onEscolher: (u: Unidade) => void;
  onFechar: () => void;
};

// Escolha rápida da unidade de um item (un, kg, g, L, ml, dz, pct, cx).
export function ModalUnidade({ visivel, nomeItem, atual, onEscolher, onFechar }: Props) {
  const styles = useEstilos();
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar} accessibilityLabel="Fechar">
        <Pressable style={styles.janela} onPress={() => {}}>
          <Text style={styles.titulo}>Unidade{nomeItem ? ` de ${nomeItem}` : ''}</Text>
          <View style={styles.grade}>
            {UNIDADES.map((u) => {
              const selecionada = u.id === atual;
              return (
                <Pressable
                  key={u.id}
                  onPress={() => onEscolher(u.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selecionada }}
                  accessibilityLabel={u.nome}
                  style={({ pressed }) => [styles.opcao, selecionada && styles.opcaoSelecionada, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.sigla, selecionada && styles.textoSelecionado]}>{u.id}</Text>
                  <Text style={[styles.nome, selecionada && styles.textoSelecionado]}>{u.nome}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useEstilos = criarEstilos((cores) => ({
  fundo: { flex: 1, justifyContent: 'center', padding: espaco.xl, backgroundColor: 'rgba(0,0,0,0.35)' },
  janela: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.xl, gap: espaco.lg },
  titulo: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    width: '23%',
    minHeight: toqueMinimo + 12,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoSelecionada: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  sigla: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  nome: { fontSize: 11, color: cores.textoSecundario },
  textoSelecionado: { color: cores.textoSobrePrimaria },
}));
