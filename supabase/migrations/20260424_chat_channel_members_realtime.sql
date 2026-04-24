-- Permitir que chat_channel_members emita eventos de realtime,
-- necesario para que los receptores de DMs vean la conversación en tiempo real.
alter publication supabase_realtime add table public.chat_channel_members;
