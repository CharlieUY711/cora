-- ═══════════════════════════════════════════════════════════════════════════════
-- ROADMAP REFACTORING — Migración de KV a SQL
-- Proyecto: qhnmxvexkizcsmivfuam
-- ═══════════════════════════════════════════════════════════════════════════════

-- Estado dinámico de cada módulo del roadmap
CREATE TABLE IF NOT EXISTS roadmap_modules (
  id              text PRIMARY KEY,  -- mismo id que MODULES_DATA (ej: "erp-inventory")
  status          text NOT NULL DEFAULT 'not-started'
                  CHECK (status IN ('not-started','spec-ready','progress-10','progress-50','progress-80','ui-only','completed')),
  priority        text DEFAULT 'medium'
                  CHECK (priority IN ('critical','high','medium','low')),
  notas           text,
  exec_order      int,
  estimated_hours int,
  -- Auditoría automática
  tiene_view      boolean DEFAULT false,   -- ¿existe el .tsx del view?
  tiene_backend   boolean DEFAULT false,   -- ¿existe la Edge Function?
  endpoint_ok     boolean DEFAULT false,   -- ¿el endpoint responde?
  tiene_datos     boolean DEFAULT false,   -- ¿la tabla tiene datos?
  auditado_at     timestamptz,
  -- Control
  updated_at      timestamptz DEFAULT now(),
  updated_by      text DEFAULT 'system'
);

-- Tasks granulares dentro de cada módulo/submódulo
CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       text NOT NULL REFERENCES roadmap_modules(id) ON DELETE CASCADE,
  submodule_id    text,                    -- id del submodule dentro del módulo
  nombre          text NOT NULL,
  status          text DEFAULT 'todo'
                  CHECK (status IN ('todo','in-progress','done','blocked')),
  responsable     text,
  fecha_estimada  date,
  blocker         text,
  notas           text,
  orden           int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Historial de cambios de status (para métricas de velocidad)
CREATE TABLE IF NOT EXISTS roadmap_historial (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       text NOT NULL,
  status_anterior text,
  status_nuevo    text NOT NULL,
  notas           text,
  origen          text DEFAULT 'manual'
                  CHECK (origen IN ('manual','auditoria','promocion_idea')),
  created_at      timestamptz DEFAULT now()
);

-- Ideas promovidas a módulo (puente Ideas Board → Roadmap)
CREATE TABLE IF NOT EXISTS ideas_promovidas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id         text NOT NULL,           -- id de la idea en KV
  module_id       text REFERENCES roadmap_modules(id),
  idea_texto      text NOT NULL,
  idea_area       text,
  estado          text DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','aprobada','rechazada','convertida')),
  notas           text,
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE roadmap_modules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas_promovidas  ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (DROP IF EXISTS para hacer la migración idempotente)
DROP POLICY IF EXISTS "service_role_roadmap_modules" ON roadmap_modules;
CREATE POLICY "service_role_roadmap_modules" ON roadmap_modules FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_roadmap_tasks" ON roadmap_tasks;
CREATE POLICY "service_role_roadmap_tasks" ON roadmap_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_roadmap_historial" ON roadmap_historial;
CREATE POLICY "service_role_roadmap_historial" ON roadmap_historial FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_ideas_promovidas" ON ideas_promovidas;
CREATE POLICY "service_role_ideas_promovidas" ON ideas_promovidas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_roadmap_modules_status ON roadmap_modules(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_modules_priority ON roadmap_modules(priority);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_module ON roadmap_tasks(module_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_submodule ON roadmap_tasks(submodule_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_historial_module ON roadmap_historial(module_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_historial_created ON roadmap_historial(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_promovidas_estado ON ideas_promovidas(estado);
