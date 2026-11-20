import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';

import { Botao } from '@/components/Botao';
import { codigoCompleto, emailValido, limparCodigo, mensagemErroLogin } from '@/lib/configSupabase';
import { supabase } from '@/lib/supabase';
import { type SituacaoBanco, useSessao, verificarBanco } from '@/store/useSessao';
import { espaco, fonte, raio, toqueMinimo } from '@/theme';
import { criarEstilos, useCores } from '@/theme/useCores';

const ESPERA_REENVIO = 60; // segundos

// Conta (Fase 3): login sem senha, com código de 6 dígitos enviado por e-mail.
// Só é preciso para compartilhar a lista com a família; o resto do app funciona sem login.
export default function ContaTela() {
  const cores = useCores();
  const styles = useEstilos();
  const { carregando, sessao } = useSessao();

  if (!supabase) return <SemConfiguracao />;
  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }
  return sessao ? <Conectado email={sessao.user.email ?? ''} /> : <Entrar />;
}

function SemConfiguracao() {
  const styles = useEstilos();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>☁️ Compartilhamento ainda não configurado</Text>
      <Text style={styles.texto}>
        Para compartilhar a lista com a família, o Listinha precisa de um projeto gratuito no Supabase. O passo a passo
        está no README do projeto (arquivo .env com a URL e a chave pública).
      </Text>
      <Text style={styles.ajuda}>Enquanto isso, tudo continua funcionando só neste celular.</Text>
    </ScrollView>
  );
}

function Entrar() {
  const cores = useCores();
  const styles = useEstilos();
  const [email, setEmail] = useState('');
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);
  const campoCodigo = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function enviarCodigo(destino = email.trim().toLowerCase()) {
    if (!supabase || !emailValido(destino) || ocupado) return;
    setOcupado(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithOtp({ email: destino, options: { shouldCreateUser: true } });
    setOcupado(false);
    if (error) {
      setErro(mensagemErroLogin(error));
      return;
    }
    setEnviadoPara(destino);
    setCodigo('');
    setEspera(ESPERA_REENVIO);
    setTimeout(() => campoCodigo.current?.focus(), 300);
  }

  async function confirmar(texto = codigo) {
    if (!supabase || !enviadoPara || !codigoCompleto(texto) || ocupado) return;
    setOcupado(true);
    setErro(null);
    const { error } = await supabase.auth.verifyOtp({ email: enviadoPara, token: texto, type: 'email' });
    setOcupado(false);
    if (error) setErro(mensagemErroLogin(error));
    // Com sucesso, o useSessao percebe o login e a tela troca sozinha.
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Entrar para compartilhar</Text>
        <Text style={styles.texto}>
          Sem senha: você recebe um código no e-mail e digita aqui. Só é preciso para dividir a lista com a família.
        </Text>

        {!enviadoPara ? (
          <>
            <Text style={styles.rotulo}>Seu e-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => enviarCodigo()}
              placeholder="voce@exemplo.com"
              placeholderTextColor={cores.textoSuave}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              style={styles.campo}
              accessibilityLabel="Seu e-mail"
            />
            <Botao
              titulo={ocupado ? 'Enviando…' : 'Enviar código'}
              onPress={() => enviarCodigo()}
              style={{ marginTop: espaco.sm, opacity: emailValido(email) && !ocupado ? 1 : 0.5 }}
            />
          </>
        ) : (
          <>
            <Text style={styles.texto}>
              Enviamos um código para <Text style={styles.negrito}>{enviadoPara}</Text>. Pode levar um minuto; confira
              também o spam.
            </Text>
            <Text style={styles.rotulo}>Código</Text>
            <TextInput
              ref={campoCodigo}
              value={codigo}
              onChangeText={(t) => {
                const limpo = limparCodigo(t);
                setCodigo(limpo);
                // Código colado ou preenchido pelo teclado de uma vez (6 dígitos, o padrão): entra direto.
                if (limpo.length === 6 && limpo.length - codigo.length > 1) confirmar(limpo);
              }}
              onSubmitEditing={() => confirmar()}
              placeholder="123456"
              placeholderTextColor={cores.textoSuave}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              style={[styles.campo, styles.campoCodigo]}
              accessibilityLabel="Código recebido por e-mail"
            />
            <Botao
              titulo={ocupado ? 'Conferindo…' : 'Entrar'}
              onPress={() => confirmar()}
              style={{ marginTop: espaco.sm, opacity: codigoCompleto(codigo) && !ocupado ? 1 : 0.5 }}
            />
            <View style={styles.linhaLinks}>
              <Pressable onPress={() => enviarCodigo(enviadoPara)} disabled={espera > 0 || ocupado} hitSlop={8}>
                <Text style={[styles.link, (espera > 0 || ocupado) && { color: cores.textoSuave }]}>
                  {espera > 0 ? `Reenviar em ${espera}s` : 'Reenviar código'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setEnviadoPara(null);
                  setErro(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.link}>Trocar e-mail</Text>
              </Pressable>
            </View>
          </>
        )}

        {erro && (
          <View style={styles.erro} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={20} color={cores.perigo} />
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const TEXTO_BANCO: Record<SituacaoBanco, string> = {
  verificando: 'Conferindo o banco…',
  pronto: '✅ Banco pronto para compartilhar listas.',
  'sem-esquema': '⚠️ Falta rodar o arquivo supabase/esquema.sql no SQL Editor do Supabase.',
  'sem-conexao': '📡 Não deu para falar com o Supabase agora (sem internet ou projeto pausado).',
};

function Conectado({ email }: { email: string }) {
  const cores = useCores();
  const styles = useEstilos();
  const [banco, setBanco] = useState<SituacaoBanco>('verificando');

  useEffect(() => {
    let ativo = true;
    verificarBanco().then((s) => ativo && setBanco(s));
    return () => {
      ativo = false;
    };
  }, []);

  function sair() {
    Alert.alert('Sair da conta?', 'Sua lista e o histórico continuam neste celular.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => supabase?.auth.signOut() },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.cartao}>
        <Text style={styles.ajuda}>Conectado como</Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.texto}>{TEXTO_BANCO[banco]}</Text>
        {banco !== 'pronto' && banco !== 'verificando' && (
          <Pressable
            onPress={() => {
              setBanco('verificando');
              verificarBanco().then(setBanco);
            }}
            hitSlop={8}
          >
            <Text style={styles.link}>Conferir de novo</Text>
          </Pressable>
        )}
      </View>
      <Pressable onPress={() => router.push('/familia')} hitSlop={8} accessibilityRole="button">
        <Text style={styles.link}>👨‍👩‍👧 Dividir a lista com a família</Text>
      </Pressable>
      <Pressable
        onPress={sair}
        accessibilityRole="button"
        style={({ pressed }) => [styles.botaoSair, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="log-out-outline" size={20} color={cores.perigo} />
        <Text style={styles.botaoSairTexto}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

const useEstilos = criarEstilos((cores) => ({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: espaco.lg, gap: espaco.sm, paddingBottom: espaco.xxl },
  titulo: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  texto: { fontSize: fonte.tamanho.normal, color: cores.textoSecundario },
  negrito: { fontWeight: fonte.peso.negrito, color: cores.texto },
  ajuda: { fontSize: fonte.tamanho.pequeno, color: cores.textoSecundario },
  rotulo: { fontSize: fonte.tamanho.pequeno, fontWeight: fonte.peso.negrito, color: cores.textoSecundario, marginTop: espaco.md },
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
  campoCodigo: { fontSize: fonte.tamanho.grande, letterSpacing: 6, textAlign: 'center', fontWeight: fonte.peso.negrito },
  linhaLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: espaco.md },
  link: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.primariaEscura },
  erro: {
    flexDirection: 'row',
    gap: espaco.sm,
    alignItems: 'center',
    padding: espaco.md,
    borderRadius: raio.md,
    backgroundColor: cores.perigo + '15',
    marginTop: espaco.md,
  },
  erroTexto: { flex: 1, fontSize: fonte.tamanho.normal, color: cores.perigo },
  cartao: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm },
  email: { fontSize: fonte.tamanho.medio, fontWeight: fonte.peso.negrito, color: cores.texto },
  botaoSair: {
    minHeight: toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.sm,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.perigo,
    marginTop: espaco.lg,
  },
  botaoSairTexto: { fontSize: fonte.tamanho.normal, fontWeight: fonte.peso.negrito, color: cores.perigo },
}));
