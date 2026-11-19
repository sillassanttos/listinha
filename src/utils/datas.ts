// Formatação de datas sem depender do Intl do aparelho.

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function doisDigitos(n: number): string {
  return n.toString().padStart(2, '0');
}

/** "19/11" */
export function formatarDiaMes(timestamp: number): string {
  const d = new Date(timestamp);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`;
}

/** "hoje", "ontem" ou "quarta, 19/11" */
export function formatarDataAmigavel(timestamp: number, agora = Date.now()): string {
  const inicioDoDia = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(timestamp)) / 86_400_000);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `${DIAS[new Date(timestamp).getDay()]}, ${formatarDiaMes(timestamp)}`;
}
