import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { itensDaCasa, paraImportar } from '@/utils/despensa';

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
    s.novaLista('Feira');
    s.adicionarItem('banana');
    s.adicionarItem('café');
    const itemId = useListaStore.getState().listaAtiva!.itens[0].id;
    useListaStore.getState().definirPego(itemId, true);
    await esperar();

    const salvo = await lerSalvo();
    expect(salvo.version).toBe(2);
    expect(salvo.state.listas[0].nome).toBe('Feira');
    expect(salvo.state.listaAtualId).toBe(salvo.state.listas[0].id);
    expect(salvo.state.listas[0].itens.map((i: { nome: string }) => i.nome)).toEqual(['Banana', 'Café']);
    expect(salvo.state.listas[0].itens[0].pego).toBe(true);
    // Só dados; as funções do store não vão para o armazenamento.
    expect(Object.keys(salvo.state).sort()).toEqual([
      'categoriasManuais',
      'historico',
      'imagens',
      'imagensOnline',
      'listaAtualId',
      'listas',
      'ordemCategorias',
      'produtosPorCodigo',
      'tema',
    ]);
  });

  it('Despensa: "Acabou" sem lista ativa cria uma, com quantidade e unidade da última compra', () => {
    const s = useListaStore.getState();
    s.novaLista('Semana');
    const leite = s.adicionarItem('leite')!.item;
    useListaStore.getState().atualizarItem(leite.id, { ...leite, quantidade: 6 });
    useListaStore.getState().finalizarCompra(false);
    expect(useListaStore.getState().listaAtiva).toBeNull();

    const casa = itensDaCasa(useListaStore.getState().historico);
    const r = useListaStore.getState().importarItens([paraImportar(casa[0])]);
    expect(r.adicionados).toBe(1);
    expect(useListaStore.getState().listaAtiva?.itens[0]).toMatchObject({ nome: 'Leite', quantidade: 6, unidade: 'L', pego: false });
    // Tocar de novo não duplica.
    expect(useListaStore.getState().importarItens([paraImportar(casa[0])]).jaEstavam).toBe(1);
  });

  it('Família: o que vem do servidor só entra na lista compartilhada certa', () => {
    const s = useListaStore.getState();
    s.novaLista('Casa');
    const arroz = s.adicionarItem('arroz')!.item;
    const leite = { ...arroz, id: 'remoto-1', nome: 'Leite' };

    useListaStore.getState().aplicarRemoto('r1', { itens: [leite] });
    expect(useListaStore.getState().listaAtiva?.itens.map((i) => i.nome)).toEqual(['Arroz']); // não é compartilhada

    useListaStore.getState().definirCompartilhada({ id: 'r1', codigo: 'AB3K7Q' });
    useListaStore.getState().aplicarRemoto('outra', { itens: [leite] });
    expect(useListaStore.getState().listaAtiva?.itens).toHaveLength(1);
    useListaStore.getState().aplicarRemoto('r1', { itens: [arroz, leite], nome: 'Casa da vó', orcamento: 200 });
    expect(useListaStore.getState().listaAtiva).toMatchObject({ nome: 'Casa da vó', orcamento: 200 });
    useListaStore.getState().aplicarRemoto('r1', { orcamento: null });
    expect(useListaStore.getState().listaAtiva?.orcamento).toBeUndefined();

    const anterior = useListaStore.getState().listaAtiva!;
    useListaStore.getState().entrarNaFamilia({ id: 'n', nome: 'Outra', criadaEm: 1, itens: [] }, { ...anterior, finalizadaEm: 2 });
    expect(useListaStore.getState().listaAtiva?.nome).toBe('Outra');
    expect(useListaStore.getState().historico[0].nome).toBe('Casa da vó');
  });

  it('Família: concluir a compra mantém a lista da família; conclusão de outro celular arquiva a cópia daqui', () => {
    const s = useListaStore.getState();
    s.novaLista('Casa');
    const arroz = s.adicionarItem('arroz')!.item;
    useListaStore.getState().adicionarItem('café');
    useListaStore.getState().definirCompartilhada({ id: 'r1', codigo: 'AB3K7Q' });
    useListaStore.getState().definirPego(arroz.id, true);

    useListaStore.getState().finalizarCompra(true);
    let st = useListaStore.getState();
    expect(st.historico[0].compartilhada).toBeUndefined();
    expect(st.listaAtiva?.compartilhada?.id).toBe('r1');
    expect(st.listaAtiva?.compartilhada?.ultimaConclusao).toBeGreaterThan(0);
    expect(st.listaAtiva?.itens.map((i) => i.nome)).toEqual(['Café']);

    // Outra pessoa conclui depois.
    const em = (st.listaAtiva?.compartilhada?.ultimaConclusao ?? 0) + 1000;
    useListaStore.getState().concluidaEmOutroCelular('r1', em, []);
    st = useListaStore.getState();
    expect(st.historico).toHaveLength(2);
    expect(st.listaAtiva).toMatchObject({ itens: [], compartilhada: { id: 'r1', ultimaConclusao: em } });

    // Várias listas: uma lista nova é outra lista, só deste celular; a da família continua aberta.
    const nova = useListaStore.getState().novaLista('Churrasco');
    st = useListaStore.getState();
    expect(st.listaAtiva).toMatchObject({ id: nova.id, nome: 'Churrasco' });
    expect(st.listaAtiva?.compartilhada).toBeUndefined();
    expect(st.listas.map((l) => l.compartilhada?.id)).toEqual(['r1', undefined]);
    expect(st.historico).toHaveLength(2);
  });

  it('Código de barras: produto lido entra na lista com a foto e fica lembrado', async () => {
    expect(useListaStore.getState().listaAtiva).toBeNull();
    const produto = { nome: 'Leite Condensado Integral moça', imagem: 'https://img/moca.jpg' };
    const r = useListaStore.getState().adicionarProdutoLido(produto)!;
    expect(r.tipo).toBe('novo');
    expect(useListaStore.getState().listaAtiva?.itens.map((i) => i.nome)).toEqual(['Leite Condensado Integral moça']);
    expect(Object.values(useListaStore.getState().imagens).map((i) => i.uri)).toEqual(['https://img/moca.jpg']);
    // Ler de novo soma em vez de duplicar.
    expect(useListaStore.getState().adicionarProdutoLido(produto)?.tipo).toBe('somado');

    useListaStore.getState().lembrarProdutoPorCodigo('7891000100103', produto);
    await esperar();
    expect((await lerSalvo()).state.produtosPorCodigo).toEqual({ '7891000100103': produto });
  });

  it('Várias listas: criar, trocar a atual, mexer em qualquer uma, concluir, arquivar e excluir', () => {
    const s = useListaStore.getState();
    const mercado = s.novaLista('Mercado');
    useListaStore.getState().adicionarItem('arroz');
    const farmacia = useListaStore.getState().novaLista('Farmácia');
    expect(useListaStore.getState().listaAtiva?.id).toBe(farmacia.id); // a nova vira a atual
    expect(useListaStore.getState().novaLista('Mercado').nome).toBe('Mercado 2'); // não repete nome

    // Itens de fora vão para a atual; abrir outra lista muda a atual.
    useListaStore.getState().abrirLista(farmacia.id);
    useListaStore.getState().importarItens([{ nome: 'dipirona' }]);
    useListaStore.getState().abrirLista(mercado.id);
    useListaStore.getState().adicionarProdutoLido({ nome: 'Café' });
    let st = useListaStore.getState();
    expect(st.listas.find((l) => l.id === farmacia.id)?.itens.map((i) => i.nome)).toEqual(['Dipirona']);
    expect(st.listas.find((l) => l.id === mercado.id)?.itens.map((i) => i.nome)).toEqual(['Arroz', 'Café']);

    // Ação de item funciona fora da lista atual.
    const dipirona = st.listas.find((l) => l.id === farmacia.id)!.itens[0];
    useListaStore.getState().definirPego(dipirona.id, true);
    useListaStore.getState().mudarQuantidade(dipirona.id, 1);
    expect(useListaStore.getState().listas.find((l) => l.id === farmacia.id)?.itens[0]).toMatchObject({ pego: true, quantidade: 2 });

    // Concluir a farmácia (não é a atual): vai para o histórico e sai das abertas; a atual continua o mercado.
    useListaStore.getState().finalizarCompra(false, farmacia.id);
    st = useListaStore.getState();
    expect(st.historico[0].nome).toBe('Farmácia');
    expect(st.listas.map((l) => l.nome)).toEqual(['Mercado', 'Mercado 2']);
    expect(st.listaAtiva?.id).toBe(mercado.id);

    // Arquivar (com itens vai para o histórico) e excluir (não vai).
    useListaStore.getState().arquivarLista(mercado.id);
    expect(useListaStore.getState().historico[0].nome).toBe('Mercado');
    const outra = useListaStore.getState().listas[0];
    useListaStore.getState().excluirLista(outra.id);
    st = useListaStore.getState();
    expect(st.listas).toEqual([]);
    expect(st.listaAtiva).toBeNull();
    expect(st.historico).toHaveLength(2);
  });

  it('lembra a categoria escolhida na edição para a próxima vez que o item entrar', async () => {
    const s = useListaStore.getState();
    s.novaLista('Churrasco');
    const item = s.adicionarItem('carvão')!.item;
    expect(item.categoria).toBe('outros');
    useListaStore.getState().atualizarItem(item.id, { ...item, categoria: 'carnes' });
    expect(useListaStore.getState().categoriasManuais).toEqual({ carvao: 'carnes' });

    useListaStore.getState().removerItem(item.id);
    expect(useListaStore.getState().adicionarItem('Carvão')!.item.categoria).toBe('carnes');
    await esperar();
    expect((await lerSalvo()).state.categoriasManuais).toEqual({ carvao: 'carnes' });

    useListaStore.getState().esquecerCategoriasManuais();
    expect(useListaStore.getState().categoriasManuais).toEqual({});
  });

  it('ao "abrir o app" de novo, recarrega o que estava salvo', async () => {
    const s = useListaStore.getState();
    s.novaLista('Semana');
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
    useListaStore.getState().novaLista('Apagar');
    await esperar();
    await useListaStore.getState().limparDados();
    await esperar();
    expect(useListaStore.getState().listaAtiva).toBeNull();
    const salvo = await lerSalvo();
    expect(salvo?.state?.listaAtiva ?? null).toBeNull();
  });
});
