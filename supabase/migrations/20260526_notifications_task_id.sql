-- Añade task_id a notifications para vincular notificaciones a tareas específicas
-- y permitir el indicador de comentarios no leídos en las tarjetas del tablero.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS task_id bigint REFERENCES public.tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_task_id_idx
  ON public.notifications(task_id);

CREATE INDEX IF NOT EXISTS notifications_user_unread_task_idx
  ON public.notifications(user_id, task_id, read)
  WHERE read = false;
