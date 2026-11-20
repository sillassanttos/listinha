import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { type EstadoSync, useSituacaoSync } from '@/sync/sincronizador';
import { cores, espaco, fonte, raio } from '@/theme';

const ROTULO: Record<EstadoSync, string> = {
  desligado: 'conectando…',
  'sem-login': 'entre na conta para sincronizar',
  conectando: 'conectando…',
  sincronizado: '✓ sincronizada',
  enviando: 'enviando…',
  'sem-conexao': 'sem sinal, sobe depois',
  'sem-acesso': 'você saiu desta lista',
};

const COR: Partial<Record<EstadoSync, string>> = {
  'sem-conexao': cores.destaque,
  'sem-acesso': cores.perigo,
  'sem-login': cores.perigo,
};

// Fase 3: faixa "Lista da família" com a situação da sincronização; toque abre a tela Família.
export function SeloFamilia({ remotoId, listaId }: { remotoId: string; listaId: string }) {
  const { estado } = useSituacaoSync(remotoId);
  const cor = COR[estado] ?? cores.primariaEscura;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/familia', params: { lista: listaId } })}
      accessibilityRole="button"
      accessibilityLabel={`Lista da família, ${ROTULO[estado]}. Abrir Família`}
      style={({ pressed }) => [styles.selo, { borderColor: cor + '55' }, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.texto, { color: cor }]} numberOfLines={1}>
        👨‍👩‍👧 Lista da família · {ROTULO[estado]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  selo: {
    alignSelf: 'flex-start',
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs + 2,
    borderRadius: raio.pilula,
    borderWidth: 1,
    backgroundColor: cores.superficie,
  },
  texto: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.medio },
});
