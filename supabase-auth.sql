-- ========================================
-- Você Pode Tudo — contas e sincronização
-- Execute este SQL no Editor SQL do Supabase
-- ========================================

-- Dados de progresso e favoritos por usuário.
-- Cada usuário só pode ler e alterar a própria linha (Row Level Security).
create table if not exists public.user_data (
    user_id uuid primary key references auth.users(id) on delete cascade,
    progress jsonb not null default '[]'::jsonb,
    favorites jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);

-- Mantém updated_at sempre atualizado.
create or replace function public.set_user_data_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trigger_user_data_updated_at on public.user_data;
create trigger trigger_user_data_updated_at
    before update on public.user_data
    for each row execute function public.set_user_data_updated_at();

-- Segurança por linha.
alter table public.user_data enable row level security;

drop policy if exists "Users read own data" on public.user_data;
create policy "Users read own data"
    on public.user_data for select
    using (auth.uid() = user_id);

drop policy if exists "Users insert own data" on public.user_data;
create policy "Users insert own data"
    on public.user_data for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users update own data" on public.user_data;
create policy "Users update own data"
    on public.user_data for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users delete own data" on public.user_data;
create policy "Users delete own data"
    on public.user_data for delete
    using (auth.uid() = user_id);

-- Permissões para usuários autenticados. A RLS continua limitando cada linha.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_data to authenticated;

-- ========================================
-- Configuração recomendada no painel
-- ========================================
-- Authentication > Providers > Email: habilitado
-- Authentication > URL Configuration:
--   Site URL: https://vocepodetudo.netlify.app
--   Redirect URLs: https://vocepodetudo.netlify.app e http://localhost:8000 (testes)
-- Se quiser testar sem confirmação de e-mail:
--   Authentication > Providers > Email > Confirm email: desabilitado
