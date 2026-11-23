-- Avatar Fit — schéma Supabase (PostgreSQL)
-- À coller dans Supabase > SQL Editor > New query, puis Run.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb,
  avatar jsonb,
  settings jsonb,
  planned jsonb not null default '[]'::jsonb,
  extra jsonb,
  updated_at timestamptz not null default now()
);

-- Mise à jour depuis la V1 (sans effet si la colonne existe déjà)
alter table public.user_data add column if not exists extra jsonb;

create table if not exists public.sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_date on public.sessions(user_id, date desc);

create table if not exists public.chat_messages (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','coach')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_user_date on public.chat_messages(user_id, created_at);

-- Sécurité : chaque utilisateur ne voit et ne modifie que ses propres lignes.
alter table public.user_data enable row level security;
alter table public.sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "own user_data" on public.user_data;
create policy "own user_data" on public.user_data for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own chat" on public.chat_messages;
create policy "own chat" on public.chat_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
