import { describe, expect, it } from '@jest/globals';

import type { ItemLista } from '@/types';
import { criarItem } from '@/utils/lista';

import {
  aplicarEvento,
  arquivarConclusaoRemota,
  concluirCompartilhada,
  conclusaoNova,
  codigoConviteValido,
  diferencasItens,
  itemParaLinha,
  linhaParaItem,
  mesclarRemoto,
  normalizarCodigo,
  listaAoEntrar,
  mensagemErroFamilia,
  textoConvite,
} from '../regras';

function item(nome: string, criadoEm: number, extra: Partial<ItemLista> = {}): ItemLista {
  return { ...criarItem(nome, criadoEm), id: nome, ...extra };
}

const nenhum = new Set<string>();

describe('item <-> linha do banco', () => {
  it('ida e volta sem perder nada (menos a foto, que é só do celular)', () => {
    const original = item('Leite', 10, { quantidade: 6, unidade: 'L', pego: true, pegoEm: 99, preco: 4.5, observacao: 'integral', imagemUri: 'x' });
    const linha = itemParaLinha(original, 'lista-1');
    expect(linha).toMatchObject({ lista_id: 'lista-1', id: 'Leite', pego_em: 99, preco: 4.5, observacao: 'integral', criado_em: 10 });
    const { imagemUri: _foto, ...semFoto } = original;
    expect(linhaParaItem(linha)).toEqual(semFoto);
  });

  it('números que chegam como texto (numeric do Postgres) e lixo', () => {
    const linha = { ...itemParaLinha(item('Arroz', 1), 'l'), quantidade: '1.5', preco: '10.90' };
    expect(linhaParaItem(linha)).toMatchObject({ quantidade: 1.5, preco: 10.9 });
    expect(linhaParaItem(null)).toBeNull();
    expect(linhaParaItem({ id: 'x' })).toBeNull();
  });
});

describe('diferencasItens', () => {
  it('novo, alterado e apagado; foto em cache não conta', () => {
    const a = item('Arroz', 1);
    const b = item('Feijão', 2);
    const antes = [a, b];
    const depois = [{ ...a, quantidade: 2 }, item('Café', 3), { ...b, imagemUri: 'foto' }].filter((i) => i.id !== 'Feijão');
    const r = diferencasItens(antes, depois);
    expect(r.salvar.map((i) => i.id)).toEqual(['Arroz', 'Café']);
    expect(r.apagar).toEqual(['Feijão']);
    expect(diferencasItens(antes, [a, { ...b, imagemUri: 'foto' }])).toEqual({ salvar: [], apagar: [] });
  });
});

describe('mesclarRemoto', () => {
  it('o servidor vale, menos para o que tem mudança local pendente', () => {
    const local = [item('Arroz', 1, { quantidade: 3 }), item('Feijão', 2), item('Café', 5)];
    const remotos = [item('Arroz', 1, { quantidade: 1 }), item('Leite', 4)];
    // Arroz pendente (local vale); Feijão apagado por outra pessoa; Café novo aqui, ainda não subiu.
    const r = mesclarRemoto(local, remotos, new Set(['Arroz', 'Café']));
    expect(r.map((i) => [i.id, i.quantidade])).toEqual([
      ['Arroz', 3],
      ['Leite', 1],
      ['Café', 1],
    ]);
  });

  it('mantém a foto local de itens que vieram do servidor', () => {
    const r = mesclarRemoto([item('Pão', 1, { imagemUri: 'foto' })], [item('Pão', 1, { pego: true })], nenhum);
    expect(r[0]).toMatchObject({ pego: true, imagemUri: 'foto' });
  });
});

describe('aplicarEvento (tempo real)', () => {
  const itens = [item('Arroz', 1), item('Café', 3)];

  it('item novo entra na ordem de criação; alterado troca; apagado sai', () => {
    expect(aplicarEvento(itens, { tipo: 'salvo', item: item('Leite', 2) }, nenhum).map((i) => i.id)).toEqual(['Arroz', 'Leite', 'Café']);
    expect(aplicarEvento(itens, { tipo: 'salvo', item: item('Arroz', 1, { pego: true }) }, nenhum)[0].pego).toBe(true);
    expect(aplicarEvento(itens, { tipo: 'apagado', id: 'Café' }, nenhum).map((i) => i.id)).toEqual(['Arroz']);
  });

  it('sem mudança devolve a mesma lista; item pendente é ignorado', () => {
    expect(aplicarEvento(itens, { tipo: 'salvo', item: item('Arroz', 1) }, nenhum)).toBe(itens);
    expect(aplicarEvento(itens, { tipo: 'apagado', id: 'Arroz' }, new Set(['Arroz']))).toBe(itens);
    expect(aplicarEvento(itens, { tipo: 'salvo', item: item('Arroz', 1, { quantidade: 9 }) }, new Set(['Arroz']))).toBe(itens);
  });
});

describe('código de convite', () => {
  it('normaliza o que a pessoa digita', () => {
    expect(normalizarCodigo(' ab3-k7q ')).toBe('AB3K7Q');
    expect(normalizarCodigo('abc12345')).toBe('ABC234'); // 1 não existe no código
    expect(codigoConviteValido('AB3K7Q')).toBe(true);
    expect(codigoConviteValido('AB3K7')).toBe(false);
    expect(textoConvite('Compra da semana', 'AB3K7Q')).toContain('AB3K7Q');
  });
});

describe('listaAoEntrar', () => {
  const remota = { nome: 'Casa', compartilhada: { id: 'r1', codigo: 'AB3K7Q' } };
  const atual = { id: 'local', nome: 'Minha', criadaEm: 1, itens: [item('Arroz', 1), item('leite', 2), item('Pão', 3, { pego: true })] };
  const daFamilia = [item('Leite', 5)];

  it('juntar: mantém a lista local, traz a da família e envia só o que falta', () => {
    const r = listaAoEntrar(atual, remota, daFamilia, true, 100);
    expect(r.novaLista).toMatchObject({ id: 'local', nome: 'Casa', compartilhada: { codigo: 'AB3K7Q' } });
    expect(r.paraEnviar.map((i) => i.id)).toEqual(['Arroz']); // leite já tem; pão já foi pego
    expect(r.novaLista.itens.map((i) => i.id)).toEqual(['Arroz', 'Leite']);
    expect(r.finalizada).toBeUndefined();
  });

  it('não juntar: a atual vai para o histórico; sem lista ativa, só entra', () => {
    const r = listaAoEntrar(atual, remota, daFamilia, false, 100);
    expect(r.finalizada).toMatchObject({ id: 'local', finalizadaEm: 100 });
    expect(r.novaLista.itens.map((i) => i.id)).toEqual(['Leite']);
    expect(listaAoEntrar(null, remota, [], true, 100).finalizada).toBeUndefined();
  });
});

describe('mensagemErroFamilia', () => {
  it('traduz os erros mais comuns', () => {
    expect(mensagemErroFamilia({ message: 'código não encontrado' })).toMatch(/Confira/);
    expect(mensagemErroFamilia({ code: 'PGRST202' })).toMatch(/esquema/);
    expect(mensagemErroFamilia({ message: 'TypeError: Network request failed' })).toMatch(/internet/);
    expect(mensagemErroFamilia(undefined)).toMatch(/Tente de novo/);
  });
});

describe('concluir compra na lista da família', () => {
  const lista = {
    id: 'l1',
    nome: 'Casa',
    criadaEm: 1,
    orcamento: 300,
    compartilhada: { id: 'r1', codigo: 'AB3K7Q' },
    itens: [item('Arroz', 1, { pego: true, pegoEm: 5 }), item('Café', 2), item('Leite', 3)],
  };

  it('a compra vai para o histórico e a lista da família segue com o que faltou, mesmos ids', () => {
    const { finalizada, proxima } = concluirCompartilhada(lista, true, 100);
    expect(finalizada).toMatchObject({ id: 'l1', finalizadaEm: 100 });
    expect(finalizada.compartilhada).toBeUndefined();
    expect(proxima.compartilhada).toEqual({ id: 'r1', codigo: 'AB3K7Q', ultimaConclusao: 100 });
    expect(proxima.itens.map((i) => i.id)).toEqual(['Café', 'Leite']);
    expect(proxima.orcamento).toBeUndefined();
    expect(proxima.id).not.toBe('l1');
    // No servidor: só o pego sai.
    expect(diferencasItens(lista.itens, proxima.itens)).toEqual({ salvar: [], apagar: ['Arroz'] });
  });

  it('sem levar pendentes a lista da família fica vazia; nome novo vale', () => {
    const { proxima } = concluirCompartilhada(lista, false, 100, 'Churrasco');
    expect(proxima).toMatchObject({ nome: 'Churrasco', itens: [] });
  });

  it('conclusão feita em outro celular', () => {
    const r = arquivarConclusaoRemota(lista, 200);
    expect(r.finalizada?.finalizadaEm).toBe(200);
    expect(r.proxima.compartilhada?.ultimaConclusao).toBe(200);
    expect(arquivarConclusaoRemota({ ...lista, itens: [] }, 200).finalizada).toBeUndefined();
    expect(conclusaoNova(200, 100)).toBe(200);
    expect(conclusaoNova('200', undefined)).toBe(200);
    expect(conclusaoNova(100, 100)).toBeUndefined();
    expect(conclusaoNova(null, undefined)).toBeUndefined();
  });
});
