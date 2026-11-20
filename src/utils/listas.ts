import type { Lista } from '@/types';

// Fase 3: várias listas abertas ao mesmo tempo (mercado, farmácia, feira…).
// "Lista atual" = a aberta por último; é para ela que vão os itens que entram de fora
// (Despensa, leitor de código, lembretes, repetir, importar).
// As funções trocam só a lista mexida e mantêm as outras como estão (mesmo objeto), para a
// sincronização não ver mudança onde não houve.

/** A lista atual: a do id guardado ou, se ela não existe mais, a primeira aberta. */
export function resolverAtual(listas: Lista[], id: string | null | undefined): Lista | null {
  return listas.find((l) => l.id === id) ?? listas[0] ?? null;
}

/** Troca a lista de id `id` por `nova` (na mesma posição); com `null`, tira a lista. */
export function substituirLista(listas: Lista[], id: string, nova: Lista | null): Lista[] {
  const indice = listas.findIndex((l) => l.id === id);
  if (indice < 0) return nova ? [...listas, nova] : listas;
  const copia = [...listas];
  if (nova) copia[indice] = nova;
  else copia.splice(indice, 1);
  return copia;
}

/** A lista aberta que tem esse item (ids de item são únicos entre listas). */
export function listaComItem(listas: Lista[], itemId: string): Lista | undefined {
  return listas.find((l) => l.itens.some((i) => i.id === itemId));
}

/** A lista aberta ligada a essa lista da família (id remoto do Supabase). */
export function listaPorRemoto(listas: Lista[], remotoId: string): Lista | undefined {
  return listas.find((l) => l.compartilhada?.id === remotoId);
}

/** Nome para uma lista nova que não repete o de outra aberta ("Feira", "Feira 2"…). */
export function nomeSemRepetir(listas: Lista[], nome: string): string {
  const base = nome.trim() || 'Compra da semana';
  const usados = new Set(listas.map((l) => l.nome.trim().toLowerCase()));
  if (!usados.has(base.toLowerCase())) return base;
  let n = 2;
  while (usados.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}
