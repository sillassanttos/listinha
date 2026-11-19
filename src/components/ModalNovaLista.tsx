import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { cores, espaco, fonte, raio, toqueMinimo } from '@/theme';

import { Botao } from './Botao';

type Props = {
  visivel: boolean;
  /** Texto explicando o que acontece com a lista atual, se houver. */
  aviso?: string;
  onCancelar: () => void;
  onCriar: (nome: string) => void;
};

const NOME_PADRAO = 'Compra da semana';

// Janela para dar nome à lista nova.
export function ModalNovaLista({ visivel, aviso, onCancelar, onCriar }: Props) {
  const [nome, setNome] = useState(NOME_PADRAO);

  useEffect(() => {
    if (visivel) setNome(NOME_PADRAO);
  }, [visivel]);

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onCancelar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fundo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancelar} accessibilityLabel="Fechar" />
        <View style={styles.janela}>
          <Text style={styles.titulo}>Nova lista 📝</Text>
          {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
          <Text style={styles.rotulo}>Nome da lista</Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            autoFocus
            selectTextOnFocus
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={() => onCriar(nome)}
            style={styles.campo}
            placeholder={NOME_PADRAO}
            placeholderTextColor={cores.textoSuave}
          />
          <View style={styles.botoes}>
            <Botao titulo="Cancelar" variante="secundario" onPress={onCancelar} style={{ flex: 1 }} />
            <Botao titulo="Criar" onPress={() => onCriar(nome)} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, justifyContent: 'center', padding: espaco.xl, backgroundColor: 'rgba(0,0,0,0.35)' },
  janela: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.xl, gap: espaco.md },
  titulo: { fontSize: fonte.tamanho.grande, fontWeight: fonte.peso.negrito, color: cores.texto },
  aviso: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  rotulo: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario },
  campo: {
    minHeight: toqueMinimo,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.tamanho.normal,
    color: cores.texto,
  },
  botoes: { flexDirection: 'row', gap: espaco.md, marginTop: espaco.sm },
});
