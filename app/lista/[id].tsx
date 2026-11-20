import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, SectionList, Share, StyleSheet, Text, type TextInputInstance, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { CampoAdicionar } from '@/components/CampoAdicionar';
import { CategoriaHeader } from '@/components/CategoriaHeader';
import { ChipSugestao } from '@/components/ChipSugestao';
import { ItemCard } from '@/components/ItemCard';
import { ItemDeslizavel } from '@/components/ItemDeslizavel';
import { ModalMenu } from '@/components/ModalMenu';
import { ModalNovaLista } from '@/components/ModalNovaLista';
import { ModalUnidade } from '@/components/ModalUnidade';
import { supabase } from '@/lib/supabase';
import { SeloFamilia } from '@/components/SeloFamilia';
import { useBuscarImagens } from '@/store/useBuscarImagens';
import { useListaStore } from '@/store/useListaStore';
import { espaco, fonte } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';
import { agruparPorCategoria } from '@/utils/agrupar';
import { gerarTextoLista } from '@/utils/compartilhar';
import type { ResultadoAdicionar } from '@/utils/lista';
import { formatarQuantidadeUnidade } from '@/utils/quantidade';
import { buscarSugestoes, chipsSugestao, itensProprios } from '@/utils/sugestoes';
import { rotuloCurto, sugestoesPorFrequencia } from '@/utils/frequencia';
import { chaveBusca } from '@/utils/normalizar';
import { separarDitado } from '@/utils/ditado';
import { interpretarTexto } from '@/utils/importar';

// Tela Lista (seção 8.2): adicionar com autocompletar e chips, itens agrupados por categoria.
// Quantidade com +/− e troca de unidade direto no item; tocar no nome abre a edição;
// deslizar para o lado exclui, com "Desfazer" no aviso por 4 s.
export default function ListaTela() {
  const cores = useCores();
  const styles = useEstilos();
  const { id, aviso: avisoInicial } = useLocalSearchParams<{ id: string; aviso?: string }>();
  const lista = useListaStore((s) => s.listas.find((l) => l.id === id) ?? s.historico.find((l) => l.id === id));
  const abrirLista = useListaStore((s) => s.abrirLista);
  // Várias listas (Fase 3): a lista aberta vira a "atual" (recebe Despensa, código de barras, importar…).
  useEffect(() => {
    if (id) abrirLista(id);
  }, [id, abrirLista]);
  const historico = useListaStore((s) => s.historico);
  const ordemCategorias = useListaStore((s) => s.ordemCategorias);
  const adicionarItem = useListaStore((s) => s.adicionarItem);
  const mudarQuantidade = useListaStore((s) => s.mudarQuantidade);
  const mudarUnidade = useListaStore((s) => s.mudarUnidade);
  const removerItem = useListaStore((s) => s.removerItem);
  const restaurarItem = useListaStore((s) => s.restaurarItem);
  const renomearLista = useListaStore((s) => s.renomearLista);
  const arquivarLista = useListaStore((s) => s.arquivarLista);
  const excluirLista = useListaStore((s) => s.excluirLista);
  const [menuAberto, setMenuAberto] = useState(false);
  const [renomearAberto, setRenomearAberto] = useState(false);

  /** Arquivar (vai para o histórico) ou excluir a lista; lista da família: sai dela antes. */
  function fecharLista(modo: 'arquivar' | 'excluir') {
    const atual = useListaStore.getState().listas.find((l) => l.id === id);
    if (!atual) return;
    const familia = atual.compartilhada
      ? ' Você também sai da lista da família (as outras pessoas continuam com ela).'
      : '';
    const executar = async () => {
      // Melhor esforço: sem sinal, sai só deste celular.
      if (atual.compartilhada) await supabase?.rpc('sair_da_lista', { p_lista: atual.compartilhada.id });
      if (modo === 'arquivar') arquivarLista(atual.id);
      else excluirLista(atual.id);
      router.back();
    };
    if (modo === 'arquivar') {
      Alert.alert('Arquivar a lista?', `"${atual.nome}" sai das listas abertas e fica no histórico.${familia}`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Arquivar', onPress: () => void executar() },
      ]);
    } else {
      Alert.alert('Excluir a lista?', `"${atual.nome}" e os itens dela serão apagados deste celular. Não dá para desfazer.${familia}`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => void executar() },
      ]);
    }
  }

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
  const importarItens = useListaStore((s) => s.importarItens);
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
    // Ditado (microfone do teclado) com vários itens sem vírgula: confirma a separação antes.
    const partes = separarDitado(texto);
    if (partes.length > 1) {
      const itens = interpretarTexto(texto);
      Alert.alert(
        `Adicionar ${itens.length} itens?`,
        itens.map((i) => '• ' + i.nome + (i.quantidade ? ` (${formatarQuantidadeUnidade(i.quantidade, i.unidade ?? 'un')})` : '')).join('\n'),
        [
          { text: 'Um item só', onPress: () => adicionarComoEsta() },
          { text: 'Cancelar', style: 'cancel' },
          { text: `Adicionar ${itens.length}`, onPress: () => adicionarVarios(itens) },
        ],
      );
      return;
    }
    adicionarComoEsta();
  }

  function adicionarComoEsta() {
    avisar(adicionarItem(texto, lista?.id));
    setTexto('');
    campoRef.current?.focus();
  }

  function adicionarVarios(itens: ReturnType<typeof interpretarTexto>) {
    if (lista) abrirLista(lista.id); // os itens vão para esta lista
    const r = importarItens(itens);
    setAviso({
      mensagem:
        `🎤 ${r.adicionados} ${r.adicionados === 1 ? 'item adicionado' : 'itens adicionados'}` +
        (r.jaEstavam ? ` (${r.jaEstavam} já estava${r.jaEstavam === 1 ? '' : 'm'} na lista)` : ''),
      chave: Date.now(),
      duracao: 3500,
    });
    setTexto('');
    campoRef.current?.focus();
  }

  function ditar() {
    campoRef.current?.focus();
    setAviso({
      mensagem: '🎤 Toque no microfone do teclado e fale os itens, ex.: "arroz feijão café". O Listinha separa sozinho.',
      chave: Date.now(),
      duracao: 6000,
    });
  }

  function adicionarNome(nome: string, manterFoco: boolean) {
    avisar(adicionarItem(nome, lista?.id));
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
              {!ehAtiva && (
                <Pressable
                  onPress={compartilhar}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Compartilhar a lista"
                >
                  <Ionicons name="share-social-outline" size={24} color={cores.primariaEscura} />
                </Pressable>
              )}
              {ehAtiva && (
                <Pressable
                  onPress={() => router.push({ pathname: '/familia', params: { lista: lista.id } })}
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
              {ehAtiva && (
                <Pressable
                  onPress={() => setMenuAberto(true)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Mais opções da lista"
                >
                  <Ionicons name="ellipsis-vertical" size={22} color={cores.primariaEscura} />
                </Pressable>
              )}
            </View>
          ),
        }}
      />

      {ehAtiva && (
        <View style={styles.topo}>
          {lista.compartilhada && <SeloFamilia remotoId={lista.compartilhada.id} listaId={lista.id} />}
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
            <View style={styles.linhaLinks}>
              <Pressable
                onPress={() => router.push('/importar')}
                accessibilityRole="button"
                hitSlop={6}
                style={({ pressed }) => [styles.linkImportar, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="clipboard-outline" size={18} color={cores.primariaEscura} />
                <Text style={styles.linkImportarTexto}>Colar do WhatsApp</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/escanear')}
                accessibilityRole="button"
                accessibilityLabel="Ler código de barras com a câmera"
                hitSlop={6}
                style={({ pressed }) => [styles.linkImportar, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="barcode-outline" size={18} color={cores.primariaEscura} />
                <Text style={styles.linkImportarTexto}>Ler código de barras</Text>
              </Pressable>
              <Pressable
                onPress={ditar}
                accessibilityRole="button"
                accessibilityLabel="Ditar a lista pelo microfone do teclado"
                hitSlop={6}
                style={({ pressed }) => [styles.linkImportar, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="mic-outline" size={18} color={cores.primariaEscura} />
                <Text style={styles.linkImportarTexto}>Ditar</Text>
              </Pressable>
            </View>
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

      <ModalMenu
        visivel={menuAberto}
        titulo={lista.nome}
        onFechar={() => setMenuAberto(false)}
        opcoes={[
          { titulo: 'Compartilhar como texto', detalhe: 'WhatsApp, Telegram, e-mail…', icone: 'share-social-outline', onPress: compartilhar },
          { titulo: 'Renomear', icone: 'create-outline', onPress: () => setRenomearAberto(true) },
          {
            titulo: 'Arquivar',
            detalhe: 'Fecha a lista e guarda no histórico',
            icone: 'archive-outline',
            onPress: () => fecharLista('arquivar'),
          },
          { titulo: 'Excluir', detalhe: 'Apaga a lista sem guardar', icone: 'trash-outline', perigo: true, onPress: () => fecharLista('excluir') },
        ]}
      />

      <ModalNovaLista
        visivel={renomearAberto}
        titulo="Renomear lista ✏️"
        nomeInicial={lista.nome}
        textoBotao="Salvar"
        onCancelar={() => setRenomearAberto(false)}
        onCriar={(nome) => {
          renomearLista(lista.id, nome);
          setRenomearAberto(false);
        }}
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

const useEstilos = criarEstilos((cores) => ({
  tela: { flex: 1 },
  acoesTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  topo: { paddingHorizontal: espaco.lg, paddingTop: espaco.md, gap: espaco.md },
  chips: { gap: espaco.sm, paddingRight: espaco.lg },
  grupoChips: { gap: espaco.xs },
  linhaLinks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: espaco.lg },
  linkImportar: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs, alignSelf: 'flex-start', paddingVertical: espaco.xs },
  linkImportarTexto: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  rotuloChips: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario },
  itens: { paddingHorizontal: espaco.lg, paddingTop: espaco.sm, paddingBottom: 96 },
  contagem: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario, marginBottom: espaco.xs },
  vazio: { alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xxl },
  vazioEmoji: { fontSize: 56 },
  textoVazio: { fontSize: fonte.tamanho.normal, textAlign: 'center', color: cores.textoSecundario },
}));
