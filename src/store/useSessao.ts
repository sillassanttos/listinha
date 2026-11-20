import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/** Login atual no Supabase (Fase 3). Sem Supabase configurado, nunca há sessão. */
export function useSessao(): { carregando: boolean; sessao: Session | null } {
  const [estado, setEstado] = useState<{ carregando: boolean; sessao: Session | null }>({
    carregando: !!supabase,
    sessao: null,
  });

  useEffect(() => {
    if (!supabase) return;
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setEstado({ carregando: false, sessao: data.session });
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (ativo) setEstado({ carregando: false, sessao });
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return estado;
}

export type SituacaoBanco = 'verificando' | 'pronto' | 'sem-esquema' | 'sem-conexao';

/** Confere se o esquema.sql foi rodado no projeto (chama uma função dele). */
export async function verificarBanco(): Promise<SituacaoBanco> {
  if (!supabase) return 'sem-conexao';
  const { error } = await supabase.rpc('eh_membro', { p_lista: '00000000-0000-0000-0000-000000000000' });
  if (!error) return 'pronto';
  // PGRST202: função não encontrada -> falta rodar o supabase/esquema.sql.
  if (error.code === 'PGRST202' || error.code === '42883') return 'sem-esquema';
  return 'sem-conexao';
}
