-- FK de chat_channel_members.user_id → profiles.id para que PostgREST
-- pueda resolver el embed profiles(name) desde el cliente REST.
-- Sin esta FK, auth.users no es visible a PostgREST y la query
-- chat_channel_members(user_id, profiles(name)) devuelve 400 Bad Request.
alter table public.chat_channel_members
  add constraint chat_channel_members_user_fk_profiles
  foreign key (user_id) references public.profiles(id) on delete cascade;
