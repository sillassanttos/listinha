import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { cores, espaco, fonte, raio, toqueMinimo } from '@/theme';
import type { ItemLista } from '@/types';
import { formatarQuantidadeUnidade } from '@/utils/quantidade';
import { formatarReais, lerPreco, precoParaCampo, totalDoItem, unidadeDoPreco } from '@/utils/preco';

import { Botao } from './Botao';

type Props = {
  item: ItemLista | null;
  /** Preço pago na compra anterior, para sugerir. */
  ultimo?: number;
  onSalvar: (preco: number | undefined) => void;
  onFechar: () => void;
};

// Preço do item no Modo Mercado (Fase 2). Opcional: "Pular" fecha sem mudar nada.
export function ModalPreco({ item, ultimo, onSalvar, onFechar }: Props) {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (item) setTexto(precoParaCampo(item.preco));
  }, [item]);

  if (!item) return null;

  const valor = lerPreco(texto);
  const invalido = texto.trim() !== '' && valor === null;
  const unidadePreco = unidadeDoPreco(item.unidade);
  const total = valor !== null ? totalDoItem({ ...item, preco: valor }) : undefined;
  // Item que já tinha preço e o campo foi esvaziado: o botão da esquerda apaga o preço.
  const apagar = item.preco !== undefined && !texto.trim();

  function salvar() {
    if (invalido) return;
    onSalvar(valor ?? undefined);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fundo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <View style={styles.janela}>
          <Text style={styles.titulo}>
            {item.emoji} {item.nome}
          </Text>
          <Text style={styles.ajuda}>
            Preço da etiqueta, por {unidadePreco} · você leva {formatarQuantidadeUnidade(item.quantidade, item.unidade)}
          </Text>

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
              accessibilityLabel={`Preço por ${unidadePreco}`}
            />
          </View>

          {invalido ? (
            <Text style={styles.erro}>Digite um valor como 18,90</Text>
          ) : total !== undefined ? (
            <Text style={styles.total}>Total deste item: {formatarReais(total)}</Text>
          ) : null}

          {ultimo !== undefined && item.preco === undefined && (
            <Pressable onPress={() => setTexto(precoParaCampo(ultimo))} hitSlop={6} accessibilityRole="button">
              <Text style={styles.ultimo}>Última compra: {formatarReais(ultimo)} · usar</Text>
            </Pressable>
          )}

          <View style={styles.botoes}>
            <Botao
              titulo={apagar ? 'Apagar preço' : 'Pular'}
              variante="secundario"
              onPress={() => (apagar ? onSalvar(undefined) : onFechar())}
              style={{ flex: 1 }}
            />
            <Botao titulo="Salvar" onPress={salvar} style={{ flex: 1, opacity: invalido ? 0.5 : 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  total: { fontSize: fonte.tamanho.normal, color: cores.primariaEscura, fontWeight: fonte.peso.medio },
  ultimo: { fontSize: fonte.tamanho.normal, color: cores.primariaEscura, textDecorationLine: 'underline' },
  botoes: { flexDirection: 'row', gap: espaco.md, marginTop: espaco.sm },
});
