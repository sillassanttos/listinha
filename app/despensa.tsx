import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { CategoriaHeader } from '@/components/CategoriaHeader';
import { SeletorLista } from '@/components/SeletorLista';
import { useListaStore } from '@/store/useListaStore';
import { espaco, fonte, raio, toqueMinimo } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';
import { type ItemDespensa, filtrarDespensa, itensDaCasa, paraImportar, secoesDespensa } from '@/utils/despensa';
import type { ItemRemovido } from '@/utils/lista';
import { chaveBusca } from '@/utils/normalizar';
import { formatarQuantidadeUnidade } from '@/utils/quantidade';
import { vibrarLeve, vibrarPego } from '@/utils/vibrar';

type Secao = { titulo: 'acabando' | ItemDespensa['categoria']; data: ItemDespensa[] };

// Modo Despensa / "Acabou" (Fase 2): em casa, toque em "Acabou" no que terminou e o item
// vai para a lista atual (a aberta por último; dá para trocar no seletor). Sem lista, uma "Compra da semana" é criada.
export default function DespensaTela() {
  const cores = useCores();
  const styles = useEstilos();
  const historico = useListaStore((s) => s.historico);
  const listaAtiva = useListaStore((s) => s.listaAtiva);
  const ordemCategorias = useListaStore((s) => s.ordemCategorias);
  const importarItens = useListaStore((s) => s.importarItens);
  const removerItem = useListaStore((s) => s.removerItem);
  const restaurarItem = useListaStore((s) => s.restaurarItem);

  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<{ mensagem: string; chave: number; removido?: ItemRemovido } | null>(null);

  const casa = useMemo(() => itensDaCasa(historico), [historico]);
  const filtrados = useMemo(() => filtrarDespensa(casa, texto), [casa, texto]);
  const secoes = useMemo<Secao[]>(() => {
    const { acabando, secoes: porCorredor } = secoesDespensa(filtrados, ordemCategorias);
    return [
      ...(acabando.length ? [{ titulo: 'acabando' as const, data: acabando }] : []),
      ...porCorredor.map((s) => ({ titulo: s.categoria, data: s.data })),
    ];
  }, [filtrados, ordemCategorias]);

  // Itens que já estão na lista ativa (não pegos), pela chave do nome.
  const naLista = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of listaAtiva?.itens ?? []) if (!i.pego) m.set(chaveBusca(i.nome), i.id);
    return m;
  }, [listaAtiva]);

  const textoLimpo = texto.trim();
  const podeAdicionarDigitado = !!chaveBusca(textoLimpo) && !casa.some((i) => i.chave === chaveBusca(textoLimpo));

  function acabou(item: { nome: string; quantidade?: number; unidade?: ItemDespensa['unidade'] }) {
    const r = importarItens([item]);
    vibrarPego();
    setAviso({
      mensagem: r.adicionados ? `🛒 ${item.nome} vai na lista "${r.lista.nome}"` : `${item.nome} já está na lista 👍`,
      chave: Date.now(),
    });
  }

  function tirarDaLista(item: ItemDespensa) {
    const id = naLista.get(item.chave);
    if (!id) return;
    const removido = removerItem(id);
    vibrarLeve();
    if (removido) setAviso({ mensagem: `${item.nome} saiu da lista`, chave: Date.now(), removido });
  }

  function adicionarDigitado() {
    if (!podeAdicionarDigitado) return;
    acabou({ nome: textoLimpo });
    setTexto('');
  }

  const vazio = casa.length === 0;

  return (
    <View style={styles.tela}>
      <SectionList
        sections={secoes}
        keyExtractor={(i) => i.chave}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <View style={{ gap: espaco.sm, marginBottom: espaco.sm }}>
            <Text style={styles.intro}>
              Em casa, toque em <Text style={styles.negrito}>Acabou</Text> no que terminou: o item vai para{' '}
              {listaAtiva ? `a lista "${listaAtiva.nome}"` : 'uma lista nova'}.
            </Text>
            <SeletorLista />
            <View style={styles.busca}>
              <Ionicons name="search" size={20} color={cores.textoSuave} />
              <TextInput
                value={texto}
                onChangeText={setTexto}
                onSubmitEditing={adicionarDigitado}
                placeholder={vazio ? 'O que acabou? Ex.: café' : 'Procurar ou digitar o que acabou'}
                placeholderTextColor={cores.textoSuave}
                style={styles.buscaCampo}
                returnKeyType="done"
                autoCorrect={false}
                accessibilityLabel="Procurar ou digitar o que acabou"
              />
              {texto ? (
                <Pressable onPress={() => setTexto('')} hitSlop={10} accessibilityLabel="Limpar busca">
                  <Ionicons name="close-circle" size={20} color={cores.textoSuave} />
                </Pressable>
              ) : null}
            </View>
            {podeAdicionarDigitado && (
              <Pressable
                onPress={adicionarDigitado}
                accessibilityRole="button"
                style={({ pressed }) => [styles.adicionarDigitado, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="add-circle" size={22} color={cores.primariaEscura} />
                <Text style={styles.adicionarDigitadoTexto} numberOfLines={1}>
                  “{textoLimpo}” acabou
                </Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          vazio ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioEmoji}>🏠</Text>
              <Text style={styles.vazioTitulo}>Sua despensa aparece aqui</Text>
              <Text style={styles.vazioTexto}>
                Depois da primeira compra concluída, os itens que você compra ficam listados para marcar o que
                acabou. Enquanto isso, digite acima.
              </Text>
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) =>
          section.titulo === 'acabando' ? (
            <View style={styles.cabecalhoAcabando} accessibilityRole="header">
              <Text style={styles.cabecalhoAcabandoTexto}>⏰ Pode estar acabando</Text>
              <Text style={styles.cabecalhoAcabandoContador}>{section.data.length}</Text>
            </View>
          ) : (
            <CategoriaHeader categoria={section.titulo} quantidade={section.data.length} />
          )
        }
        renderItem={({ item }) => {
          const estaNaLista = naLista.has(item.chave);
          return (
            <View style={styles.linha}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome} numberOfLines={1}>
                  {item.nome}
                </Text>
                <Text style={styles.detalhe}>
                  Última: {formatarQuantidadeUnidade(item.quantidade, item.unidade)} · {item.vezes}{' '}
                  {item.vezes === 1 ? 'compra' : 'compras'}
                </Text>
              </View>
              {estaNaLista ? (
                <Pressable
                  onPress={() => tirarDaLista(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.nome} já está na lista. Tocar tira da lista`}
                  style={({ pressed }) => [styles.botao, styles.botaoNaLista, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="checkmark" size={18} color={cores.textoSobrePrimaria} />
                  <Text style={[styles.botaoTexto, { color: cores.textoSobrePrimaria }]}>Na lista</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => acabou(paraImportar(item))}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.nome} acabou. Colocar na lista`}
                  style={({ pressed }) => [styles.botao, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.botaoTexto}>Acabou</Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          listaAtiva && listaAtiva.itens.length > 0 ? (
            <Pressable
              onPress={() => router.push({ pathname: '/lista/[id]', params: { id: listaAtiva.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.verLista, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.verListaTexto}>Ver a lista ({listaAtiva.itens.filter((i) => !i.pego).length} para comprar)</Text>
              <Ionicons name="chevron-forward" size={20} color={cores.primariaEscura} />
            </Pressable>
          ) : undefined
        }
      />

      <Aviso
        mensagem={aviso?.mensagem ?? null}
        chave={aviso?.chave}
        acao={
          aviso?.removido
            ? {
                titulo: 'Desfazer',
                onPress: () => {
                  if (aviso.removido) restaurarItem(aviso.removido);
                  setAviso(null);
                },
              }
            : undefined
        }
        duracao={aviso?.removido ? 4000 : 2500}
        onFechar={() => setAviso(null)}
      />
    </View>
  );
}

const useEstilos = criarEstilos((cores) => ({
  tela: { flex: 1, backgroundColor: cores.fundo },
  container: { padding: espaco.lg, paddingBottom: espaco.xxl + 40, gap: espaco.xs },
  intro: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario },
  negrito: { fontWeight: fonte.peso.negrito, color: cores.texto },
  busca: {
    minHeight: toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
  },
  buscaCampo: { flex: 1, minHeight: toqueMinimo, fontSize: fonte.tamanho.normal, color: cores.texto },
  adicionarDigitado: {
    minHeight: toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    borderRadius: raio.md,
    backgroundColor: cores.primariaClara,
  },
  adicionarDigitadoTexto: { flex: 1, fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  cabecalhoAcabando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.md,
    backgroundColor: cores.avisoFundo,
    marginTop: espaco.sm,
  },
  cabecalhoAcabandoTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.avisoTexto },
  cabecalhoAcabandoContador: { fontSize: fonte.tamanho.pequeno, color: cores.avisoTexto },
  linha: {
    minHeight: toqueMinimo + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
  },
  emoji: { fontSize: 26 },
  nome: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.medio, color: cores.texto },
  detalhe: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  botao: {
    minHeight: 40,
    minWidth: 96,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pilula,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoNaLista: { backgroundColor: cores.primaria },
  botaoTexto: { fontSize: fonte.tamanho.pequeno + 1, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  vazio: { alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xxl, paddingHorizontal: espaco.lg },
  vazioEmoji: { fontSize: 56 },
  vazioTitulo: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  vazioTexto: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, textAlign: 'center' },
  verLista: {
    minHeight: toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.xs,
    marginTop: espaco.lg,
  },
  verListaTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
}));
