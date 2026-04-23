-- RLS para chat_messages: los miembros del canal pueden leer y escribir
alter table public.chat_messages enable row level security;

-- Leer mensajes: solo si eres miembro del canal (o el canal es legacy/público)
create policy "chat_messages_select_member"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_channel_members
      where channel_id = chat_messages.channel_id
        and user_id = auth.uid()
    )
    or not exists (
      select 1 from public.chat_channel_members
      where channel_id = chat_messages.channel_id
    )
  );

-- Escribir mensajes: solo si eres miembro del canal (o el canal es legacy/público)
create policy "chat_messages_insert_member"
  on public.chat_messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1 from public.chat_channel_members
        where channel_id = chat_messages.channel_id
          and user_id = auth.uid()
      )
      or not exists (
        select 1 from public.chat_channel_members
        where channel_id = chat_messages.channel_id
      )
    )
  );

-- Activar Realtime para mensajes en tiempo real
alter publication supabase_realtime add table public.chat_messages;
