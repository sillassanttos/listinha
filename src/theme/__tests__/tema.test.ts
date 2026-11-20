import { describe, expect, it } from '@jest/globals';

import { CATEGORIAS } from '@/data/categorias';

import { categoriaNoTema, clarear, coresClaras, coresDo, coresEscuras, esquemaEfetivo } from '../index';

// Contraste WCAG entre duas cores #RRGGBB.
function luminancia(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('modo escuro', () => {
  it('"sistema" segue o celular; claro e escuro valem sempre', () => {
    expect(esquemaEfetivo('sistema', 'dark')).toBe('escuro');
    expect(esquemaEfetivo('sistema', 'light')).toBe('claro');
    expect(esquemaEfetivo('sistema', null)).toBe('claro');
    expect(esquemaEfetivo('claro', 'dark')).toBe('claro');
    expect(esquemaEfetivo('escuro', 'light')).toBe('escuro');
    expect(coresDo('escuro')).toBe(coresEscuras);
    expect(coresDo('claro')).toBe(coresClaras);
  });

  it('as duas paletas têm as mesmas chaves', () => {
    expect(Object.keys(coresEscuras).sort()).toEqual(Object.keys(coresClaras).sort());
  });

  it('textos legíveis nas duas paletas (contraste WCAG)', () => {
    for (const c of [coresClaras, coresEscuras]) {
      expect(contraste(c.texto, c.fundo)).toBeGreaterThanOrEqual(7);
      expect(contraste(c.texto, c.superficie)).toBeGreaterThanOrEqual(7);
      expect(contraste(c.textoSecundario, c.superficie)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(c.primariaEscura, c.superficie)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(c.primariaEscura, c.primariaClara)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(c.avisoTexto, c.avisoFundo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('clarear mistura com branco', () => {
    expect(clarear('#000000', 0)).toBe('#000000');
    expect(clarear('#000000', 1)).toBe('#ffffff');
    expect(clarear('#204060', 0.5)).toBe('#90a0b0');
  });

  it('categorias: iguais no claro; no escuro, tom mais claro e legível sobre a superfície', () => {
    for (const c of Object.values(CATEGORIAS)) {
      expect(categoriaNoTema(c, coresClaras)).toBe(c);
      const e = categoriaNoTema(c, coresEscuras);
      expect(e.nome).toBe(c.nome);
      expect(e.corFundo.startsWith(e.cor)).toBe(true);
      expect(contraste(e.cor, coresEscuras.superficie)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(coresEscuras.textoSobreCor, e.cor)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
