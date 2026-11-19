import { useEffect, useState } from 'react';

import { useListaStore } from './useListaStore';

/**
 * true depois que os dados salvos no celular foram carregados.
 * Antes disso as telas mostrariam "nenhuma lista" por um instante.
 */
export function useHidratado(): boolean {
  const [hidratado, setHidratado] = useState(() => useListaStore.persist.hasHydrated());

  useEffect(() => {
    const parar = useListaStore.persist.onFinishHydration(() => setHidratado(true));
    if (useListaStore.persist.hasHydrated()) setHidratado(true);
    return parar;
  }, []);

  return hidratado;
}
