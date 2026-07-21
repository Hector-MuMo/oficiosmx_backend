// src/db.js
import initSqlJs from 'sql.js'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH   = join(__dirname, '..', 'oficiomx.db')
const SQL       = await initSqlJs()

let db
if (existsSync(DB_PATH)) {
  db = new SQL.Database(readFileSync(DB_PATH))
} else {
  db = new SQL.Database()
}

function persist() {
  writeFileSync(DB_PATH, Buffer.from(db.export()))
}

// ── Crear tablas ─────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS contractors (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    trades         TEXT NOT NULL,
    zone           TEXT NOT NULL,
    coverage_zones TEXT NOT NULL DEFAULT '[]',
    whatsapp       TEXT NOT NULL,
    years_exp      INTEGER NOT NULL DEFAULT 0,
    availability   TEXT NOT NULL DEFAULT 'Lunes a sábado',
    rate           TEXT NOT NULL DEFAULT '',
    avatar_color   TEXT NOT NULL DEFAULT '#1F6B4E',
    plan           TEXT NOT NULL DEFAULT 'free',
    verified       INTEGER NOT NULL DEFAULT 0,
    featured       INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    contractor_id INTEGER NOT NULL,
    author_name   TEXT NOT NULL,
    author_email  TEXT NOT NULL,
    stars         INTEGER NOT NULL,
    body          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    approved_at   TEXT
  );
  CREATE TABLE IF NOT EXISTS otp_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL,
    context    TEXT NOT NULL,
    code       TEXT NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS ads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    image_url   TEXT NOT NULL,
    link_url    TEXT NOT NULL,
    advertiser  TEXT NOT NULL DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1,
    starts_at   TEXT,
    ends_at     TEXT,
    clicks      INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_contractors_zone   ON contractors(zone);
  CREATE INDEX IF NOT EXISTS idx_reviews_contractor ON reviews(contractor_id, status);
  CREATE INDEX IF NOT EXISTS idx_otp_email_context  ON otp_codes(email, context);
`)

// ── Migraciones ──────────────────────────────────────────────
for (const sql of [
  "ALTER TABLE contractors ADD COLUMN coverage_zones TEXT NOT NULL DEFAULT '[]'",
  "ALTER TABLE contractors ADD COLUMN availability   TEXT NOT NULL DEFAULT 'Lunes a sábado'",
  "ALTER TABLE contractors ADD COLUMN rate           TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE contractors ADD COLUMN avatar_color   TEXT NOT NULL DEFAULT '#1F6B4E'",
]) { try { db.run(sql) } catch { /* ya existe */ } }

// Limpiar strings vacíos heredados en ads
try {
  db.run("UPDATE ads SET starts_at = NULL WHERE TRIM(IFNULL(starts_at,'')) = ''")
  db.run("UPDATE ads SET ends_at   = NULL WHERE TRIM(IFNULL(ends_at,''))   = ''")
} catch { /* tabla no existe aún */ }

persist()

// ── Helpers internos ─────────────────────────────────────────
function rowToObj(stmt) {
  const cols = stmt.getColumnNames()
  const vals = stmt.get()
  const obj  = {}
  cols.forEach((c, i) => { obj[c] = vals[i] })
  return obj
}

// sql.js Statement.bind() acepta un array de valores posicionales.
// null se trata como SQL NULL (sql.js 1.12+).
// IMPORTANTE: el número de elementos del array DEBE coincidir
// exactamente con el número de '?' en el SQL.
function prepare(sql) {
  return {
    // Retorna la primera fila o undefined
    get(...params) {
      const stmt = db.prepare(sql)
      if (params.length) stmt.bind(params)
      const row = stmt.step() ? rowToObj(stmt) : undefined
      stmt.free()
      return row
    },
    // Retorna todas las filas como array de objetos
    all(...params) {
      const results = []
      const stmt    = db.prepare(sql)
      if (params.length) stmt.bind(params)
      while (stmt.step()) results.push(rowToObj(stmt))
      stmt.free()
      return results
    },
    // Ejecuta INSERT/UPDATE/DELETE, retorna { lastInsertRowid }
    run(...params) {
      const stmt = db.prepare(sql)
      if (params.length) stmt.bind(params)
      stmt.step()
      stmt.free()
      const lastId = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0
      persist()
      return { lastInsertRowid: lastId }
    },
  }
}

function exec(sql) {
  db.run(sql)
  persist()
}

export default { prepare, exec }
