import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { obterCategoria } from '@/data/categorias';
import { useListaStore } from '@/store/useListaStore';
import { cores, espaco, fonte, raio, toqueMinimo } from '@/theme';
import type { CategoriaId, ItemLista, Unidade } from '@/types';
import { categorizar } from '@/utils/categorizar';
import { categoriaSugerida } from '@/utils/categoriasManuais';
import {
  UNIDADES,
  ajustarQuantidade,
  formatarQuantidade,
  lerQuantidade,
  podeDiminuir,
  quantidadeAoTrocarUnidade,
} from '@/utils/quantidade';

// Editar item (seção 8.2): nome, quantidade, unidade, categoria e observação.
// Só itens da lista ativa; listas do histórico são só leitura.
export default function EditarItemTela() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useListaStore((s) => s.listaAtiva?.itens.find((i) => i.id === id));

  if (!item) {
    return (
      <View style={styles.centro}>
        <Stack.Screen options={{ title: 'Editar item' }} />
        <Text style={styles.ajuda}>Esse item não está mais na lista 🤔</Text>
      </View>
    );
  }
  return <Formulario item={item} />;
}

function Formulario({ item }: { item: ItemLista }) {
  const atualizarItem = useListaStore((s) => s.atualizarItem);
  const ordemCategorias = useListaStore((s) => s.ordemCategorias);
  const categoriasManuais = useListaStore((s) => s.categoriasManuais);

  const [nome, setNome] = useState(item.nome);
  const [quantidade, setQuantidade] = useState(item.quantidade);
  const [textoQuantidade, setTextoQuantidade] = useState(formatarQuantidade(item.quantidade));
  const [unidade, setUnidade] = useState<Unidade>(item.unidade);
  const [categoria, setCategoria] = useState<CategoriaId>(item.categoria);
  const [emoji, setEmoji] = useState(item.emoji);
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(false);
  const [observacao, setObservacao] = useState(item.observacao ?? '');

  const nomeValido = nome.trim().length > 0;
  const quantidadeValida = lerQuantidade(textoQuantidade) !== null;

  function definirQuantidade(q: number) {
    setQuantidade(q);
    setTextoQuantidade(formatarQuantidade(q));
  }

  function mudarNome(novo: string) {
    setNome(novo);
    // Enquanto o usuário não escolhe a categoria na mão, ela acompanha o nome
    // (inclusive a categoria que ele já escolheu antes para esse nome).
    const sugestao = categoriaSugerida(novo, categoriasManuais);
    if (!categoriaEscolhida) {
      setCategoria(sugestao.categoria);
      setEmoji(sugestao.emoji);
    } else {
      setEmoji(categorizar(novo).produto ? sugestao.emoji : obterCategoria(categoria).emoji);
    }
  }

  function escolherCategoria(c: CategoriaId) {
    setCategoriaEscolhida(true);
    setCategoria(c);
    // Item sem produto do catálogo usa o emoji da categoria.
    if (!categorizar(nome).produto) setEmoji(obterCategoria(c).emoji);
  }

  function escolherUnidade(u: Unidade) {
    setUnidade(u);
    definirQuantidade(quantidadeAoTrocarUnidade(quantidade, u));
  }

  function salvar() {
    if (!nomeValido || !quantidadeValida) return;
    atualizarItem(item.id, {
      nome,
      quantidade: lerQuantidade(textoQuantidade) ?? quantidade,
      unidade,
      categoria,
      emoji,
      observacao,
    });
    router.back();
  }

  const cat = obterCategoria(categoria);
  // Categoria diferente da automática fica lembrada ao salvar (Fase 2).
  const automatica = categorizar(nome).categoria;
  const nomeCurto = nome.trim();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: 'Editar item',
          headerRight: () => (
            <Pressable onPress={salvar} hitSlop={12} disabled={!nomeValido || !quantidadeValida} accessibilityRole="button">
              <Text style={[styles.salvarTopo, (!nomeValido || !quantidadeValida) && { color: cores.textoSuave }]}>Salvar</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Prévia */}
        <View style={[styles.previa, { backgroundColor: cat.corFundo }]}>
          <Text style={styles.previaEmoji}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.previaNome} numberOfLines={2}>
              {nome.trim() || 'Sem nome'}
            </Text>
            <Text style={[styles.previaCategoria, { color: cat.cor }]}>
              {cat.emoji} {cat.nome} · {formatarQuantidade(quantidade)} {unidade}
            </Text>
          </View>
        </View>

        <Text style={styles.rotulo}>Nome</Text>
        <TextInput
          value={nome}
          onChangeText={mudarNome}
          style={[styles.campo, !nomeValido && styles.campoErro]}
          placeholder="Nome do item"
          placeholderTextColor={cores.textoSuave}
          maxLength={60}
          autoCorrect={false}
        />
        {!nomeValido && <Text style={styles.erro}>O item precisa de um nome.</Text>}

        <Text style={styles.rotulo}>Quantidade</Text>
        <View style={styles.linhaQuantidade}>
          <Pressable
            onPress={() => definirQuantidade(ajustarQuantidade(quantidade, unidade, -1))}
            disabled={!podeDiminuir(quantidade, unidade)}
            accessibilityRole="button"
            accessibilityLabel="Diminuir"
            style={({ pressed }) => [styles.botaoRedondo, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="remove" size={24} color={podeDiminuir(quantidade, unidade) ? cores.primariaEscura : cores.textoSuave} />
          </Pressable>
          <TextInput
            value={textoQuantidade}
            onChangeText={(t) => {
              setTextoQuantidade(t);
              const q = lerQuantidade(t);
              if (q !== null) setQuantidade(q);
            }}
            onBlur={() => quantidadeValida && setTextoQuantidade(formatarQuantidade(quantidade))}
            keyboardType="decimal-pad"
            style={[styles.campo, styles.campoQuantidade, !quantidadeValida && styles.campoErro]}
            accessibilityLabel="Quantidade"
          />
          <Pressable
            onPress={() => definirQuantidade(ajustarQuantidade(quantidade, unidade, 1))}
            accessibilityRole="button"
            accessibilityLabel="Aumentar"
            style={({ pressed }) => [styles.botaoRedondo, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="add" size={24} color={cores.primariaEscura} />
          </Pressable>
        </View>
        {!quantidadeValida && <Text style={styles.erro}>Digite um número maior que zero, ex.: 2 ou 1,5.</Text>}

        <Text style={styles.rotulo}>Unidade</Text>
        <View style={styles.grade}>
          {UNIDADES.map((u) => {
            const ativa = u.id === unidade;
            return (
              <Pressable
                key={u.id}
                onPress={() => escolherUnidade(u.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativa }}
                accessibilityLabel={u.nome}
                style={[styles.opcao, ativa && styles.opcaoAtiva]}
              >
                <Text style={[styles.opcaoTexto, ativa && styles.opcaoTextoAtivo]}>{u.id}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.rotulo}>Categoria</Text>
        <View style={styles.grade}>
          {ordemCategorias.map((c) => {
            const info = obterCategoria(c);
            const ativa = c === categoria;
            return (
              <Pressable
                key={c}
                onPress={() => escolherCategoria(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativa }}
                style={[
                  styles.categoria,
                  { backgroundColor: ativa ? info.cor : info.corFundo, borderColor: info.cor + '55' },
                ]}
              >
                <Text style={[styles.categoriaTexto, { color: ativa ? '#FFFFFF' : info.cor }]}>
                  {info.emoji} {info.nome}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {nomeCurto && categoria !== automatica ? (
          <Text style={styles.dica}>
            💡 Da próxima vez, “{nomeCurto}” já entra em {cat.nome}.
          </Text>
        ) : null}

        <Text style={styles.rotulo}>Observação</Text>
        <TextInput
          value={observacao}
          onChangeText={setObservacao}
          style={[styles.campo, styles.campoObservacao]}
          placeholder="Ex.: integral, marca X, sem lactose"
          placeholderTextColor={cores.textoSuave}
          maxLength={80}
          multiline
        />

        <Botao titulo="Salvar" onPress={salvar} style={{ marginTop: espaco.lg, opacity: nomeValido && quantidadeValida ? 1 : 0.5 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  container: { padding: espaco.lg, gap: espaco.sm, paddingBottom: espaco.xxl },
  salvarTopo: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  previa: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, padding: espaco.lg, borderRadius: raio.lg, marginBottom: espaco.sm },
  previaEmoji: { fontSize: 40 },
  previaNome: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  previaCategoria: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.medio },
  rotulo: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario, marginTop: espaco.md },
  ajuda: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, textAlign: 'center' },
  campo: {
    minHeight: toqueMinimo,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.tamanho.normal,
    color: cores.texto,
  },
  campoErro: { borderColor: cores.perigo },
  erro: { fontSize: fonte.tamanho.pequeno, color: cores.perigo },
  linhaQuantidade: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  campoQuantidade: { width: 100, textAlign: 'center', fontSize: fonte.tamanho.grande, fontWeight: fonte.peso.negrito },
  botaoRedondo: {
    width: toqueMinimo,
    height: toqueMinimo,
    borderRadius: toqueMinimo / 2,
    backgroundColor: cores.primariaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pilula,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoAtiva: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  opcaoTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.medio, color: cores.texto },
  opcaoTextoAtivo: { color: cores.textoSobrePrimaria },
  categoria: { minHeight: 44, paddingHorizontal: espaco.md, borderRadius: raio.pilula, borderWidth: 1, justifyContent: 'center' },
  categoriaTexto: { fontSize: fonte.tamanho.pequeno + 1, fontWeight: fonte.peso.medio },
  dica: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario, marginTop: espaco.xs },
  campoObservacao: { minHeight: 72, paddingTop: espaco.md, textAlignVertical: 'top' },
});
