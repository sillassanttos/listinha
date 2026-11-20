import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useListaStore } from '@/store/useListaStore';
import { raio } from '@/theme';
import { criarEstilos } from '@/theme/useCores';
import { chaveImagem } from '@/utils/imagens';

type Props = {
  nome: string;
  emoji: string;
  /** Lado do quadrado, em px (o emoji usa um pouco menos). */
  tamanho?: number;
  apagado?: boolean;
};

// Foto do item (Fase 2) com o emoji como reserva: sem foto, com a busca desligada,
// sem internet e sem cache, ou se a imagem falhar, aparece o emoji (seção 4 do LISTINHA.md).
export function ItemImagem({ nome, emoji, tamanho = 36, apagado }: Props) {
  const styles = useEstilos();
  const uri = useListaStore((s) => (s.imagensOnline ? s.imagens[chaveImagem(nome)]?.uri : null));
  const [falhou, setFalhou] = useState<string | null>(null);

  if (!uri || falhou === uri) {
    return <Text style={[{ fontSize: tamanho * 0.85, width: tamanho, textAlign: 'center' }, apagado && styles.apagado]}>{emoji}</Text>;
  }

  return (
    <View style={[styles.moldura, { width: tamanho, height: tamanho }, apagado && styles.apagado]}>
      <Image
        source={{ uri }}
        style={styles.imagem}
        contentFit="contain"
        cachePolicy="disk" // guardada no celular: aparece mesmo sem sinal depois da primeira vez
        transition={150}
        onError={() => setFalhou(uri)}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    </View>
  );
}

const useEstilos = criarEstilos((cores) => ({
  moldura: { borderRadius: raio.sm, overflow: 'hidden', backgroundColor: cores.superficie },
  imagem: { width: '100%', height: '100%' },
  apagado: { opacity: 0.5 },
}));
