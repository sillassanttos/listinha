import { describe, expect, it } from '@jest/globals';

import {
  buscarImagemOnline,
  criarFilaDeBusca,
  escolherImagem,
  precisaBuscarImagem,
  termoBusca,
  type ProdutoOFF,
} from '../imagens';

const IMG = (n: number) => `https://images.openfoodfacts.org/images/products/${n}/front_pt.200.jpg`;

describe('termoBusca', () => {
  it('tira números, pontuação e símbolos de consulta', () => {
    expect(termoBusca('Arroz Tio João 5kg')).toBe('Arroz Tio João');
    expect(termoBusca('leite (integral) + "promo"')).toBe('leite integral promo');
    expect(termoBusca('123')).toBe('');
  });
});

describe('escolherImagem', () => {
  const produtos: ProdutoOFF[] = [
    { product_name: 'Fita Crackers', image_front_small_url: IMG(1), countries_tags: ['en:philippines'] },
    { product_name: 'Arroz Tio João Integral', countries_tags: ['en:brazil'] }, // sem imagem
    { product_name: 'Arroz Tio João Risoto', image_front_small_url: IMG(2), countries_tags: ['en:portugal'] },
    { product_name: 'Arroz Tio João 7 Grãos', image_front_small_url: IMG(3), countries_tags: ['en:brazil'] },
  ];

  it('exige todas as palavras do item e prefere o Brasil', () => {
    expect(escolherImagem(produtos, 'arroz tio joão 5kg')).toBe(IMG(3));
  });

  it('não aceita produto que só tem parte do nome', () => {
    expect(escolherImagem(produtos, 'fita isolante')).toBeNull();
  });

  it('ignora palavras vazias como "de" e "do"', () => {
    expect(escolherImagem([{ product_name: 'Ração Peixe Tropical', image_front_small_url: IMG(4) }], 'ração do peixe')).toBe(IMG(4));
  });

  it('sem produtos ou sem imagem válida, null', () => {
    expect(escolherImagem([], 'nescau')).toBeNull();
    expect(escolherImagem([{ product_name: 'Nescau', image_front_small_url: 'http://inseguro.jpg' }], 'nescau')).toBeNull();
  });
});

describe('buscarImagemOnline', () => {
  const resposta = (ok: boolean, corpo: unknown) => async () => ({ ok, json: async () => corpo });

  it('devolve a foto escolhida', async () => {
    const r = await buscarImagemOnline('nescau', resposta(true, { hits: [{ product_name: 'Nescau 200g', image_front_small_url: IMG(5) }] }));
    expect(r).toEqual({ tipo: 'ok', uri: IMG(5) });
  });

  it('procurou e não achou: ok com null', async () => {
    expect(await buscarImagemOnline('fita isolante', resposta(true, { hits: [] }))).toEqual({ tipo: 'ok', uri: null });
  });

  it('HTTP com erro, resposta estranha ou sem internet viram "erro" (tentar depois)', async () => {
    expect(await buscarImagemOnline('nescau', resposta(false, {}))).toEqual({ tipo: 'erro' });
    expect(await buscarImagemOnline('nescau', resposta(true, { outra: 1 }))).toEqual({ tipo: 'erro' });
    expect(
      await buscarImagemOnline('nescau', async () => {
        throw new Error('Network request failed');
      }),
    ).toEqual({ tipo: 'erro' });
  });

  it('manda o nome sem números na consulta e um User-Agent próprio', async () => {
    let urlUsada = '';
    let agente = '';
    await buscarImagemOnline('Arroz Tio João 5kg', async (url, init) => {
      urlUsada = url;
      agente = init.headers['User-Agent'];
      return { ok: true, json: async () => ({ hits: [] }) };
    });
    expect(urlUsada).toContain('q=Arroz%20Tio%20Jo%C3%A3o');
    expect(urlUsada).not.toContain('5kg');
    expect(agente).toMatch(/^Listinha\//);
  });
});

describe('precisaBuscarImagem', () => {
  const AGORA = 100 * 86_400_000;

  it('itens do catálogo usam o emoji e não buscam', () => {
    expect(precisaBuscarImagem('Arroz', {}, AGORA)).toBe(false);
    expect(precisaBuscarImagem('limões', {}, AGORA)).toBe(false);
  });

  it('itens fora do catálogo buscam uma vez', () => {
    expect(precisaBuscarImagem('Arroz Tio João 5kg', {}, AGORA)).toBe(true);
    expect(precisaBuscarImagem('Nescau', {}, AGORA)).toBe(false); // sinônimo de Achocolatado: já tem emoji
    expect(precisaBuscarImagem('Arroz tio joão', { 'arroz tio joao': { uri: IMG(1), em: 1 } }, AGORA)).toBe(false);
  });

  it('sem foto, tenta de novo só depois de 30 dias', () => {
    const cache = { 'fita isolante': { uri: null, em: AGORA - 10 * 86_400_000 } };
    expect(precisaBuscarImagem('Fita isolante', cache, AGORA)).toBe(false);
    expect(precisaBuscarImagem('Fita isolante', cache, AGORA + 25 * 86_400_000)).toBe(true);
  });

  it('nome só com números não busca', () => {
    expect(precisaBuscarImagem('123', {}, AGORA)).toBe(false);
  });
});

describe('criarFilaDeBusca', () => {
  it('executa um de cada vez, sem repetir o mesmo item', async () => {
    const feitos: string[] = [];
    const fila = criarFilaDeBusca(
      async (nome) => {
        feitos.push(nome);
      },
      1500,
      async () => {},
    );
    fila.adicionar('Nescau');
    fila.adicionar('nescau'); // mesmo item
    fila.adicionar('Arroz tio joão');
    await new Promise((r) => setTimeout(r, 10));
    expect(feitos).toEqual(['Nescau', 'Arroz tio joão']);
    expect(fila.tamanho()).toBe(0);
  });
});
