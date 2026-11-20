import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores, espaco, fonte, raio, toqueMinimo } from '@/theme';
import { type Frequencia, textoLembrete } from '@/utils/frequencia';

type Props = {
  lembretes: Frequencia[];
  onAdicionar: (f: Frequencia) => void;
};

// Fase 2: "Pode estar acabando" — itens que já passaram do intervalo de costume.
export function CartaoLembretes({ lembretes, onAdicionar }: Props) {
  if (lembretes.length === 0) return null;
  return (
    <View style={styles.cartao}>
      <Text style={styles.titulo}>🔔 Pode estar acabando</Text>
      {lembretes.map((f) => (
        <View key={f.nome} style={styles.linha}>
          <Text style={styles.emoji}>{f.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.texto}>
              {textoLembrete(f).charAt(0).toUpperCase() + textoLembrete(f).slice(1)}
            </Text>
            {f.intervaloMedio ? (
              <Text style={styles.detalhe}>Você costuma comprar a cada {f.intervaloMedio} dias</Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => onAdicionar(f)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar ${f.nome} à lista`}
            style={({ pressed }) => [styles.botao, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.botaoTexto}>+ Lista</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: '#FFF6E6',
    borderRadius: raio.lg,
    padding: espaco.lg,
    gap: espaco.sm,
    borderWidth: 1,
    borderColor: cores.destaque + '66',
  },
  titulo: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: '#9A6200' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, minHeight: toqueMinimo },
  emoji: { fontSize: 26 },
  texto: { fontSize: fonte.tamanho.normal, color: cores.texto },
  detalhe: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  botao: {
    minHeight: 40,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pilula,
    backgroundColor: cores.destaque,
    justifyContent: 'center',
  },
  botaoTexto: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: '#FFFFFF' },
});
