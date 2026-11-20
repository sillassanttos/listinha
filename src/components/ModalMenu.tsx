import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { espaco, fonte, raio, toqueMinimo } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';

export type OpcaoMenu = {
  titulo: string;
  detalhe?: string;
  icone: ComponentProps<typeof Ionicons>['name'];
  perigo?: boolean;
  onPress: () => void;
};

type Props = { visivel: boolean; titulo: string; opcoes: OpcaoMenu[]; onFechar: () => void };

// Menu simples em folha no rodapé (o Alert do Android só aceita 3 botões).
export function ModalMenu({ visivel, titulo, opcoes, onFechar }: Props) {
  const cores = useCores();
  const styles = useEstilos();
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.fundo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar menu" />
        <View style={styles.folha}>
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          {opcoes.map((o) => (
            <Pressable
              key={o.titulo}
              onPress={() => {
                onFechar();
                o.onPress();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.opcao, pressed && { backgroundColor: cores.fundo }]}
            >
              <Ionicons name={o.icone} size={22} color={o.perigo ? cores.perigo : cores.primariaEscura} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.opcaoTexto, o.perigo && { color: cores.perigo }]}>{o.titulo}</Text>
                {o.detalhe ? <Text style={styles.detalhe}>{o.detalhe}</Text> : null}
              </View>
            </Pressable>
          ))}
          <Pressable onPress={onFechar} accessibilityRole="button" style={styles.cancelar}>
            <Text style={styles.cancelarTexto}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const useEstilos = criarEstilos((cores) => ({
  fundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  folha: {
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raio.lg,
    borderTopRightRadius: raio.lg,
    padding: espaco.lg,
    paddingBottom: espaco.xl,
    gap: espaco.xs,
  },
  titulo: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario, marginBottom: espaco.xs },
  opcao: {
    minHeight: toqueMinimo + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingHorizontal: espaco.sm,
    borderRadius: raio.md,
  },
  opcaoTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.medio, color: cores.texto },
  detalhe: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  cancelar: { minHeight: toqueMinimo, alignItems: 'center', justifyContent: 'center', marginTop: espaco.sm },
  cancelarTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.textoSecundario },
}));
