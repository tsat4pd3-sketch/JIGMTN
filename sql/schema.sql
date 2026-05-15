-- PM JIG-FIXTURE SQL schema
-- Designed for PostgreSQL. For MS SQL/MySQL, map JSONB to NVARCHAR(MAX)/JSON and BIGINT timestamps accordingly.

CREATE TABLE IF NOT EXISTS users (
  emp_code        VARCHAR(32) PRIMARY KEY,
  full_name       VARCHAR(160) NOT NULL,
  pin_hash        VARCHAR(255),
  role            VARCHAR(24) NOT NULL CHECK (role IN ('technician', 'inspector', 'engineer', 'supervisor', 'admin')),
  shift_code      VARCHAR(8) NOT NULL DEFAULT '-',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jig_fixtures (
  jig_id          VARCHAR(64) PRIMARY KEY,
  jig_name        VARCHAR(255) NOT NULL,
  process_name    VARCHAR(120),
  model_name      VARCHAR(120),
  part_name       VARCHAR(255),
  part_no         VARCHAR(160),
  spec_json       JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pm_plans (
  plan_id             VARCHAR(64) PRIMARY KEY,
  jig_id              VARCHAR(64) NOT NULL REFERENCES jig_fixtures(jig_id),
  due_date            DATE NOT NULL,
  frequency_code      VARCHAR(24) NOT NULL CHECK (frequency_code IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  priority_code       VARCHAR(16) NOT NULL CHECK (priority_code IN ('normal', 'high', 'urgent')),
  assigned_to_emp     VARCHAR(32) REFERENCES users(emp_code),
  assigned_to_name    VARCHAR(160),
  engineer_note       TEXT,
  status_code         VARCHAR(24) NOT NULL CHECK (status_code IN ('planned', 'in_progress', 'completed', 'overdue')),
  created_by_emp      VARCHAR(32) REFERENCES users(emp_code),
  created_by_name     VARCHAR(160),
  completed_record_id VARCHAR(64),
  parent_plan_id      VARCHAR(64) REFERENCES pm_plans(plan_id),
  completed_at        TIMESTAMPTZ,
  created_at_ms       BIGINT NOT NULL,
  updated_at_ms       BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_plans_due_status ON pm_plans(due_date, status_code);
CREATE INDEX IF NOT EXISTS idx_pm_plans_assignee ON pm_plans(assigned_to_emp, status_code);

CREATE TABLE IF NOT EXISTS pm_records (
  record_id       VARCHAR(64) PRIMARY KEY,
  plan_id         VARCHAR(64) REFERENCES pm_plans(plan_id),
  jig_id          VARCHAR(64) NOT NULL REFERENCES jig_fixtures(jig_id),
  jig_name        VARCHAR(255) NOT NULL,
  pm_date         DATE NOT NULL,
  due_date        DATE,
  shift_code      VARCHAR(8) NOT NULL,
  inspector_emp   VARCHAR(32) REFERENCES users(emp_code),
  inspector_name  VARCHAR(160),
  engineer_note   TEXT,
  overall_result  VARCHAR(8) NOT NULL CHECK (overall_result IN ('OK', 'NG')),
  data_json       JSONB NOT NULL DEFAULT '{}'::JSONB,
  remarks_json    JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at_ms   BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_records_jig_date ON pm_records(jig_id, pm_date DESC);
CREATE INDEX IF NOT EXISTS idx_pm_records_plan ON pm_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_pm_records_result ON pm_records(overall_result, pm_date DESC);

CREATE TABLE IF NOT EXISTS pm_record_items (
  item_id       BIGSERIAL PRIMARY KEY,
  record_id     VARCHAR(64) NOT NULL REFERENCES pm_records(record_id) ON DELETE CASCADE,
  section_id    VARCHAR(64) NOT NULL,
  checkpoint_id VARCHAR(64) NOT NULL,
  axis_code     VARCHAR(8),
  shot_1        NUMERIC(10, 3),
  shot_2        NUMERIC(10, 3),
  shot_3        NUMERIC(10, 3),
  avg_value     NUMERIC(10, 3),
  check_value   VARCHAR(16),
  judgment      VARCHAR(8) CHECK (judgment IN ('OK', 'NG')),
  remark        TEXT
);

CREATE INDEX IF NOT EXISTS idx_pm_record_items_record ON pm_record_items(record_id);
CREATE INDEX IF NOT EXISTS idx_pm_record_items_ng ON pm_record_items(judgment) WHERE judgment = 'NG';
