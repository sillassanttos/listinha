import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, SectionList, Share, StyleSheet, Text, type TextInputInstance, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { CampoAdicionar } from '@/components/CampoAdicionar';
import { CategoriaHeader } from '@/components/CategoriaHeader';
import { ChipSugestao } from '@/components/ChipSugestao';
import { ItemCard } from '@/components/ItemCard';
import { ItemDeslizavel } from '@/components/ItemDeslizavel';
import { ModalUnidade } from '@/components/ModalUnidade';
import { SeloFamilia } from '@/components/SeloFamilia';
import { useBuscarImagens } from '@/store/useBuscarImagens';
import { useListaStore } from '@/store/useListaStore';
import { cores, espaco, fonte } from '@/theme';
import { agruparPorCategoria } from '@/utils/agrupar';
import { gerarTextoLista } from '@/utils/compartilhar';
import type { ResultadoAdicionar } from '@/utils/lista';
import { formatarQuantidadeUnidade } from '@/utils/quantidade';
import { buscarSugestoes, chipsSugestao, itensProprios } from '@/utils/sugestoes';
import { rotuloCurto, sugestoesPorFrequencia } from '@/utils/frequencia';
import { chaveBusca } from '@/utils/normalizar';

// Tela Lista (seção 8.2): adicionar com autocompletar e chips, itens agrupados por categoria.
// Quantidade com +/− e troca de unidade direto no item; tocar no nome abre a edição;
// deslizar para o lado exclui, com "Desfazer" no aviso por 4 s.
export default function ListaTela() {
  const { id, aviso: avisoInicial } = useLocalSearchParams<{ id: string; aviso?: string }>();
  const lista = useListaStore((s) => (s.listaAtiva?.id === id ? s.listaAtiva : s.historico.find((l) => l.id === id)));
  const historico = useListaStore((s) => s.historico);
  const ordemCategorias = useListaStore((s) => s.ordemCategorias);
  const adicionarItem = useListaStore((s) => s.adicionarItem);
  const mudarQuantidade = useListaStore((s) => s.mudarQuantidade);
  const mudarUnidade = useListaStore((s) => s.mudarUnidade);
  const removerItem = useListaStore((s) => s.removerItem);
  const restaurarItem = useListaStore((s) => s.restaurarItem);

  const [texto, setTexto] = useState('');
  const [itemUnidadeId, setItemUnidadeId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{
    mensagem: string;
    chave: number;
    duracao?: number;
    acao?: { titulo: string; onPress: () => void };
  } | null>(null);
  const campoRef = useRef<TextInputInstance>(null);

  // Aviso vindo de outra tela (ex.: "Repetir última compra" no Início, "Importar do WhatsApp").
  useEffect(() => {
    if (avisoInicial) setAviso({ mensagem: avisoInicial, chave: Date.now(), duracao: 3500 });
  }, [avisoInicial]);
  const avisoPendente = useListaStore((s) => s.avisoPendente);
  const definirAvisoPendente = useListaStore((s) => s.definirAvisoPendente);
  useEffect(() => {
    if (!avisoPendente) return;
    setAviso({ mensagem: avisoPendente, chave: Date.now(), duracao: 3500 });
    definirAvisoPendente(null);
  }, [avisoPendente, definirAvisoPendente]);

  const proprios = useMemo(() => itensProprios(historico), [historico]);
  const sugestoes = useMemo(() => buscarSugestoes(texto, proprios), [texto, proprios]);
  const chips = useMemo(() => (lista ? chipsSugestao(lista) : []), [lista]);
  // Fase 2: o que a pessoa costuma comprar (do histórico); some dos chips rápidos para não repetir.
  const frequentes = useMemo(
    () => (lista && !lista.finalizadaEm ? sugestoesPorFrequencia(historico, lista) : []),
    [historico, lista],
  );
  // Fase 2: fotos do Open Food Facts para itens fora do catálogo (só na lista ativa).
  useBuscarImagens(lista && !lista.finalizadaEm ? lista.itens : undefined);
  const chipsRapidos = useMemo(() => {
    const ja = new Set(frequentes.map((f) => chaveBusca(f.nome)));
    return chips.filter((c) => !ja.has(chaveBusca(c.nome)));
  }, [chips, frequentes]);
  const secoes = useMemo(
    () =>
      lista ? agruparPorCategoria(lista.itens, ordemCategorias).map((g) => ({ categoria: g.categoria, data: g.itens })) : [],
    [lista, ordemCategorias],
  );

  if (!lista) {
    return (
      <View style={styles.centro}>
        <Stack.Screen options={{ title: 'Lista' }} />
        <Text style={styles.textoVazio}>Essa lista não existe mais 🤔</Text>
      </View>
    );
  }

  const ehAtiva = !lista.finalizadaEm;
  const itemUnidade = itemUnidadeId ? lista.itens.find((i) => i.id === itemUnidadeId) : undefined;

  function avisar(r: ResultadoAdicionar | null) {
    if (!r) return;
    const mensagem =
      r.tipo === 'novo'
        ? `${r.item.emoji} ${r.item.nome} na lista`
        : `${r.item.nome} já estava na lista — agora ${formatarQuantidadeUnidade(r.item.quantidade, r.item.unidade)}`;
    setAviso({ mensagem, chave: Date.now() });
  }

  async function compartilhar() {
    if (!lista) return;
    try {
      // Abre a folha de compartilhar do celular (WhatsApp, Telegram, e-mail…).
      await Share.share({ message: gerarTextoLista(lista, ordemCategorias) });
    } catch {
      setAviso({ mensagem: 'Não deu para compartilhar agora 😕', chave: Date.now() });
    }
  }

  function excluir(itemId: string) {
    const removido = removerItem(itemId);
    if (!removido) return;
    setAviso({
      mensagem: `${removido.item.emoji} ${removido.item.nome} excluído`,
      chave: Date.now(),
      duracao: 4000,
      acao: {
        titulo: 'Desfazer',
        onPress: () => {
          restaurarItem(removido);
          setAviso(null);
        },
      },
    });
  }

  function adicionarDigitado() {
    if (!texto.trim()) return;
    avisar(adicionarItem(texto));
    setTexto('');
    campoRef.current?.focus();
  }

  function adicionarNome(nome: string, manterFoco: boolean) {
    avisar(adicionarItem(nome));
    setTexto('');
    if (manterFoco) campoRef.current?.focus();
  }

  return (
    <View style={styles.tela}>
      <Stack.Screen
        options={{
          title: lista.nome,
          headerRight: () => (
            <View style={styles.acoesTopo}>
              <Pressable
                onPress={compartilhar}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Compartilhar a lista"
              >
                <Ionicons name="share-social-outline" size={24} color={cores.primariaEscura} />
              </Pressable>
              {ehAtiva && (
                <Pressable
                  onPress={() => router.push('/familia')}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Dividir com a família"
                >
                  <Ionicons
                    name={lista.compartilhada ? 'people' : 'people-outline'}
                    size={25}
                    color={cores.primariaEscura}
                  />
                </Pressable>
              )}
              {ehAtiva && (
                <Pressable
                  onPress={() => router.push({ pathname: '/mercado/[id]', params: { id: lista.id } })}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir o Modo Mercado"
                >
                  <Ionicons name="cart-outline" size={26} color={cores.primariaEscura} />
                </Pressable>
              )}
            </View>
          ),
        }}
      />

      {ehAtiva && (
        <View style={styles.topo}>
          {lista.compartilhada && <SeloFamilia />}
          <CampoAdicionar
            ref={campoRef}
            texto={texto}
            onChangeTexto={setTexto}
            onAdicionar={adicionarDigitado}
            onEscolher={(s) => adicionarNome(s.nome, true)}
            sugestoes={sugestoes}
          />
          {!texto.trim() && frequentes.length > 0 && (
            <View style={styles.grupoChips}>
              <Text style={styles.rotuloChips}>🔔 Costuma comprar</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.chips}
              >
                {frequentes.map((f) => (
                  <ChipSugestao
                    key={f.nome}
                    sugestao={f}
                    detalhe={rotuloCurto(f)}
                    destaque={f.atrasado}
                    onPress={() => adicionarNome(f.nome, false)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
          {!texto.trim() && chipsRapidos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chips}
            >
              {chipsRapidos.map((c) => (
                <ChipSugestao key={c.nome} sugestao={c} onPress={() => adicionarNome(c.nome, false)} />
              ))}
            </ScrollView>
          )}
          {!texto.trim() && (
            <Pressable
              onPress={() => router.push('/importar')}
              accessibilityRole="button"
              hitSlop={6}
              style={({ pressed }) => [styles.linkImportar, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="clipboard-outline" size={18} color={cores.primariaEscura} />
              <Text style={styles.linkImportarTexto}>Colar lista do WhatsApp</Text>
            </Pressable>
          )}
        </View>
      )}

      <SectionList
        sections={secoes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          ehAtiva ? (
            <ItemDeslizavel onExcluir={() => excluir(item.id)}>
              <ItemCard
                item={item}
                onMais={() => mudarQuantidade(item.id, 1)}
                onMenos={() => mudarQuantidade(item.id, -1)}
                onUnidade={() => setItemUnidadeId(item.id)}
                onEditar={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
              />
            </ItemDeslizavel>
          ) : (
            <ItemCard item={item} />
          )
        }
        renderSectionHeader={({ section }) => (
          <CategoriaHeader categoria={section.categoria} quantidade={section.data.length} />
        )}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: espaco.sm }} />}
        contentContainerStyle={styles.itens}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          lista.itens.length > 0 ? (
            <Text style={styles.contagem}>
              {lista.itens.length} {lista.itens.length === 1 ? 'item' : 'itens'} em {secoes.length}{' '}
              {secoes.length === 1 ? 'categoria' : 'categorias'}
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Text style={styles.vazioEmoji}>🛒</Text>
            <Text style={styles.textoVazio}>
              {ehAtiva ? 'Sua listinha está vazia — que tal começar pelo café?' : 'Essa lista ficou vazia.'}
            </Text>
          </View>
        }
      />

      <Aviso
        mensagem={aviso?.mensagem ?? null}
        chave={aviso?.chave}
        duracao={aviso?.duracao}
        acao={aviso?.acao}
        onFechar={() => setAviso(null)}
      />

      <ModalUnidade
        visivel={itemUnidade !== undefined}
        nomeItem={itemUnidade?.nome}
        atual={itemUnidade?.unidade}
        onFechar={() => setItemUnidadeId(null)}
        onEscolher={(u) => {
          if (itemUnidade) mudarUnidade(itemUnidade.id, u);
          setItemUnidadeId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  acoesTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  topo: { paddingHorizontal: espaco.lg, paddingTop: espaco.md, gap: espaco.md },
  chips: { gap: espaco.sm, paddingRight: espaco.lg },
  grupoChips: { gap: espaco.xs },
  linkImportar: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs, alignSelf: 'flex-start', paddingVertical: espaco.xs },
  linkImportarTexto: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  rotuloChips: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario },
  itens: { paddingHorizontal: espaco.lg, paddingTop: espaco.sm, paddingBottom: 96 },
  contagem: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario, marginBottom: espaco.xs },
  vazio: { alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xxl },
  vazioEmoji: { fontSize: 56 },
  textoVazio: { fontSize: fonte.tamanho.normal, textAlign: 'center', color: cores.textoSecundario },
});
