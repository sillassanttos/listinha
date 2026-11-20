import { Image } from 'expo-image';
import { useEffect } from 'react';

import type { ItemLista } from '@/types';
import { buscarImagemOnline, chaveImagem, criarFilaDeBusca, precisaBuscarImagem } from '@/utils/imagens';

import { useListaStore } from './useListaStore';

// Busca em segundo plano as fotos dos itens fora do catálogo (Fase 2).
// Uma busca por vez; falha de rede não fica gravada (tenta de novo daqui a alguns minutos).

const ESPERA_APOS_ERRO_MS = 5 * 60_000;
const errosRecentes = new Map<string, number>(); // chave -> quando falhou (só nesta sessão)

const fila = criarFilaDeBusca(async (nome) => {
  const chave = chaveImagem(nome);
  const resultado = await buscarImagemOnline(nome);
  if (resultado.tipo === 'erro') {
    errosRecentes.set(chave, Date.now());
    return;
  }
  errosRecentes.delete(chave);
  useListaStore.getState().definirImagem(chave, resultado.uri);
  // Baixa já para o disco, para a foto aparecer no mercado mesmo sem sinal.
  if (resultado.uri) Image.prefetch(resultado.uri, 'disk').catch(() => {});
});

/** Põe na fila os itens desta lista que ainda não têm foto (se a opção estiver ligada). */
export function useBuscarImagens(itens: ItemLista[] | undefined): void {
  const ligado = useListaStore((s) => s.imagensOnline);
  const nomes = (itens ?? []).map((i) => i.nome).join('\n');

  useEffect(() => {
    if (!ligado || !nomes) return;
    const { imagens } = useListaStore.getState();
    const agora = Date.now();
    for (const nome of nomes.split('\n')) {
      const falhou = errosRecentes.get(chaveImagem(nome));
      if (falhou && agora - falhou < ESPERA_APOS_ERRO_MS) continue;
      if (precisaBuscarImagem(nome, imagens, agora)) fila.adicionar(nome);
    }
  }, [ligado, nomes]);
}
