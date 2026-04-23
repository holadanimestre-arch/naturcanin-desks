-- Permite que los miembros vean los canales a los que pertenecen
-- (se aplica en OR con cualquier política existente)
alter table public.chat_channels enable row level security;

create policy "chat_channels_select_member"
  on public.chat_channels for select
  to authenticated
  using (
    -- El usuario está en la lista de miembros del canal
    exists (
      select 1 from public.chat_channel_members
      where channel_id = chat_channels.id
        and user_id = auth.uid()
    )
    -- O el canal no tiene miembros (canales legacy/públicos)
    or not exists (
      select 1 from public.chat_channel_members
      where channel_id = chat_channels.id
    )
  );

-- Cualquier autenticado puede crear canales
create policy "chat_channels_insert_auth"
  on public.chat_channels for insert
  to authenticated
  with check (auth.uid() is not null);
