import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { type EstadoSync, useSituacaoSync } from '@/sync/sincronizador';
import { espaco, fonte, raio } from '@/theme';
import type { Cores } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';

const ROTULO: Record<EstadoSync, string> = {
  desligado: 'conectando…',
  'sem-login': 'entre na conta para sincronizar',
  conectando: 'conectando…',
  sincronizado: '✓ sincronizada',
  enviando: 'enviando…',
  'sem-conexao': 'sem sinal, sobe depois',
  'sem-acesso': 'você saiu desta lista',
};

function corDoEstado(estado: EstadoSync, cores: Cores): string {
  if (estado === 'sem-conexao') return cores.destaque;
  if (estado === 'sem-acesso' || estado === 'sem-login') return cores.perigo;
  return cores.primariaEscura;
}

// Fase 3: faixa "Lista da família" com a situação da sincronização; toque abre a tela Família.
export function SeloFamilia({ remotoId, listaId }: { remotoId: string; listaId: string }) {
  const cores = useCores();
  const styles = useEstilos();
  const { estado } = useSituacaoSync(remotoId);
  const cor = corDoEstado(estado, cores);
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

const useEstilos = criarEstilos((cores) => ({
  selo: {
    alignSelf: 'flex-start',
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs + 2,
    borderRadius: raio.pilula,
    borderWidth: 1,
    backgroundColor: cores.superficie,
  },
  texto: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.medio },
}));
