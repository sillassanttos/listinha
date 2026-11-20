import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputInstance, View } from 'react-native';

import { obterCategoria } from '@/data/categorias';
import { espaco, fonte, raio, sombraCartao, toqueMinimo } from '@/theme';
import { criarEstilos, useCores, useVerCategoria } from '@/theme/useCores';
import type { Sugestao } from '@/utils/sugestoes';

type Props = {
  texto: string;
  onChangeTexto: (t: string) => void;
  /** Adiciona o texto digitado como está. */
  onAdicionar: () => void;
  /** Adiciona a sugestão tocada no autocompletar. */
  onEscolher: (s: Sugestao) => void;
  sugestoes: Sugestao[];
};

// Campo de adicionar com autocompletar logo abaixo (catálogo + histórico).
// Depois de adicionar, o campo continua focado para emendar o próximo item.
export const CampoAdicionar = forwardRef<TextInputInstance, Props>(function CampoAdicionar(
  { texto, onChangeTexto, onAdicionar, onEscolher, sugestoes },
  ref,
) {
  const cores = useCores();
  const verCategoria = useVerCategoria();
  const styles = useEstilos();
  const temTexto = texto.trim().length > 0;
  return (
    <View>
      <View style={styles.linha}>
        <TextInput
          ref={ref}
          value={texto}
          onChangeText={onChangeTexto}
          placeholder="Adicionar item… ex.: café"
          placeholderTextColor={cores.textoSuave}
          style={styles.campo}
          autoCorrect={false}
          autoCapitalize="sentences"
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={onAdicionar}
          accessibilityLabel="Nome do item"
        />
        <Pressable
          onPress={onAdicionar}
          disabled={!temTexto}
          accessibilityRole="button"
          accessibilityLabel="Adicionar item"
          style={({ pressed }) => [styles.botao, !temTexto && styles.botaoDesligado, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="add" size={28} color={cores.textoSobrePrimaria} />
        </Pressable>
      </View>

      {temTexto && sugestoes.length > 0 && (
        <View style={styles.sugestoes}>
          {sugestoes.map((s) => (
            <Pressable
              key={`${s.origem}-${s.nome}`}
              onPress={() => onEscolher(s)}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${s.nome}`}
              style={({ pressed }) => [styles.sugestao, pressed && { backgroundColor: cores.fundo }]}
            >
              <Text style={styles.sugestaoEmoji}>{s.emoji}</Text>
              <Text style={styles.sugestaoNome}>{s.nome}</Text>
              <Text style={[styles.sugestaoCategoria, { color: verCategoria(s.categoria).cor }]}>
                {s.origem === 'historico' ? 'já usado' : obterCategoria(s.categoria).nome}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

const useEstilos = criarEstilos((cores) => ({
  linha: { flexDirection: 'row', gap: espaco.sm },
  campo: {
    flex: 1,
    minHeight: toqueMinimo + 4,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.lg,
    fontSize: fonte.tamanho.medio,
    color: cores.texto,
  },
  botao: {
    width: toqueMinimo + 4,
    borderRadius: raio.md,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDesligado: { backgroundColor: cores.textoSuave },
  sugestoes: {
    marginTop: espaco.xs,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    overflow: 'hidden',
    ...sombraCartao,
  },
  sugestao: {
    minHeight: toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingHorizontal: espaco.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  sugestaoEmoji: { fontSize: 22 },
  sugestaoNome: { flex: 1, fontSize: fonte.tamanho.normal, color: cores.texto },
  sugestaoCategoria: { fontSize: fonte.tamanho.pequeno },
}));
