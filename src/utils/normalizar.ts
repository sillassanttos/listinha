// Normalização de texto para comparar nomes de itens sem se importar com acentos,
// maiúsculas, pontuação e plural simples ("Limões" == "limao", "OVOS" == "ovo").

/** Remove acentos, passa para minúsculas, troca pontuação por espaço e junta espaços repetidos. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Singular simples de uma palavra já normalizada (sem acento, minúscula). */
export function singularizar(palavra: string): string {
  if (palavra.length <= 3) return palavra; // "sal", "gas", "pao"
  if (palavra.endsWith('oes') || palavra.endsWith('aes')) return palavra.slice(0, -3) + 'ao'; // limoes, paes
  if (palavra.endsWith('ns')) return palavra.slice(0, -2) + 'm'; // pudins, atuns
  if (palavra.endsWith('res') || palavra.endsWith('zes')) return palavra.slice(0, -2); // colheres, nozes
  if (palavra.endsWith('s') && !palavra.endsWith('ss') && !palavra.endsWith('is') && !palavra.endsWith('us')) {
    return palavra.slice(0, -1); // ovos, bananas, biscoitos
  }
  return palavra;
}

/**
 * Chave usada nas buscas: normaliza e coloca cada palavra no singular.
 * Palavras com números (ex.: "5kg", "2l") são ignoradas, para "arroz 5kg" casar com "arroz".
 */
export function chaveBusca(texto: string): string {
  return normalizar(texto)
    .split(' ')
    .filter((p) => p && !/\d/.test(p))
    .map(singularizar)
    .join(' ');
}
