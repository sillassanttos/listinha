import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CHAVE_ARMAZENAMENTO, useListaStore } from '../useListaStore';

// AsyncStorage simulado em memória (mock oficial da biblioteca).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

async function lerSalvo() {
  const texto = await AsyncStorage.getItem(CHAVE_ARMAZENAMENTO);
  return texto ? JSON.parse(texto) : null;
}

/** Espera as gravações assíncronas do persist terminarem. */
const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('persistência do store (fechar e abrir o app mantém tudo)', () => {
  beforeEach(async () => {
    await useListaStore.getState().limparDados();
    await AsyncStorage.clear();
  });

  it('grava cada mudança no armazenamento', async () => {
    const s = useListaStore.getState();
    s.novaLista('Feira', false);
    s.adicionarItem('banana');
    s.adicionarItem('café');
    const itemId = useListaStore.getState().listaAtiva!.itens[0].id;
    useListaStore.getState().definirPego(itemId, true);
    await esperar();

    const salvo = await lerSalvo();
    expect(salvo.version).toBe(1);
    expect(salvo.state.listaAtiva.nome).toBe('Feira');
    expect(salvo.state.listaAtiva.itens.map((i: { nome: string }) => i.nome)).toEqual(['Banana', 'Café']);
    expect(salvo.state.listaAtiva.itens[0].pego).toBe(true);
    // Só dados; as funções do store não vão para o armazenamento.
    expect(Object.keys(salvo.state).sort()).toEqual(['historico', 'listaAtiva']);
  });

  it('ao "abrir o app" de novo, recarrega o que estava salvo', async () => {
    const s = useListaStore.getState();
    s.novaLista('Semana', false);
    s.adicionarItem('arroz');
    useListaStore.getState().finalizarCompra(true);
    await esperar();

    // Simula o app fechado: zera a memória e devolve ao armazenamento o que estava gravado
    // (o setState também grava, então o conteúdo salvo é guardado antes e restaurado depois).
    const gravado = await AsyncStorage.getItem(CHAVE_ARMAZENAMENTO);
    useListaStore.setState({ listaAtiva: null, historico: [] });
    await esperar();
    expect(useListaStore.getState().historico).toHaveLength(0);
    await AsyncStorage.setItem(CHAVE_ARMAZENAMENTO, gravado!);
    await useListaStore.persist.rehydrate();

    const depois = useListaStore.getState();
    expect(depois.historico).toHaveLength(1);
    expect(depois.historico[0].nome).toBe('Semana');
    expect(depois.listaAtiva?.itens.map((i) => i.nome)).toEqual(['Arroz']);
  });

  it('dados corrompidos no armazenamento não derrubam o app', async () => {
    await AsyncStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify({ version: 1, state: { listaAtiva: { id: 'x', itens: [{ id: '1', nome: 'Pão', quantidade: 'muito' }] }, historico: 7 } }),
    );
    await useListaStore.persist.rehydrate();
    const s = useListaStore.getState();
    expect(s.historico).toEqual([]);
    expect(s.listaAtiva?.itens[0]).toMatchObject({ nome: 'Pão', quantidade: 1, unidade: 'un', categoria: 'outros' });
  });

  it('limpar dados apaga a memória e o armazenamento', async () => {
    useListaStore.getState().novaLista('Apagar', false);
    await esperar();
    await useListaStore.getState().limparDados();
    await esperar();
    expect(useListaStore.getState().listaAtiva).toBeNull();
    const salvo = await lerSalvo();
    expect(salvo?.state?.listaAtiva ?? null).toBeNull();
  });
});
