import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useHidratado } from '@/store/useHidratado';
import { useSincronizacao } from '@/sync/sincronizador';
import { cores, fonte } from '@/theme';

export default function RootLayout() {
  const hidratado = useHidratado();
  // Fase 3: liga a sincronização da lista compartilhada (quando houver login e lista da família).
  useSincronizacao();

  if (!hidratado) {
    // Carregando os dados salvos (leva milissegundos); evita mostrar "nenhuma lista" por engano.
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <Text style={{ fontSize: 48 }}>🛒</Text>
        <ActivityIndicator color={cores.primaria} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: cores.superficie },
          headerTintColor: cores.primariaEscura,
          headerTitleStyle: { color: cores.texto, fontWeight: fonte.peso.negrito },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Listinha' }} />
        <Stack.Screen name="lista/[id]" options={{ title: 'Lista' }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Editar item', presentation: 'modal' }} />
        <Stack.Screen name="importar" options={{ title: 'Importar do WhatsApp', presentation: 'modal' }} />
        <Stack.Screen name="escanear" options={{ title: 'Ler código de barras', presentation: 'modal' }} />
        <Stack.Screen name="mercado/[id]" options={{ title: 'Modo Mercado' }} />
        <Stack.Screen name="concluida/[id]" options={{ title: 'Compra concluída' }} />
        <Stack.Screen name="despensa" options={{ title: 'Despensa' }} />
        <Stack.Screen name="historico" options={{ title: 'Histórico' }} />
        <Stack.Screen name="configuracoes" options={{ title: 'Configurações' }} />
        <Stack.Screen name="conta" options={{ title: 'Conta' }} />
        <Stack.Screen name="familia" options={{ title: 'Família' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
