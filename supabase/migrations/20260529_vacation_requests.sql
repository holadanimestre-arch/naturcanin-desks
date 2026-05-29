-- Módulo de Vacaciones · Naturcanin
-- Tabla de solicitudes de vacaciones (por semanas ISO, siempre lunes como week_start)

CREATE TABLE IF NOT EXISTS vacation_requests (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,           -- Siempre lunes (inicio de semana ISO)
  year          SMALLINT NOT NULL,       -- Año ISO de la semana
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  notes         TEXT,                    -- Notas del aprobador al aprobar/rechazar
  reviewed_by   UUID REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)           -- Un empleado no puede pedir la misma semana dos veces
);

-- Índices
CREATE INDEX IF NOT EXISTS vacation_requests_user_id_idx  ON vacation_requests (user_id);
CREATE INDEX IF NOT EXISTS vacation_requests_week_idx     ON vacation_requests (week_start);
CREATE INDEX IF NOT EXISTS vacation_requests_year_idx     ON vacation_requests (year);
CREATE INDEX IF NOT EXISTS vacation_requests_status_idx   ON vacation_requests (status);

-- RLS
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;

-- Todos los empleados autenticados pueden ver TODAS las solicitudes
-- (necesario para detectar conflictos de coincidencia)
CREATE POLICY "vacation_read_all" ON vacation_requests
  FOR SELECT TO authenticated USING (true);

-- Cada empleado solo puede crear sus propias solicitudes
CREATE POLICY "vacation_insert_own" ON vacation_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Cada empleado puede eliminar sus solicitudes pendientes propias
CREATE POLICY "vacation_delete_own_pending" ON vacation_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- Solo admins pueden actualizar (aprobar / rechazar)
CREATE POLICY "vacation_update_admin" ON vacation_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
