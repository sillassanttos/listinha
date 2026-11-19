import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { cores, duracaoAnimacao, espaco, fonte, raio } from '@/theme';

type Props = {
  /** Texto do aviso; null esconde. Trocar o texto reinicia o tempo. */
  mensagem: string | null;
  /** Identificador que muda a cada aviso, para reiniciar mesmo com o mesmo texto. */
  chave?: number;
  acao?: { titulo: string; onPress: () => void };
  duracao?: number;
  onFechar: () => void;
};

// Snackbar simples no rodapé. Reaproveitado depois pelo "desfazer" ao excluir.
export function Aviso({ mensagem, chave, acao, duracao = 2500, onFechar }: Props) {
  const opacidade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!mensagem) return;
    Animated.timing(opacidade, { toValue: 1, duration: duracaoAnimacao, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacidade, { toValue: 0, duration: duracaoAnimacao, useNativeDriver: true }).start(() => onFechar());
    }, duracao);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem, chave]);

  if (!mensagem) return null;

  return (
    <Animated.View style={[styles.caixa, { opacity: opacidade }]} accessibilityLiveRegion="polite">
      <Text style={styles.texto}>{mensagem}</Text>
      {acao && (
        <Pressable onPress={acao.onPress} hitSlop={12}>
          <Text style={styles.acao}>{acao.titulo}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    position: 'absolute',
    left: espaco.lg,
    right: espaco.lg,
    bottom: espaco.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.md,
    paddingHorizontal: espaco.lg,
    borderRadius: raio.md,
    backgroundColor: cores.texto,
  },
  texto: { flex: 1, color: cores.superficie, fontSize: fonte.tamanho.normal },
  acao: { color: cores.destaque, fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito },
});
