import { StyleSheet, Text } from 'react-native';

import { fonte } from '@/theme';
import { useCores } from '@/theme/useCores';
import { formatarVariacao } from '@/utils/historicoPrecos';

// Selo de variação de preço: subiu (vermelho, ↑), baixou (verde, ↓) ou igual (cinza).
// A cor nunca vem sozinha: sempre com seta e texto.
export function VariacaoPreco({ variacao }: { variacao: number | undefined }) {
  const cores = useCores();
  if (variacao === undefined) return null;
  const texto = formatarVariacao(variacao);
  const igual = texto === 'igual';
  const subiu = !igual && variacao > 0;
  const cor = igual ? cores.textoSecundario : subiu ? cores.perigo : cores.primariaEscura;
  const seta = igual ? '=' : subiu ? '↑' : '↓';
  return (
    <Text
      style={[styles.selo, { color: cor, backgroundColor: cor + '14' }]}
      accessibilityLabel={igual ? 'Preço igual ao da compra anterior' : `Preço ${subiu ? 'subiu' : 'baixou'} ${texto.replace(/[+−]/, '')}`}
    >
      {seta} {texto}
    </Text>
  );
}

const styles = StyleSheet.create({
  selo: {
    fontSize: fonte.tamanho.pequeno,
    fontWeight: fonte.peso.negrito,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
