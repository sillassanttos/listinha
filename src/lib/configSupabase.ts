// Regras puras do login e da configuração do Supabase (testadas sem rede).

export type ConfigSupabase = { url: string; chave: string };

/** Valida o que veio do .env. Modelo não preenchido, endereço sem https ou chave secreta: sem Supabase. */
export function configSupabase(url: string | undefined, chave: string | undefined): ConfigSupabase | null {
  const u = url?.trim().replace(/\/+$/, '');
  const c = chave?.trim();
  if (!u || !c) return null;
  if (!/^https:\/\/[^\s/]+$/.test(u) || u.includes('SEU-PROJETO')) return null;
  if (c.includes('xxxx')) return null;
  // A chave secreta dá acesso total ao banco e nunca pode ir dentro do app.
  if (c.startsWith('sb_secret_') || papelDoJwt(c) === 'service_role') return null;
  return { url: u, chave: c };
}

/** Papel ("anon", "service_role"…) de uma chave antiga em formato JWT; undefined se não for JWT. */
function papelDoJwt(chave: string): string | undefined {
  const partes = chave.split('.');
  if (partes.length !== 3) return undefined;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(globalThis.atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')));
    return typeof json.role === 'string' ? json.role : undefined;
  } catch {
    return undefined;
  }
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Só os dígitos do código digitado ou colado ("123 456" -> "123456"). */
export function limparCodigo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, 10);
}

/** O Supabase manda códigos de 6 a 10 dígitos (configurável no painel). */
export function codigoCompleto(codigo: string): boolean {
  return /^\d{6,10}$/.test(codigo);
}

/** Mensagem em português para os erros do login (o Supabase responde em inglês). */
export function mensagemErroLogin(erro: unknown): string {
  const e = (erro ?? {}) as { code?: unknown; message?: unknown; status?: unknown };
  const codigo = typeof e.code === 'string' ? e.code : '';
  const mensagem = typeof e.message === 'string' ? e.message.toLowerCase() : '';

  if (codigo === 'over_email_send_rate_limit' || codigo === 'over_request_rate_limit' || e.status === 429) {
    return 'Muitos pedidos seguidos. Espere um minuto e tente de novo.';
  }
  if (codigo === 'email_address_invalid' || mensagem.includes('email address')) {
    return 'Esse e-mail não foi aceito. Confira se digitou certo.';
  }
  if (codigo === 'otp_expired' || mensagem.includes('expired') || mensagem.includes('invalid')) {
    return 'Código errado ou vencido. Confira o último e-mail ou peça um novo.';
  }
  if (codigo === 'signup_disabled' || codigo === 'otp_disabled') {
    return 'O login por e-mail está desligado no projeto Supabase.';
  }
  if (mensagem.includes('network') || mensagem.includes('fetch')) {
    return 'Sem conexão com a internet. Tente de novo quando tiver sinal.';
  }
  return 'Não deu certo agora. Tente de novo em instantes.';
}
