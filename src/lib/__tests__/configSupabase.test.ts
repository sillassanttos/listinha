import { describe, expect, it } from '@jest/globals';

import { codigoCompleto, configSupabase, emailValido, limparCodigo, mensagemErroLogin } from '../configSupabase';

function jwt(role: string): string {
  const parte = (o: object) =>
    globalThis.btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${parte({ alg: 'HS256' })}.${parte({ role, iss: 'supabase' })}.assinatura`;
}

describe('configSupabase', () => {
  it('aceita URL https e chave pública (nova ou anon)', () => {
    expect(configSupabase(' https://abc.supabase.co/ ', ' sb_publishable_123 ')).toEqual({
      url: 'https://abc.supabase.co',
      chave: 'sb_publishable_123',
    });
    expect(configSupabase('https://abc.supabase.co', jwt('anon'))).not.toBeNull();
  });

  it('sem .env, com o modelo não preenchido ou com endereço estranho: sem Supabase', () => {
    expect(configSupabase(undefined, undefined)).toBeNull();
    expect(configSupabase('https://SEU-PROJETO.supabase.co', 'sb_publishable_xxxxxxxx')).toBeNull();
    expect(configSupabase('http://abc.supabase.co', 'sb_publishable_1')).toBeNull();
    expect(configSupabase('https://abc.supabase.co/rest/v1', 'sb_publishable_1')).toBeNull();
  });

  it('recusa a chave secreta, nova ou antiga', () => {
    expect(configSupabase('https://abc.supabase.co', 'sb_secret_123')).toBeNull();
    expect(configSupabase('https://abc.supabase.co', jwt('service_role'))).toBeNull();
  });
});

describe('login por código', () => {
  it('e-mail e código', () => {
    expect(emailValido(' maria@exemplo.com.br ')).toBe(true);
    expect(emailValido('maria@exemplo')).toBe(false);
    expect(emailValido('maria exemplo.com')).toBe(false);
    expect(limparCodigo('123 456\n')).toBe('123456');
    expect(codigoCompleto('12345')).toBe(false);
    expect(codigoCompleto('123456')).toBe(true);
  });

  it('erros do Supabase em português', () => {
    expect(mensagemErroLogin({ code: 'over_email_send_rate_limit' })).toMatch(/Espere um minuto/);
    expect(mensagemErroLogin({ code: 'otp_expired', message: 'Token has expired or is invalid' })).toMatch(/vencido/);
    expect(mensagemErroLogin({ code: 'email_address_invalid', message: 'Email address "x" is invalid' })).toMatch(/e-mail/);
    expect(mensagemErroLogin({ message: 'Network request failed' })).toMatch(/internet/);
    expect(mensagemErroLogin(null)).toMatch(/Tente de novo/);
  });
});
