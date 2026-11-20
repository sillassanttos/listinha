import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { configSupabase } from './configSupabase';

// Cliente do Supabase (Fase 3, lista compartilhada). URL e chave pública vêm do .env
// (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY). Sem .env, fica null e o app
// continua funcionando só no celular, como nas fases 1 e 2.
// A sessão do login fica no AsyncStorage (chave própria do Supabase, separada da "listinha-store").

const config = configSupabase(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_KEY);

export const supabase: SupabaseClient | null = config
  ? createClient(config.url, config.chave, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Renova o login só com o app aberto (recomendação do Supabase para React Native).
if (supabase) {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
