import type { CategoriaId, Lista } from '@/types';

import { listaContem } from './lista';
import { chaveBusca } from './normalizar';

// Sugestões por frequência (Fase 2): a partir das compras finalizadas, descobre o que
// a pessoa compra sempre, de quanto em quanto tempo, e o que provavelmente está acabando.
// "Comprado" = item marcado como pego numa lista do histórico.

const DIA = 86_400_000;

export type Frequencia = {
  nome: string;
  emoji: string;
  categoria: CategoriaId;
  /** Em quantas compras (dias diferentes) o item foi pego. */
  vezes: number;
  ultimaCompra: number;
  /** Dias inteiros desde a última compra. */
  diasDesde: number;
  /** Intervalo médio entre compras, em dias (só com 2 compras ou mais em dias diferentes). */
  intervaloMedio?: number;
  /** Já passou do intervalo de costume: provavelmente está acabando. */
  atrasado: boolean;
};

function inicioDoDia(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Frequência de cada item comprado pelo menos 2 vezes, do mais "atrasado" para o menos. */
export function calcularFrequencias(historico: Lista[], agora = Date.now()): Frequencia[] {
  type Acumulado = { nome: string; emoji: string; categoria: CategoriaId; dias: Set<number>; ultima: number };
  const porItem = new Map<string, Acumulado>();

  for (const lista of historico) {
    const quando = lista.finalizadaEm ?? lista.criadaEm;
    for (const item of lista.itens) {
      if (!item.pego) continue;
      const chave = chaveBusca(item.nome);
      if (!chave) continue;
      const data = item.pegoEm ?? quando;
      const atual = porItem.get(chave);
      if (!atual) {
        porItem.set(chave, { nome: item.nome, emoji: item.emoji, categoria: item.categoria, dias: new Set([inicioDoDia(data)]), ultima: data });
      } else {
        atual.dias.add(inicioDoDia(data));
        if (data > atual.ultima) {
          // nome/emoji/categoria mais recentes vencem (o usuário pode ter editado)
          Object.assign(atual, { nome: item.nome, emoji: item.emoji, categoria: item.categoria, ultima: data });
        }
      }
    }
  }

  const hoje = inicioDoDia(agora);
  const resultado: Frequencia[] = [];
  for (const a of porItem.values()) {
    const dias = [...a.dias].sort((x, y) => x - y);
    // Contamos compras em dias diferentes; 2 listas no mesmo dia contam como 1.
    if (dias.length < 2) continue;
    const intervaloMedio = Math.round((dias[dias.length - 1] - dias[0]) / DIA / (dias.length - 1));
    const diasDesde = Math.max(0, Math.round((hoje - inicioDoDia(a.ultima)) / DIA));
    resultado.push({
      nome: a.nome,
      emoji: a.emoji,
      categoria: a.categoria,
      vezes: dias.length,
      ultimaCompra: a.ultima,
      diasDesde,
      intervaloMedio,
      atrasado: intervaloMedio >= 1 && diasDesde >= intervaloMedio,
    });
  }

  // Mais atrasado primeiro (proporção dias desde / intervalo), depois quem é comprado mais vezes.
  const atraso = (f: Frequencia) => f.diasDesde / Math.max(1, f.intervaloMedio ?? 1);
  return resultado.sort((a, b) => atraso(b) - atraso(a) || b.vezes - a.vezes || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** O que a pessoa costuma comprar e ainda não está (não pego) na lista atual. */
export function sugestoesPorFrequencia(historico: Lista[], lista: Lista | null, agora = Date.now(), limite = 8): Frequencia[] {
  return calcularFrequencias(historico, agora)
    .filter((f) => !lista || !listaContem(lista, f.nome))
    .slice(0, limite);
}

/** Frase do lembrete: "faz 12 dias que você não compra café". */
export function textoLembrete(f: Frequencia): string {
  const nome = f.nome.toLowerCase();
  if (f.diasDesde === 0) return `você comprou ${nome} hoje`;
  if (f.diasDesde === 1) return `faz 1 dia que você não compra ${nome}`;
  return `faz ${f.diasDesde} dias que você não compra ${nome}`;
}

/** Rótulo curto para o chip: "12 dias", "hoje", "3x". */
export function rotuloCurto(f: Frequencia): string {
  if (f.diasDesde === 0) return `${f.vezes}x`;
  return f.diasDesde === 1 ? '1 dia' : `${f.diasDesde} dias`;
}
