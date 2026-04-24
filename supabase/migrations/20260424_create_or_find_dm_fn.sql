-- Función SECURITY DEFINER: crea un DM o encuentra el existente e inserta
-- ambos miembros ignorando RLS. Así el receptor siempre queda en la tabla
-- aunque la política lo impida desde el cliente.
create or replace function public.create_or_find_dm(p_other_user_id uuid)
returns table(r_channel_id bigint, r_is_new boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key  text;
  v_id   bigint;
  v_new  boolean := false;
begin
  -- Clave determinista: los dos UUIDs ordenados lexicográficamente
  v_key := least(auth.uid()::text, p_other_user_id::text)
        || ':'
        || greatest(auth.uid()::text, p_other_user_id::text);

  -- ¿Ya existe?
  select id into v_id from chat_channels where dm_key = v_key;

  if v_id is null then
    insert into chat_channels (name, description, is_dm, dm_key, created_by)
    values ('dm:' || v_key, null, true, v_key, auth.uid())
    returning id into v_id;
    v_new := true;
  end if;

  -- Inserta ambos miembros; si ya existen, no hace nada.
  insert into chat_channel_members (channel_id, user_id)
  values (v_id, auth.uid()), (v_id, p_other_user_id)
  on conflict (channel_id, user_id) do nothing;

  return query select v_id, v_new;
end;
$$;

grant execute on function public.create_or_find_dm(uuid) to authenticated;
