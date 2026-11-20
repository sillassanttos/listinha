-- Listinha: esquema da lista compartilhada (Fase 3).
-- Rodar no Supabase em SQL Editor -> New query -> colar tudo -> Run.
-- Pode rodar de novo sem perder dados (cria só o que falta e recria funções e regras).
--
-- Segurança: toda tabela tem RLS. Só quem é membro de uma lista vê e mexe nela.
-- Criar lista, entrar por código e sair são feitos pelas funções abaixo (o app não grava
-- direto em "listas" nem em "membros"). A chave pública do app não dá acesso a nada sem login.

-- ---------------------------------------------------------------- tabelas

create table if not exists public.listas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 60),
  codigo text not null unique,
  orcamento numeric check (orcamento is null or orcamento > 0),
  finalizada_em timestamptz,
  criada_por uuid not null default auth.uid() references auth.users on delete cascade,
  criada_em timestamptz not null default now()
);

-- Etapa 3: quando a família concluiu a última compra (ms desde 1970). Cada celular arquiva a sua cópia.
alter table public.listas add column if not exists concluida_em bigint;

create table if not exists public.membros (
  lista_id uuid not null references public.listas on delete cascade,
  usuario_id uuid not null references auth.users on delete cascade,
  entrou_em timestamptz not null default now(),
  primary key (lista_id, usuario_id)
);
create index if not exists membros_usuario_idx on public.membros (usuario_id);

create table if not exists public.itens (
  lista_id uuid not null references public.listas on delete cascade,
  id text not null check (char_length(id) between 1 and 40),
  nome text not null check (char_length(nome) between 1 and 60),
  categoria text not null check (char_length(categoria) <= 20),
  emoji text not null check (char_length(emoji) <= 16),
  quantidade numeric not null check (quantidade > 0 and quantidade < 100000),
  unidade text not null check (unidade in ('un', 'kg', 'g', 'L', 'ml', 'dz', 'pct', 'cx')),
  pego boolean not null default false,
  pego_em bigint,
  preco numeric check (preco is null or (preco > 0 and preco < 1000000)),
  observacao text check (observacao is null or char_length(observacao) <= 80),
  criado_em bigint not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  primary key (lista_id, id)
);

-- ---------------------------------------------------------------- funções

-- true se quem está logado participa da lista (security definer evita recursão nas regras de "membros").
create or replace function public.eh_membro(p_lista uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m where m.lista_id = p_lista and m.usuario_id = auth.uid()
  );
$$;

-- Cria uma lista compartilhada com código de convite de 6 caracteres (sem 0/O/1/I) e entra nela.
create or replace function public.criar_lista(p_nome text, p_orcamento numeric default null)
returns public.listas
language plpgsql
security definer
set search_path = ''
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  novo_codigo text;
  nova public.listas;
begin
  if auth.uid() is null then
    raise exception 'login necessário';
  end if;
  loop
    novo_codigo := '';
    for i in 1..6 loop
      novo_codigo := novo_codigo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from public.listas l where l.codigo = novo_codigo);
  end loop;

  insert into public.listas (nome, codigo, orcamento, criada_por)
  values (coalesce(nullif(trim(p_nome), ''), 'Compra da semana'), novo_codigo, p_orcamento, auth.uid())
  returning * into nova;

  insert into public.membros (lista_id, usuario_id) values (nova.id, auth.uid());
  return nova;
end;
$$;

-- Entra numa lista pelo código de convite (maiúsculas/minúsculas e espaços não importam).
create or replace function public.entrar_na_lista(p_codigo text)
returns public.listas
language plpgsql
security definer
set search_path = ''
as $$
declare
  achada public.listas;
begin
  if auth.uid() is null then
    raise exception 'login necessário';
  end if;
  select * into achada from public.listas l
  where l.codigo = upper(regexp_replace(coalesce(p_codigo, ''), '\s', '', 'g'))
    and l.finalizada_em is null;
  if achada.id is null then
    raise exception 'código não encontrado';
  end if;
  insert into public.membros (lista_id, usuario_id) values (achada.id, auth.uid())
  on conflict do nothing;
  return achada;
end;
$$;

-- Sai da lista; a última pessoa a sair apaga a lista (e os itens).
create or replace function public.sair_da_lista(p_lista uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.membros m where m.lista_id = p_lista and m.usuario_id = auth.uid();
  if not exists (select 1 from public.membros m where m.lista_id = p_lista) then
    delete from public.listas l where l.id = p_lista;
  end if;
end;
$$;

-- Quem e quando mexeu por último em cada item (o app não precisa mandar).
create or replace function public.carimbar_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end;
$$;

drop trigger if exists itens_carimbo on public.itens;
create trigger itens_carimbo before insert or update on public.itens
for each row execute function public.carimbar_item();

-- ---------------------------------------------------------------- permissões e regras (RLS)

alter table public.listas enable row level security;
alter table public.membros enable row level security;
alter table public.itens enable row level security;

revoke all on public.listas, public.membros, public.itens from anon;
revoke all on public.listas, public.membros, public.itens from authenticated;
grant select on public.listas, public.membros to authenticated;
grant update (nome, orcamento, finalizada_em, concluida_em) on public.listas to authenticated;
grant select, insert, update, delete on public.itens to authenticated;

revoke execute on function public.eh_membro(uuid) from public, anon;
revoke execute on function public.criar_lista(text, numeric) from public, anon;
revoke execute on function public.entrar_na_lista(text) from public, anon;
revoke execute on function public.sair_da_lista(uuid) from public, anon;
grant execute on function public.eh_membro(uuid) to authenticated;
grant execute on function public.criar_lista(text, numeric) to authenticated;
grant execute on function public.entrar_na_lista(text) to authenticated;
grant execute on function public.sair_da_lista(uuid) to authenticated;

drop policy if exists "membro vê a lista" on public.listas;
create policy "membro vê a lista" on public.listas
  for select to authenticated using (public.eh_membro(id));

drop policy if exists "membro altera a lista" on public.listas;
create policy "membro altera a lista" on public.listas
  for update to authenticated using (public.eh_membro(id)) with check (public.eh_membro(id));

drop policy if exists "membro vê quem participa" on public.membros;
create policy "membro vê quem participa" on public.membros
  for select to authenticated using (public.eh_membro(lista_id));

drop policy if exists "membro mexe nos itens" on public.itens;
create policy "membro mexe nos itens" on public.itens
  for all to authenticated using (public.eh_membro(lista_id)) with check (public.eh_membro(lista_id));

-- ---------------------------------------------------------------- tempo real

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'itens'
  ) then
    alter publication supabase_realtime add table public.itens;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'listas'
  ) then
    alter publication supabase_realtime add table public.listas;
  end if;
end;
$$;
