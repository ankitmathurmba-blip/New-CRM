// db/migrate.js  –  Creates all tables for ISP CRM
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool } = require("../src/db");

const SQL = `
-- ─────────────────────────────────────────────────
--  EXTENSIONS
-- ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────
--  USERS (system users / staff)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120)  NOT NULL,
  email       VARCHAR(180)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  role        VARCHAR(30)   NOT NULL DEFAULT 'sales',
  status      VARCHAR(20)   NOT NULL DEFAULT 'Active',
  joined      DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
--  MASTER DATA – Packages
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120)  NOT NULL UNIQUE,
  price       NUMERIC(10,2) NOT NULL,
  speed_mbps  INT           NOT NULL,
  category    VARCHAR(50)   DEFAULT 'Residential',
  active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
--  MASTER DATA – Areas
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS areas (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120)  NOT NULL UNIQUE,
  city        VARCHAR(80),
  pincode     VARCHAR(10),
  active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
--  LEADS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id               VARCHAR(20)   PRIMARY KEY,        -- e.g. LD-0001
  customer_name    VARCHAR(120)  NOT NULL,
  mobile           VARCHAR(15)   NOT NULL,
  alt_mobile       VARCHAR(15),
  email            VARCHAR(180),
  address          TEXT,
  area             VARCHAR(120),
  package          VARCHAR(180),
  invoice_amt      NUMERIC(10,2) DEFAULT 0,
  lead_source      VARCHAR(60),
  lead_type        VARCHAR(60),
  priority         VARCHAR(10)   DEFAULT 'WARM',
  salesperson      VARCHAR(120),
  status           VARCHAR(60)   NOT NULL DEFAULT 'New',
  created_at       DATE          NOT NULL DEFAULT CURRENT_DATE,

  -- Feasibility
  feasibility      VARCHAR(30)   DEFAULT 'Pending',
  feas_note        TEXT,
  feas_updated_at  TIMESTAMPTZ,

  -- Installation
  installation     VARCHAR(40)   DEFAULT 'Pending',
  inst_tech        VARCHAR(120),
  inst_date        DATE,
  inst_note        TEXT,
  inst_updated_at  TIMESTAMPTZ,

  -- Payment
  payment          VARCHAR(30)   DEFAULT 'Pending',
  pay_mode         VARCHAR(40),
  txn_id           VARCHAR(80),
  pay_updated_at   TIMESTAMPTZ,

  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for common filters
CREATE INDEX IF NOT EXISTS leads_status_idx     ON leads(status);
CREATE INDEX IF NOT EXISTS leads_priority_idx   ON leads(priority);
CREATE INDEX IF NOT EXISTS leads_salesperson_idx ON leads(salesperson);
CREATE INDEX IF NOT EXISTS leads_area_idx        ON leads(area);

-- ─────────────────────────────────────────────────
--  COMMENTS (per lead)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_comments (
  id          SERIAL PRIMARY KEY,
  lead_id     VARCHAR(20)   NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  by_name     VARCHAR(120)  NOT NULL,
  by_role     VARCHAR(30)   NOT NULL,
  text        TEXT          NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_lead_idx ON lead_comments(lead_id);

-- ─────────────────────────────────────────────────
--  AUDIT LOG
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_name   VARCHAR(120)  NOT NULL,
  user_role   VARCHAR(30)   NOT NULL,
  action      TEXT          NOT NULL,
  entity      VARCHAR(30),
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_entity_idx    ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS audit_created_idx   ON audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────
--  NOTIFICATIONS
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  message     TEXT          NOT NULL,
  type        VARCHAR(20)   NOT NULL DEFAULT 'info',
  read        BOOLEAN       NOT NULL DEFAULT FALSE,
  lead_id     VARCHAR(20),
  target_role VARCHAR(30),                          -- null = all roles
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
--  updated_at auto-update trigger
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leads_updated_at'
  ) THEN
    CREATE TRIGGER trg_leads_updated_at
      BEFORE UPDATE ON leads
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
`;

(async () => {
  const client = await pool.connect();
  try {
    console.log("🔄  Running migrations…");
    await client.query(SQL);
    console.log("✅  All tables created / verified successfully.");
  } catch (err) {
    console.error("❌  Migration failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
})();
