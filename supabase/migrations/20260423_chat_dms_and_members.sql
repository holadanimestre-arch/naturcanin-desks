-- DMs y canales con miembros explícitos.
alter table public.chat_channels
  add column if not exists is_dm boolean not null default false,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists dm_key text unique;

create table if not exists public.chat_channel_members (
  channel_id bigint not null references public.chat_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index if not exists chat_channel_members_user_idx on public.chat_channel_members(user_id);
create index if not exists chat_channel_members_channel_idx on public.chat_channel_members(channel_id);

alter table public.chat_channel_members enable row level security;

-- Autenticados pueden consultar miembros (el filtrado fino lo hace la app).
create policy "chat_channel_members_select_auth"
  on public.chat_channel_members for select
  to authenticated using (auth.uid() is not null);

create policy "chat_channel_members_insert_auth"
  on public.chat_channel_members for insert
  to authenticated with check (auth.uid() is not null);

-- Sólo puedes quitarte a ti mismo.
create policy "chat_channel_members_delete_self"
  on public.chat_channel_members for delete
  to authenticated using (user_id = auth.uid());
