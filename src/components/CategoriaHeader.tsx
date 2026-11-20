import { StyleSheet, Text, View } from 'react-native';

import { espaco, fonte, raio } from '@/theme';
import { useCores, useVerCategoria } from '@/theme/useCores';
import type { CategoriaId } from '@/types';

type Props = { categoria: CategoriaId; quantidade: number };

// Cabeçalho de grupo: emoji + nome da categoria + contador, na cor suave da categoria.
export function CategoriaHeader({ categoria, quantidade }: Props) {
  const cores = useCores();
  const verCategoria = useVerCategoria();
  const c = verCategoria(categoria);
  return (
    <View
      style={[styles.cabecalho, { backgroundColor: c.corFundo }]}
      accessibilityRole="header"
      accessibilityLabel={`${c.nome}, ${quantidade} ${quantidade === 1 ? 'item' : 'itens'}`}
    >
      <Text style={styles.emoji}>{c.emoji}</Text>
      <Text style={[styles.nome, { color: c.cor }]}>{c.nome}</Text>
      <View style={[styles.contador, { backgroundColor: c.cor }]}>
        <Text style={[styles.contadorTexto, { color: cores.textoSobreCor }]}>{quantidade}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.md,
    marginTop: espaco.md,
    marginBottom: espaco.xs,
  },
  emoji: { fontSize: 20 },
  nome: { flex: 1, fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito },
  contador: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  contadorTexto: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito },
});
