-- PM JIG-FIXTURE — MySQL Schema
-- Run once: mysql -u root -p jig_pm < sql/schema.sql

CREATE DATABASE IF NOT EXISTS jig_pm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jig_pm;

-- PM inspection records
CREATE TABLE IF NOT EXISTS pm_records (
  id           VARCHAR(64)   NOT NULL,
  jig_id       VARCHAR(32)   NOT NULL,
  jig_name     VARCHAR(128)  NOT NULL DEFAULT '',
  pm_date      DATE          NOT NULL,
  inspector    VARCHAR(64)   NOT NULL DEFAULT '',
  shift        VARCHAR(4)    NOT NULL DEFAULT '',
  overall_result ENUM('OK','NG') NOT NULL DEFAULT 'OK',
  data_json    LONGTEXT      NOT NULL DEFAULT '{}',  -- full section data blob
  created_at   BIGINT        NOT NULL DEFAULT 0,      -- JS Date.now() ms
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_jig_id   (jig_id),
  INDEX idx_pm_date  (pm_date),
  INDEX idx_result   (overall_result),
  INDEX idx_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PM maintenance plans
CREATE TABLE IF NOT EXISTS pm_plans (
  id                  VARCHAR(64)  NOT NULL,
  jig_id              VARCHAR(32)  NOT NULL,
  jig_name            VARCHAR(128) NOT NULL DEFAULT '',
  frequency           VARCHAR(32)  NOT NULL DEFAULT 'monthly',
  priority            VARCHAR(16)  NOT NULL DEFAULT 'normal',
  due_date            DATE         NULL,
  assigned_to_emp     VARCHAR(64)  NULL,
  engineer_note       TEXT         NULL,
  status              VARCHAR(32)  NOT NULL DEFAULT 'pending',
  completed_at        BIGINT       NULL,
  completed_record_id VARCHAR(64)  NULL,
  created_at          BIGINT       NOT NULL DEFAULT 0,
  updated_at          BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_jig_id   (jig_id),
  INDEX idx_status   (status),
  INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Jig setup metadata (4M + fixture image + check points)
CREATE TABLE IF NOT EXISTS jig_setup (
  jig_id      VARCHAR(32)   NOT NULL,
  data_json   LONGTEXT      NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (jig_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: users / roster (mirror of localStorage auth)
CREATE TABLE IF NOT EXISTS roster (
  emp         VARCHAR(32)   NOT NULL,
  name        VARCHAR(64)   NOT NULL DEFAULT '',
  pin_hash    VARCHAR(128)  NOT NULL DEFAULT '',  -- SHA-256 of PIN for production
  role        ENUM('inspector','supervisor','engineer','admin') NOT NULL DEFAULT 'inspector',
  shift       VARCHAR(4)    NOT NULL DEFAULT 'A',
  active      TINYINT(1)    NOT NULL DEFAULT 1,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (emp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
