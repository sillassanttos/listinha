import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { obterCategoria } from '@/data/categorias';
import { espaco, fonte, raio, sombraCartao } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';
import type { Lista } from '@/types';
import { formatarDataAmigavel } from '@/utils/datas';
import { calcularProgresso, textoProgresso } from '@/utils/lista';

import { BarraProgresso } from './BarraProgresso';

type Props = { lista: Lista; onPress: () => void };

// Cartão de destaque da lista ativa na tela Início.
export function CartaoListaAtiva({ lista, onPress }: Props) {
  const cores = useCores();
  const styles = useEstilos();
  const progresso = calcularProgresso(lista);
  // Emojis das primeiras categorias da lista, para dar uma prévia visual.
  const emojis = [...new Set(lista.itens.map((i) => obterCategoria(i.categoria).emoji))].slice(0, 6);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir a lista ${lista.nome}`}
      style={({ pressed }) => [styles.cartao, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.topo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rotulo}>LISTA ATIVA</Text>
          <Text style={styles.nome} numberOfLines={1}>
            {lista.nome}
          </Text>
          <Text style={styles.data}>Criada {formatarDataAmigavel(lista.criadaEm)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={cores.textoSuave} />
      </View>

      {emojis.length > 0 && <Text style={styles.emojis}>{emojis.join(' ')}</Text>}

      <BarraProgresso fracao={progresso.fracao} />
      <Text style={styles.progresso}>
        {progresso.total === 0 ? 'Lista vazia — toque para adicionar itens' : textoProgresso(progresso)}
      </Text>
    </Pressable>
  );
}

const useEstilos = criarEstilos((cores) => ({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    padding: espaco.xl,
    gap: espaco.md,
    borderLeftWidth: 6,
    borderLeftColor: cores.primaria,
    ...sombraCartao,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  rotulo: { fontSize: 11, fontWeight: fonte.peso.negrito, color: cores.primariaEscura, letterSpacing: 1 },
  nome: { fontSize: fonte.tamanho.grande, fontWeight: fonte.peso.negrito, color: cores.texto },
  data: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  emojis: { fontSize: 22 },
  progresso: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
}));
