import { type ImageStyle, StyleSheet, type TextStyle, useColorScheme, type ViewStyle } from 'react-native';

import { type CategoriaVisual, obterCategoria } from '@/data/categorias';
import { useListaStore } from '@/store/useListaStore';
import type { CategoriaId } from '@/types';

import { type Cores, type Esquema, categoriaNoTema, coresDo, esquemaEfetivo } from './index';

/** Esquema em uso: a escolha das Configurações ou, em "sistema", o modo do celular. */
export function useEsquema(): Esquema {
  const preferencia = useListaStore((s) => s.tema);
  const sistema = useColorScheme();
  return esquemaEfetivo(preferencia, sistema);
}

/** Paleta do tema atual. Troca na hora quando o usuário muda o tema ou o celular muda de modo. */
export function useCores(): Cores {
  return coresDo(useEsquema());
}

/**
 * Estilos que dependem das cores. Uso, fora do componente:
 *   const useEstilos = criarEstilos((cores) => ({ caixa: { backgroundColor: cores.superficie } }));
 * e dentro dele: const styles = useEstilos();
 * Cada paleta gera os estilos uma vez só (guardados).
 */
type Estilos = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function criarEstilos<S extends Estilos>(criar: (cores: Cores) => S & Estilos): () => Readonly<S> {
  const guardados = new Map<Cores, Readonly<S>>();
  return function useEstilos() {
    const cores = useCores();
    let estilos = guardados.get(cores);
    if (!estilos) {
      estilos = StyleSheet.create(criar(cores));
      guardados.set(cores, estilos);
    }
    return estilos;
  };
}

/** Gancho: devolve uma função que dá as cores da categoria já no tema atual. */
export function useVerCategoria(): (id: CategoriaId) => CategoriaVisual {
  const cores = useCores();
  return (id) => categoriaNoTema(obterCategoria(id), cores);
}
