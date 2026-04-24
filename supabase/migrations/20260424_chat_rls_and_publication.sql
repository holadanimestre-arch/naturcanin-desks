-- Asegura que chat_channel_members esté en la publicación de realtime.
-- Sin esto, el INSERT de un miembro nuevo no llega al cliente B en tiempo real
-- y el DM no aparece hasta que el polling lo descubre.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_channel_members'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_channel_members';
  end if;
end $$;

-- Endurece el INSERT de miembros: solo puedes añadirte a ti mismo desde el cliente.
-- Los INSERT de otros usuarios deben pasar por la función SECURITY DEFINER
-- public.create_or_find_dm, que ignora RLS.
drop policy if exists "chat_channel_members_insert_auth" on public.chat_channel_members;

create policy "chat_channel_members_insert_self"
  on public.chat_channel_members for insert
  to authenticated with check (user_id = auth.uid());

-- Política DELETE en chat_channels: solo el creador del canal puede borrarlo
-- (para DMs no se expone en la UI; para canales sí).
drop policy if exists "chat_channels_delete_creator" on public.chat_channels;

create policy "chat_channels_delete_creator"
  on public.chat_channels for delete
  to authenticated using (created_by = auth.uid());
