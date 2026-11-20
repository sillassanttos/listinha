import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { useListaStore } from '@/store/useListaStore';
import { espaco, fonte, raio, toqueMinimo } from '@/theme';
import { criarEstilos, useCores, useVerCategoria } from '@/theme/useCores';
import { categorizar } from '@/utils/categorizar';
import { interpretarTexto } from '@/utils/importar';
import { formatarQuantidade } from '@/utils/quantidade';

// "Importar do WhatsApp" (Fase 2): colar o texto da lista e o app separa um item por linha.
// Mostra a prévia com a categoria de cada item; dá para desmarcar o que não quiser.
export default function ImportarTela() {
  const cores = useCores();
  const verCategoria = useVerCategoria();
  const styles = useEstilos();
  const importarItens = useListaStore((s) => s.importarItens);
  const definirAvisoPendente = useListaStore((s) => s.definirAvisoPendente);

  const [texto, setTexto] = useState('');
  const [desmarcados, setDesmarcados] = useState<Set<number>>(new Set());

  const itens = useMemo(() => interpretarTexto(texto), [texto]);
  const escolhidos = itens.filter((_, i) => !desmarcados.has(i));

  function mudarTexto(t: string) {
    setTexto(t);
    setDesmarcados(new Set());
  }

  async function colar() {
    try {
      const colado = await Clipboard.getStringAsync();
      if (colado) mudarTexto(texto ? `${texto}\n${colado}` : colado);
    } catch {
      // sem permissão ou área de transferência vazia: a pessoa pode colar segurando o campo
    }
  }

  function alternar(i: number) {
    setDesmarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(i)) novo.delete(i);
      else novo.add(i);
      return novo;
    });
  }

  function importar() {
    if (escolhidos.length === 0) return;
    const r = importarItens(escolhidos);
    definirAvisoPendente(
      `📋 ${r.adicionados} ${r.adicionados === 1 ? 'item importado' : 'itens importados'}` +
        (r.jaEstavam ? ` (${r.jaEstavam} já estava${r.jaEstavam === 1 ? '' : 'm'} na lista)` : ''),
    );
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/lista/[id]', params: { id: r.lista.id } });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Importar do WhatsApp' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.ajuda}>
          Copie a lista no WhatsApp e cole aqui. Cada linha vira um item; dá para escrever a quantidade, tipo
          "2 kg de arroz" ou "leite x3".
        </Text>

        <Pressable
          onPress={colar}
          accessibilityRole="button"
          style={({ pressed }) => [styles.botaoColar, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="clipboard-outline" size={20} color={cores.primariaEscura} />
          <Text style={styles.botaoColarTexto}>Colar do WhatsApp</Text>
        </Pressable>

        <TextInput
          value={texto}
          onChangeText={mudarTexto}
          multiline
          placeholder={'- arroz\n- 2 kg de feijão\n- leite x3\n- café'}
          placeholderTextColor={cores.textoSuave}
          style={styles.campo}
          autoCorrect={false}
          textAlignVertical="top"
          accessibilityLabel="Texto da lista"
        />

        {itens.length > 0 && (
          <View style={styles.previa}>
            <Text style={styles.rotulo}>
              {escolhidos.length} de {itens.length} {itens.length === 1 ? 'item' : 'itens'} — toque para desmarcar
            </Text>
            {itens.map((item, i) => {
              const marcado = !desmarcados.has(i);
              const sugestao = categorizar(item.nome);
              const categoria = verCategoria(sugestao.categoria);
              const unidade = item.unidade ?? sugestao.unidade;
              return (
                <Pressable
                  key={`${i}-${item.nome}`}
                  onPress={() => alternar(i)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marcado }}
                  style={[styles.linha, !marcado && { opacity: 0.4 }]}
                >
                  <Ionicons
                    name={marcado ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={marcado ? cores.primaria : cores.textoSuave}
                  />
                  <Text style={styles.emoji}>{sugestao.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nome}>{item.nome}</Text>
                    <Text style={[styles.detalhe, { color: categoria.cor }]}>
                      {categoria.nome}
                      {item.quantidade ? ` · ${formatarQuantidade(item.quantidade)} ${unidade}` : ''}
                      {item.observacao ? ` · ${item.observacao}` : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Botao
          titulo={
            escolhidos.length
              ? `Adicionar ${escolhidos.length} ${escolhidos.length === 1 ? 'item' : 'itens'} à lista`
              : 'Cole um texto para começar'
          }
          onPress={importar}
          style={{ opacity: escolhidos.length ? 1 : 0.5 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useEstilos = criarEstilos((cores) => ({
  container: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },
  ajuda: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario },
  botaoColar: {
    minHeight: toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.sm,
    borderRadius: raio.md,
    backgroundColor: cores.primariaClara,
  },
  botaoColarTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  campo: {
    minHeight: 140,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    padding: espaco.md,
    fontSize: fonte.tamanho.normal,
    color: cores.texto,
  },
  previa: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.md, gap: espaco.xs },
  rotulo: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario, marginBottom: espaco.xs },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, minHeight: toqueMinimo },
  emoji: { fontSize: 24 },
  nome: { fontSize: fonte.tamanho.normal, color: cores.texto, fontWeight: fonte.peso.medio },
  detalhe: { fontSize: fonte.tamanho.pequeno },
}));
