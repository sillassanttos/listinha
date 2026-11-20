import { describe, expect, it } from '@jest/globals';

import {
  buscarProdutoPorCodigo,
  codigoValido,
  imagemDoProduto,
  nomeDoProduto,
  normalizarCodigo,
  sanearProdutosPorCodigo,
} from '../codigoBarras';

describe('codigoValido e normalizarCodigo', () => {
  it('confere o dígito verificador de EAN-13, EAN-8 e UPC-A', () => {
    expect(codigoValido('4006381333931')).toBe(true); // EAN-13
    expect(codigoValido('96385074')).toBe(true); // EAN-8
    expect(codigoValido('036000291452')).toBe(true); // UPC-A
    expect(codigoValido('4006381333932')).toBe(false); // dígito errado (leitura ruim)
    expect(codigoValido('12345')).toBe(false);
    expect(codigoValido('abc')).toBe(false);
  });

  it('UPC-A vira EAN-13 com zero na frente', () => {
    expect(normalizarCodigo('036000291452')).toBe('0036000291452');
    expect(normalizarCodigo(' 4006381333931 ')).toBe('4006381333931');
  });
});

describe('nome e foto do produto', () => {
  it('nome em português + marca, sem repetir a marca', () => {
    expect(nomeDoProduto({ product_name_pt: 'Leite integral', product_name: 'Whole milk', brands: 'Piracanjuba, Outra' })).toBe(
      'Leite integral Piracanjuba',
    );
    expect(nomeDoProduto({ product_name: 'arroz Tio João tipo 1', brands: 'Tio joão' })).toBe('Arroz Tio João tipo 1');
    // Resposta real do Open Food Facts para 7891000100103: a segunda marca já está no nome.
    expect(nomeDoProduto({ product_name_pt: 'Leite Condensado Integral moça', brands: 'Nestlé, Moça' })).toBe(
      'Leite Condensado Integral moça',
    );
    expect(nomeDoProduto({ generic_name_pt: 'Biscoito' })).toBe('Biscoito');
    expect(nomeDoProduto({ brands: 'Nestlé' })).toBeNull();
  });

  it('nome comprido é cortado numa palavra inteira (até 60)', () => {
    const nome = nomeDoProduto({ product_name: 'Biscoito recheado sabor chocolate com avelã e pedaços crocantes extra' })!;
    expect(nome.length).toBeLessThanOrEqual(60);
    expect(nome.endsWith(' ')).toBe(false);
  });

  it('só aceita foto https', () => {
    expect(imagemDoProduto({ image_front_small_url: 'https://img/x.jpg' })).toBe('https://img/x.jpg');
    expect(imagemDoProduto({ image_front_url: 'http://img/x.jpg' })).toBeUndefined();
  });
});

describe('buscarProdutoPorCodigo', () => {
  const resposta = (status: number, corpo: unknown) => async () => ({ ok: status < 400, status, json: async () => corpo });

  it('produto achado', async () => {
    const r = await buscarProdutoPorCodigo(
      '7891000100103',
      resposta(200, { status: 1, product: { product_name: 'Leite condensado', brands: 'Moça', quantity: '395 g', image_front_small_url: 'https://f/1.jpg' } }),
    );
    expect(r).toEqual({ tipo: 'ok', produto: { nome: 'Leite condensado Moça', imagem: 'https://f/1.jpg', quantidade: '395 g' } });
  });

  it('não encontrado (404, status 0 ou sem nome) e erro de rede', async () => {
    expect(await buscarProdutoPorCodigo('1', resposta(404, {}))).toEqual({ tipo: 'nao-encontrado' });
    expect(await buscarProdutoPorCodigo('1', resposta(200, { status: 0 }))).toEqual({ tipo: 'nao-encontrado' });
    expect(await buscarProdutoPorCodigo('1', resposta(200, { status: 1, product: { brands: 'X' } }))).toEqual({ tipo: 'nao-encontrado' });
    expect(await buscarProdutoPorCodigo('1', resposta(503, {}))).toEqual({ tipo: 'erro' });
    expect(
      await buscarProdutoPorCodigo('1', async () => {
        throw new Error('Network request failed');
      }),
    ).toEqual({ tipo: 'erro' });
  });
});

describe('sanearProdutosPorCodigo', () => {
  it('mantém só código numérico com nome; foto só https', () => {
    expect(
      sanearProdutosPorCodigo({
        '7891000100103': { nome: ' Leite Moça ', imagem: 'http://x' },
        abc: { nome: 'x' },
        '12345678': { nome: '' },
        '96385074': 'lixo',
      }),
    ).toEqual({ '7891000100103': { nome: 'Leite Moça', imagem: undefined } });
    expect(sanearProdutosPorCodigo(null)).toEqual({});
  });
});
