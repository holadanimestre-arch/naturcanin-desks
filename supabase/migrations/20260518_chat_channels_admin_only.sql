-- Solo admins pueden crear canales de grupo.
-- Los admins pueden añadir cualquier usuario como miembro de un canal.

-- 1. Reemplazar política de INSERT en chat_channels
drop policy if exists "chat_channels_insert_auth" on public.chat_channels;

create policy "chat_channels_insert_admin"
  on public.chat_channels for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

-- 2. Reemplazar política de INSERT en chat_channel_members:
--    - admin puede insertar cualquier user_id
--    - usuario normal solo puede insertarse a sí mismo
drop policy if exists "chat_channel_members_insert_self" on public.chat_channel_members;

create policy "chat_channel_members_insert"
  on public.chat_channel_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );
