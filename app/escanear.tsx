import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Botao } from '@/components/Botao';
import { SeletorLista } from '@/components/SeletorLista';
import { useListaStore } from '@/store/useListaStore';
import { cores, espaco, fonte, raio, toqueMinimo } from '@/theme';
import { buscarProdutoPorCodigo, codigoValido, normalizarCodigo } from '@/utils/codigoBarras';
import { vibrarPego, vibrarSucesso } from '@/utils/vibrar';

// Leitor de código de barras (Fase 3): a câmera lê o código, o Open Food Facts devolve nome e foto,
// e o produto entra na lista atual (trocar no seletor do topo). Dá para ler vários seguidos; "Pronto" volta.
// Código desconhecido: a pessoa digita o nome uma vez e o Listinha lembra (produtosPorCodigo).

type Etapa =
  | { tipo: 'lendo' }
  | { tipo: 'buscando'; codigo: string }
  | { tipo: 'achou'; codigo: string; nome: string; imagem?: string; detalhe?: string; lembrado: boolean }
  | { tipo: 'digitar'; codigo: string; motivo: 'nao-encontrado' | 'sem-internet' };

const TIPOS = ['ean13', 'ean8', 'upc_a'] as const;

export default function EscanearTela() {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const produtosPorCodigo = useListaStore((s) => s.produtosPorCodigo);
  const lembrarProdutoPorCodigo = useListaStore((s) => s.lembrarProdutoPorCodigo);
  const adicionarProdutoLido = useListaStore((s) => s.adicionarProdutoLido);

  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'lendo' });
  const [nome, setNome] = useState('');
  const [lanterna, setLanterna] = useState(false);
  const [adicionados, setAdicionados] = useState<string[]>([]);
  const ultimaLeitura = useRef<{ codigo: string; em: number } | null>(null);

  async function aoLer(dados: string) {
    const codigo = normalizarCodigo(dados);
    if (!codigoValido(codigo)) return; // leitura ruim: continua tentando
    // A câmera lê o mesmo código várias vezes por segundo; ignora repetição logo depois de adicionar.
    const ultima = ultimaLeitura.current;
    if (ultima && ultima.codigo === codigo && Date.now() - ultima.em < 2500) return;
    ultimaLeitura.current = { codigo, em: Date.now() };
    vibrarPego();

    const lembrado = produtosPorCodigo[codigo];
    if (lembrado) {
      setNome(lembrado.nome);
      setEtapa({ tipo: 'achou', codigo, nome: lembrado.nome, imagem: lembrado.imagem, lembrado: true });
      return;
    }
    setEtapa({ tipo: 'buscando', codigo });
    const r = await buscarProdutoPorCodigo(codigo);
    if (r.tipo === 'ok') {
      lembrarProdutoPorCodigo(codigo, { nome: r.produto.nome, imagem: r.produto.imagem });
      setNome(r.produto.nome);
      setEtapa({ tipo: 'achou', codigo, nome: r.produto.nome, imagem: r.produto.imagem, detalhe: r.produto.quantidade, lembrado: false });
    } else {
      setNome('');
      setEtapa({ tipo: 'digitar', codigo, motivo: r.tipo === 'erro' ? 'sem-internet' : 'nao-encontrado' });
    }
  }

  function adicionar() {
    if (etapa.tipo !== 'achou' && etapa.tipo !== 'digitar') return;
    const final = nome.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!final) return;
    const imagem = etapa.tipo === 'achou' ? etapa.imagem : undefined;
    // Nome digitado ou corrigido fica lembrado para a próxima leitura desse código.
    if (etapa.tipo === 'digitar' || final !== etapa.nome) lembrarProdutoPorCodigo(etapa.codigo, { nome: final, imagem });
    const r = adicionarProdutoLido({ nome: final, imagem });
    if (r) {
      vibrarSucesso();
      setAdicionados((a) => [r.tipo === 'somado' ? `${r.item.nome} (+1)` : r.item.nome, ...a].slice(0, 3));
    }
    ultimaLeitura.current = { codigo: etapa.codigo, em: Date.now() };
    setEtapa({ tipo: 'lendo' });
  }

  function lerOutro() {
    if (etapa.tipo !== 'lendo') ultimaLeitura.current = { codigo: 'codigo' in etapa ? etapa.codigo : '', em: Date.now() };
    setEtapa({ tipo: 'lendo' });
  }

  const cabecalho = (
    <Stack.Screen
      options={{
        title: 'Ler código de barras',
        headerRight: () => (
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
            <Text style={styles.pronto}>Pronto</Text>
          </Pressable>
        ),
      }}
    />
  );

  if (!permissao) {
    return (
      <View style={styles.centro}>
        {cabecalho}
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  if (!permissao.granted) {
    return (
      <View style={styles.centro}>
        {cabecalho}
        <Text style={styles.emojiGrande}>📷</Text>
        <Text style={styles.titulo}>O Listinha precisa da câmera</Text>
        <Text style={styles.texto}>Ela é usada só para ler o código de barras dos produtos. Nada é gravado.</Text>
        {permissao.canAskAgain ? (
          <Botao titulo="Permitir câmera" onPress={pedirPermissao} style={{ alignSelf: 'stretch', marginTop: espaco.md }} />
        ) : (
          <Botao
            titulo="Abrir configurações do celular"
            onPress={() => Linking.openSettings()}
            style={{ alignSelf: 'stretch', marginTop: espaco.md }}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {cabecalho}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={lanterna}
        barcodeScannerSettings={{ barcodeTypes: [...TIPOS] }}
        onBarcodeScanned={etapa.tipo === 'lendo' ? (r) => void aoLer(r.data) : undefined}
      />

      {/* Moldura e dica */}
      {/* Várias listas: para qual lista vão os produtos lidos */}
      <View style={styles.seletor}>
        <SeletorLista escuro />
      </View>

      <View style={styles.sobreposicao} pointerEvents="box-none">
        <View style={styles.moldura} pointerEvents="none" />
        <Text style={styles.dica} pointerEvents="none">
          {etapa.tipo === 'lendo' ? 'Aponte para o código de barras do produto' : ' '}
        </Text>
        <Pressable
          onPress={() => setLanterna((l) => !l)}
          accessibilityRole="button"
          accessibilityLabel={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'}
          style={styles.botaoLanterna}
        >
          <Ionicons name={lanterna ? 'flash' : 'flash-outline'} size={26} color="#FFFFFF" />
        </Pressable>
        {adicionados.length > 0 && etapa.tipo === 'lendo' && (
          <View style={styles.adicionados}>
            {adicionados.map((n, i) => (
              <Text key={`${n}-${i}`} style={styles.adicionadoTexto} numberOfLines={1}>
                ✓ {n}
              </Text>
            ))}
          </View>
        )}
      </View>

      {etapa.tipo === 'buscando' && (
        <View style={styles.painel}>
          <ActivityIndicator color={cores.primaria} />
          <Text style={styles.texto}>Procurando o produto {etapa.codigo}…</Text>
        </View>
      )}

      {etapa.tipo === 'achou' && (
        <View style={styles.painel}>
          <View style={styles.linhaProduto}>
            {etapa.imagem ? (
              <Image source={{ uri: etapa.imagem }} style={styles.foto} contentFit="contain" cachePolicy="disk" />
            ) : (
              <View style={[styles.foto, styles.semFoto]}>
                <Text style={{ fontSize: 28 }}>🛒</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.ajuda}>
                {etapa.lembrado ? 'Você já leu este produto' : 'Encontrado no Open Food Facts'}
                {etapa.detalhe ? ` · ${etapa.detalhe}` : ''}
              </Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                onSubmitEditing={adicionar}
                style={styles.campoNome}
                maxLength={60}
                accessibilityLabel="Nome do produto"
              />
            </View>
          </View>
          <Botao titulo="Adicionar à lista" onPress={adicionar} style={{ opacity: nome.trim() ? 1 : 0.5 }} />
          <Pressable onPress={lerOutro} hitSlop={8} style={styles.linkCentro}>
            <Text style={styles.link}>Não é este? Ler outro</Text>
          </Pressable>
        </View>
      )}

      {etapa.tipo === 'digitar' && (
        <View style={styles.painel}>
          <Text style={styles.subtitulo}>
            {etapa.motivo === 'sem-internet' ? '📡 Sem internet para procurar' : '🤔 Produto não encontrado'}
          </Text>
          <Text style={styles.ajuda}>
            Digite o nome uma vez: da próxima vez que ler o código {etapa.codigo}, o Listinha já sabe.
          </Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            onSubmitEditing={adicionar}
            placeholder="Ex.: Biscoito de polvilho"
            placeholderTextColor={cores.textoSuave}
            style={styles.campoNome}
            maxLength={60}
            autoFocus
            accessibilityLabel="Nome do produto"
          />
          <Botao titulo="Adicionar à lista" onPress={adicionar} style={{ opacity: nome.trim() ? 1 : 0.5 }} />
          <View style={styles.linhaLinks}>
            {etapa.motivo === 'sem-internet' && (
              <Pressable
                onPress={() => {
                  ultimaLeitura.current = null;
                  void aoLer(etapa.codigo);
                }}
                hitSlop={8}
              >
                <Text style={styles.link}>Tentar de novo</Text>
              </Pressable>
            )}
            <Pressable onPress={lerOutro} hitSlop={8}>
              <Text style={styles.link}>Ler outro</Text>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000000' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl, gap: espaco.sm, backgroundColor: cores.fundo },
  emojiGrande: { fontSize: 56 },
  titulo: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto, textAlign: 'center' },
  subtitulo: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.texto },
  texto: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario, textAlign: 'center' },
  ajuda: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  pronto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  sobreposicao: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  moldura: {
    width: '78%',
    height: 150,
    borderRadius: raio.lg,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  dica: {
    marginTop: espaco.lg,
    color: '#FFFFFF',
    fontSize: fonte.tamanho.normal,
    fontWeight: fonte.peso.negrito,
    textShadowColor: '#000000',
    textShadowRadius: 6,
  },
  seletor: { position: 'absolute', top: espaco.md, left: espaco.lg, right: espaco.lg + toqueMinimo + espaco.sm, zIndex: 2 },
  botaoLanterna: {
    position: 'absolute',
    top: espaco.lg,
    right: espaco.lg,
    width: toqueMinimo,
    height: toqueMinimo,
    borderRadius: toqueMinimo / 2,
    backgroundColor: '#00000088',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adicionados: {
    position: 'absolute',
    bottom: espaco.xl,
    left: espaco.lg,
    right: espaco.lg,
    padding: espaco.md,
    borderRadius: raio.md,
    backgroundColor: '#000000AA',
    gap: 2,
  },
  adicionadoTexto: { color: '#FFFFFF', fontSize: fonte.tamanho.pequeno + 1, fontWeight: fonte.peso.medio },
  painel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: espaco.lg,
    paddingBottom: espaco.xl,
    gap: espaco.md,
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raio.lg,
    borderTopRightRadius: raio.lg,
  },
  linhaProduto: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  foto: { width: 72, height: 72, borderRadius: raio.md, backgroundColor: cores.fundo },
  semFoto: { alignItems: 'center', justifyContent: 'center' },
  campoNome: {
    minHeight: toqueMinimo,
    backgroundColor: cores.fundo,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.tamanho.normal,
    fontWeight: fonte.peso.medio,
    color: cores.texto,
  },
  linhaLinks: { flexDirection: 'row', justifyContent: 'space-between' },
  linkCentro: { alignSelf: 'center' },
  link: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
});
