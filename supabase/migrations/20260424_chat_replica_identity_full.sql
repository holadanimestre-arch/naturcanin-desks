-- Supabase Realtime necesita REPLICA IDENTITY FULL para que los filtros
-- de postgres_changes funcionen. Sin esto, channel_id=eq.X y user_id=eq.X
-- se ignoran y los eventos no llegan al cliente correcto.
alter table public.chat_channel_members replica identity full;
alter table public.chat_messages replica identity full;
alter table public.chat_channels replica identity full;
