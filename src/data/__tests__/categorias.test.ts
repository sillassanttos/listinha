import { describe, expect, it } from '@jest/globals';

import { ORDEM_CATEGORIAS, moverCategoria, sanearOrdemCategorias } from '../categorias';

describe('sanearOrdemCategorias', () => {
  it('lixo vira a ordem padrão', () => {
    expect(sanearOrdemCategorias(undefined)).toEqual(ORDEM_CATEGORIAS);
    expect(sanearOrdemCategorias('x')).toEqual(ORDEM_CATEGORIAS);
  });

  it('mantém a ordem do usuário, tira inválidos e repetidos e completa o que falta', () => {
    const r = sanearOrdemCategorias(['limpeza', 'xyz', 'hortifruti', 'limpeza', 42]);
    expect(r.slice(0, 2)).toEqual(['limpeza', 'hortifruti']);
    expect(r).toHaveLength(ORDEM_CATEGORIAS.length);
    expect(new Set(r).size).toBe(ORDEM_CATEGORIAS.length);
    expect(r[2]).toBe('padaria'); // o resto segue a ordem padrão
  });
});

describe('moverCategoria', () => {
  it('sobe e desce uma posição', () => {
    const subiu = moverCategoria(ORDEM_CATEGORIAS, 'padaria', -1);
    expect(subiu.slice(0, 2)).toEqual(['padaria', 'hortifruti']);
    const desceu = moverCategoria(ORDEM_CATEGORIAS, 'hortifruti', 1);
    expect(desceu.slice(0, 2)).toEqual(['padaria', 'hortifruti']);
  });

  it('não sai das pontas nem mexe na lista original', () => {
    expect(moverCategoria(ORDEM_CATEGORIAS, 'hortifruti', -1)).toBe(ORDEM_CATEGORIAS);
    expect(moverCategoria(ORDEM_CATEGORIAS, 'outros', 1)).toBe(ORDEM_CATEGORIAS);
    moverCategoria(ORDEM_CATEGORIAS, 'padaria', -1);
    expect(ORDEM_CATEGORIAS[0]).toBe('hortifruti');
  });
});
