import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { espaco, fonte, raio, toqueMinimo } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';
import { lerPreco, precoParaCampo } from '@/utils/preco';

import { Botao } from './Botao';

type Props = {
  visivel: boolean;
  atual?: number;
  onSalvar: (valor: number | undefined) => void;
  onFechar: () => void;
};

const SUGESTOES = [100, 200, 300, 500];

// Orçamento da compra (Fase 2): limite opcional; o Modo Mercado avisa ao passar dele.
export function ModalOrcamento({ visivel, atual, onSalvar, onFechar }: Props) {
  const cores = useCores();
  const styles = useEstilos();
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (visivel) setTexto(precoParaCampo(atual));
  }, [visivel, atual]);

  const valor = lerPreco(texto);
  const invalido = texto.trim() !== '' && valor === null;

  function salvar() {
    if (invalido) return;
    onSalvar(valor ?? undefined);
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fundo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <View style={styles.janela}>
          <Text style={styles.titulo}>💰 Orçamento da compra</Text>
          <Text style={styles.ajuda}>Quanto você quer gastar no máximo? O app avisa quando o carrinho passar disso.</Text>

          <View style={styles.linhaCampo}>
            <Text style={styles.prefixo}>R$</Text>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              autoFocus
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={cores.textoSuave}
              style={[styles.campo, invalido && { borderColor: cores.perigo }]}
              returnKeyType="done"
              onSubmitEditing={salvar}
              accessibilityLabel="Valor do orçamento"
            />
          </View>
          {invalido && <Text style={styles.erro}>Digite um valor como 250 ou 250,00</Text>}

          <View style={styles.sugestoes}>
            {SUGESTOES.map((v) => (
              <Pressable
                key={v}
                onPress={() => setTexto(precoParaCampo(v))}
                accessibilityRole="button"
                style={({ pressed }) => [styles.sugestao, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.sugestaoTexto}>R$ {v}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.botoes}>
            {atual !== undefined ? (
              <Botao titulo="Tirar orçamento" variante="secundario" onPress={() => onSalvar(undefined)} style={{ flex: 1 }} />
            ) : (
              <Botao titulo="Cancelar" variante="secundario" onPress={onFechar} style={{ flex: 1 }} />
            )}
            <Botao titulo="Salvar" onPress={salvar} style={{ flex: 1, opacity: invalido ? 0.5 : 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useEstilos = criarEstilos((cores) => ({
  fundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  janela: {
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raio.lg,
    borderTopRightRadius: raio.lg,
    padding: espaco.xl,
    gap: espaco.md,
  },
  titulo: { fontSize: fonte.tamanho.grande, fontWeight: fonte.peso.negrito, color: cores.texto },
  ajuda: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  linhaCampo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  prefixo: { fontSize: fonte.tamanho.grande, fontWeight: fonte.peso.negrito, color: cores.textoSecundario },
  campo: {
    flex: 1,
    minHeight: toqueMinimo + 8,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.tamanho.titulo,
    fontWeight: fonte.peso.negrito,
    color: cores.texto,
  },
  erro: { fontSize: fonte.tamanho.pequeno, color: cores.perigo },
  sugestoes: { flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' },
  sugestao: {
    minHeight: 40,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pilula,
    backgroundColor: cores.primariaClara,
    justifyContent: 'center',
  },
  sugestaoTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.medio, color: cores.primariaEscura },
  botoes: { flexDirection: 'row', gap: espaco.md, marginTop: espaco.sm },
}));
