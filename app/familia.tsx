import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Botao } from '@/components/Botao';
import { SeletorLista } from '@/components/SeletorLista';
import { supabase } from '@/lib/supabase';
import { useListaStore } from '@/store/useListaStore';
import { useSessao } from '@/store/useSessao';
import {
  codigoConviteValido,
  itemParaLinha,
  linhaParaItem,
  listaAoEntrar,
  mensagemErroFamilia,
  normalizarCodigo,
  textoConvite,
} from '@/sync/regras';
import { type EstadoSync, useSituacaoSync } from '@/sync/sincronizador';
import { espaco, fonte, raio, toqueMinimo } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';
import type { ItemLista } from '@/types';
import { listaPorRemoto } from '@/utils/listas';

// Família (Fase 3): compartilhar a lista ativa por código de convite, entrar na lista de alguém
// e parar de compartilhar. A sincronização em si fica em src/sync/sincronizador.ts.
export default function FamiliaTela() {
  const cores = useCores();
  const styles = useEstilos();
  const { carregando, sessao } = useSessao();
  // Várias listas: aberta a partir de uma lista, a tela trata dela (vira a lista atual).
  const { lista: listaId } = useLocalSearchParams<{ lista?: string }>();
  const abrirLista = useListaStore((s) => s.abrirLista);
  useEffect(() => {
    if (listaId) abrirLista(listaId);
  }, [listaId, abrirLista]);

  if (!supabase) {
    return (
      <View style={styles.centro}>
        <Text style={styles.texto}>O compartilhamento ainda não foi configurado neste app (veja o README).</Text>
      </View>
    );
  }
  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }
  if (!sessao) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.emojiGrande}>👨‍👩‍👧</Text>
        <Text style={styles.titulo}>Divida a lista com a família</Text>
        <Text style={styles.texto}>
          Cada pessoa vê e marca os mesmos itens, na hora. Para isso, entre com o seu e-mail (sem senha).
        </Text>
        <Botao titulo="Entrar com e-mail" onPress={() => router.push('/conta')} style={{ marginTop: espaco.md }} />
      </ScrollView>
    );
  }
  return <Logado />;
}

function Logado() {
  const styles = useEstilos();
  const listaAtiva = useListaStore((s) => s.listaAtiva);
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.seletor}>
        <SeletorLista rotulo="Lista:" />
      </View>
      {listaAtiva?.compartilhada ? <Compartilhada /> : <NaoCompartilhada />}
    </View>
  );
}

const TEXTO_ESTADO: Record<EstadoSync, string> = {
  desligado: '',
  'sem-login': 'Entre na sua conta para sincronizar.',
  conectando: '⏳ Conectando…',
  sincronizado: '✅ Tudo sincronizado',
  enviando: '⏳ Enviando mudanças…',
  'sem-conexao': '📡 Sem conexão. As mudanças ficam guardadas e sobem quando o sinal voltar.',
  'sem-acesso': '⚠️ Você não participa mais desta lista (ou ela foi apagada).',
};

function Compartilhada() {
  const cores = useCores();
  const styles = useEstilos();
  const lista = useListaStore((s) => s.listaAtiva)!;
  const definirCompartilhada = useListaStore((s) => s.definirCompartilhada);
  const { estado, pendentes } = useSituacaoSync(lista.compartilhada?.id);
  const [membros, setMembros] = useState<number | null>(null);
  const [saindo, setSaindo] = useState(false);
  const info = lista.compartilhada!;

  useEffect(() => {
    let ativo = true;
    supabase
      ?.from('membros')
      .select('usuario_id', { count: 'exact', head: true })
      .eq('lista_id', info.id)
      .then(({ count }) => ativo && setMembros(count ?? null));
    return () => {
      ativo = false;
    };
  }, [info.id]);

  function convidar() {
    Share.share({ message: textoConvite(lista.nome, info.codigo) }).catch(() => {});
  }

  function parar() {
    Alert.alert(
      'Parar de compartilhar?',
      'A lista continua neste celular como estava, mas deixa de receber e enviar mudanças. As outras pessoas continuam com a lista delas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Parar',
          style: 'destructive',
          onPress: async () => {
            setSaindo(true);
            const { error } = (await supabase?.rpc('sair_da_lista', { p_lista: info.id })) ?? {};
            setSaindo(false);
            // Sem acesso (já tinha saído) também conta como sucesso.
            if (error && estado !== 'sem-acesso') {
              Alert.alert('Não deu certo', mensagemErroFamilia(error));
              return;
            }
            definirCompartilhada(undefined, lista.id);
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.cartao}>
        <Text style={styles.ajuda}>Lista da família</Text>
        <Text style={styles.titulo}>{lista.nome}</Text>
        <Text style={styles.texto}>
          {TEXTO_ESTADO[estado]}
          {pendentes > 0 && estado !== 'sincronizado' ? ` (${pendentes} para enviar)` : ''}
        </Text>
        {membros !== null && (
          <Text style={styles.ajuda}>
            {membros === 1 ? 'Só você por enquanto. Convide alguém!' : `${membros} pessoas nesta lista`}
          </Text>
        )}
      </View>

      <Text style={styles.rotulo}>Código de convite</Text>
      <View style={styles.codigoCaixa}>
        <Text style={styles.codigo} selectable accessibilityLabel={`Código ${info.codigo.split('').join(' ')}`}>
          {info.codigo}
        </Text>
      </View>
      <Botao titulo="Enviar convite pelo WhatsApp" onPress={convidar} />
      <Text style={styles.ajuda}>
        A pessoa instala o Listinha, entra com o e-mail dela e digita esse código em Família → Entrar com código.
      </Text>

      <Pressable
        onPress={() => router.push({ pathname: '/lista/[id]', params: { id: lista.id } })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.linha, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="list" size={22} color={cores.primariaEscura} />
        <Text style={styles.linhaTexto}>Abrir a lista</Text>
        <Ionicons name="chevron-forward" size={20} color={cores.textoSuave} />
      </Pressable>

      <Pressable
        onPress={parar}
        disabled={saindo}
        accessibilityRole="button"
        style={({ pressed }) => [styles.botaoSair, (pressed || saindo) && { opacity: 0.7 }]}
      >
        <Ionicons name="exit-outline" size={20} color={cores.perigo} />
        <Text style={styles.botaoSairTexto}>{saindo ? 'Saindo…' : 'Parar de compartilhar neste celular'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function NaoCompartilhada() {
  const cores = useCores();
  const styles = useEstilos();
  const listaAtiva = useListaStore((s) => s.listaAtiva);
  const novaLista = useListaStore((s) => s.novaLista);
  const definirCompartilhada = useListaStore((s) => s.definirCompartilhada);
  const entrarNaFamilia = useListaStore((s) => s.entrarNaFamilia);
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState<'criar' | 'entrar' | null>(null);

  async function compartilharAtual() {
    if (!supabase || ocupado) return;
    if (!useListaStore.getState().listaAtiva) novaLista('Compra da semana');
    const lista = useListaStore.getState().listaAtiva!;
    setOcupado('criar');
    try {
      const { data, error } = await supabase.rpc('criar_lista', {
        p_nome: lista.nome,
        p_orcamento: lista.orcamento ?? null,
      });
      if (error || !data) throw error;
      const remota = data as { id: string; codigo: string };
      if (lista.itens.length) {
        const envio = await supabase.from('itens').upsert(lista.itens.map((i) => itemParaLinha(i, remota.id)));
        if (envio.error) {
          // Não deixa uma lista pela metade no servidor.
          await supabase.rpc('sair_da_lista', { p_lista: remota.id });
          throw envio.error;
        }
      }
      definirCompartilhada({ id: remota.id, codigo: remota.codigo }, lista.id);
    } catch (erro) {
      Alert.alert('Não deu para compartilhar', mensagemErroFamilia(erro));
    } finally {
      setOcupado(null);
    }
  }

  async function entrar(juntar: boolean) {
    if (!supabase) return;
    setOcupado('entrar');
    try {
      const { data, error } = await supabase.rpc('entrar_na_lista', { p_codigo: codigo });
      if (error || !data) throw error;
      const remota = data as { id: string; nome: string; codigo: string; orcamento: number | string | null };
      // Já está aberta neste celular: só abre.
      const jaAberta = listaPorRemoto(useListaStore.getState().listas, remota.id);
      if (jaAberta) {
        setCodigo('');
        router.replace({ pathname: '/lista/[id]', params: { id: jaAberta.id } });
        return;
      }
      const linhas = await supabase.from('itens').select('*').eq('lista_id', remota.id);
      if (linhas.error) throw linhas.error;
      const itens = (linhas.data ?? []).map(linhaParaItem).filter((i): i is ItemLista => i !== null);
      const orcamento = Number(remota.orcamento);
      // Juntar: a lista atual vira a da família. Separada: entra como mais uma lista aberta.
      const r = listaAoEntrar(
        juntar ? useListaStore.getState().listaAtiva : null,
        {
          nome: remota.nome,
          orcamento: Number.isFinite(orcamento) && orcamento > 0 ? orcamento : undefined,
          compartilhada: { id: remota.id, codigo: remota.codigo },
        },
        itens,
        juntar,
      );
      if (r.paraEnviar.length) {
        const envio = await supabase.from('itens').upsert(r.paraEnviar.map((i) => itemParaLinha(i, remota.id)));
        if (envio.error) throw envio.error;
      }
      entrarNaFamilia(r.novaLista, r.finalizada);
      setCodigo('');
      router.replace({ pathname: '/lista/[id]', params: { id: r.novaLista.id, aviso: `👨‍👩‍👧 Você entrou em "${remota.nome}"` } });
    } catch (erro) {
      Alert.alert('Não deu para entrar', mensagemErroFamilia(erro));
    } finally {
      setOcupado(null);
    }
  }

  function pedirEntrar() {
    if (!codigoConviteValido(codigo) || ocupado) return;
    const atual = useListaStore.getState().listaAtiva;
    const pendentes = atual?.itens.filter((i) => !i.pego).length ?? 0;
    if (!atual || pendentes === 0 || atual.compartilhada) {
      void entrar(false);
      return;
    }
    Alert.alert(
      'Abrir a lista da família',
      `Ela pode entrar como mais uma lista, ou juntar com "${atual.nome}" (os ${pendentes} ${pendentes === 1 ? 'item que falta vai' : 'itens que faltam vão'} para a lista da família).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: `Juntar com "${atual.nome}"`, onPress: () => void entrar(true) },
        { text: 'Mais uma lista', onPress: () => void entrar(false) },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.emojiGrande}>👨‍👩‍👧</Text>
        <Text style={styles.titulo}>Divida a lista com a família</Text>
        <Text style={styles.texto}>Todo mundo vê e marca os mesmos itens, na hora, cada um no seu celular.</Text>

        <View style={styles.cartao}>
          <Text style={styles.subtitulo}>Compartilhar a minha lista</Text>
          <Text style={styles.ajuda}>
            {listaAtiva
              ? `"${listaAtiva.nome}" (${listaAtiva.itens.length} ${listaAtiva.itens.length === 1 ? 'item' : 'itens'}) ganha um código para convidar.`
              : 'Cria uma lista nova da família e gera um código para convidar.'}
          </Text>
          <Botao
            titulo={ocupado === 'criar' ? 'Criando…' : 'Compartilhar'}
            onPress={compartilharAtual}
            style={{ opacity: ocupado ? 0.5 : 1 }}
          />
        </View>

        <View style={styles.cartao}>
          <Text style={styles.subtitulo}>Entrar com código</Text>
          <Text style={styles.ajuda}>Recebeu um convite? Digite o código de 6 letras e números.</Text>
          <TextInput
            value={codigo}
            onChangeText={(t) => setCodigo(normalizarCodigo(t))}
            onSubmitEditing={pedirEntrar}
            placeholder="AB3K7Q"
            placeholderTextColor={cores.textoSuave}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            style={[styles.campo, styles.campoCodigo]}
            accessibilityLabel="Código de convite"
          />
          <Botao
            titulo={ocupado === 'entrar' ? 'Entrando…' : 'Entrar'}
            onPress={pedirEntrar}
            style={{ opacity: codigoConviteValido(codigo) && !ocupado ? 1 : 0.5 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useEstilos = criarEstilos((cores) => ({
  seletor: { paddingHorizontal: espaco.lg, paddingTop: espaco.sm },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  container: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xxl },
  emojiGrande: { fontSize: 48, textAlign: 'center' },
  titulo: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  subtitulo: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.texto },
  texto: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario },
  ajuda: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  rotulo: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario, marginTop: espaco.sm },
  cartao: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm },
  campo: {
    minHeight: toqueMinimo,
    backgroundColor: cores.fundo,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.tamanho.normal,
    color: cores.texto,
  },
  campoCodigo: { fontSize: fonte.tamanho.grande, letterSpacing: 6, textAlign: 'center', fontWeight: fonte.peso.negrito },
  codigoCaixa: {
    alignItems: 'center',
    paddingVertical: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.primariaClara,
    borderWidth: 1,
    borderColor: cores.primaria + '55',
  },
  codigo: { fontSize: 36, fontWeight: fonte.peso.negrito, letterSpacing: 8, color: cores.primariaEscura },
  linha: {
    minHeight: toqueMinimo + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingHorizontal: espaco.lg,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
  },
  linhaTexto: { flex: 1, fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.medio, color: cores.texto },
  botaoSair: {
    minHeight: toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.sm,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.perigo,
    marginTop: espaco.md,
  },
  botaoSairTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.perigo },
}));
