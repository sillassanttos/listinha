import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useListaStore } from '@/store/useListaStore';
import { espaco, fonte, raio } from '@/theme';
import { criarEstilos } from '@/theme/useCores';

type Props = { rotulo?: string; escuro?: boolean };

// Várias listas (Fase 3): escolhe para qual lista vão os itens desta tela (a "lista atual").
// Só aparece com mais de uma lista aberta. Tocar troca a atual (abrirLista).
export function SeletorLista({ rotulo = 'Vai para a lista:', escuro = false }: Props) {
  const styles = useEstilos();
  const listas = useListaStore((s) => s.listas);
  const atualId = useListaStore((s) => s.listaAtualId);
  const abrirLista = useListaStore((s) => s.abrirLista);
  if (listas.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.linha} keyboardShouldPersistTaps="handled">
      <Text style={[styles.rotulo, escuro && { color: '#FFFFFF' }]}>{rotulo}</Text>
      {listas.map((l) => {
        const ativa = l.id === atualId;
        return (
          <Pressable
            key={l.id}
            onPress={() => abrirLista(l.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: ativa }}
            accessibilityLabel={`Lista ${l.nome}${ativa ? ', escolhida' : ''}`}
            style={[styles.chip, ativa ? styles.chipAtivo : escuro && styles.chipEscuro]}
          >
            <Text style={[styles.chipTexto, ativa && styles.chipTextoAtivo]} numberOfLines={1}>
              {l.compartilhada ? '👨‍👩‍👧 ' : ''}
              {l.nome}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useEstilos = criarEstilos((cores) => ({
  linha: { alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xs },
  rotulo: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario },
  chip: {
    minHeight: 36,
    maxWidth: 180,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pilula,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    justifyContent: 'center',
  },
  chipEscuro: { borderColor: '#FFFFFF55' },
  chipAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  chipTexto: { fontSize: fonte.tamanho.pequeno + 1, fontWeight: fonte.peso.medio, color: cores.texto },
  chipTextoAtivo: { color: cores.textoSobrePrimaria },
}));
