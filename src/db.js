// src/db.js
// ─────────────────────────────────────────────────────────────
// Base de datos SQLite usando sql.js (WebAssembly, sin compilación)
// Compatible con Windows, macOS y Linux sin build tools
// ─────────────────────────────────────────────────────────────

import initSqlJs from 'sql.js'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'oficiomx.db')

// Inicializar sql.js (async una sola vez al arrancar)
const SQL = await initSqlJs()

// Cargar DB existente o crear nueva
let db
if (existsSync(DB_PATH)) {
  const fileBuffer = readFileSync(DB_PATH)
  db = new SQL.Database(fileBuffer)
} else {
  db = new SQL.Database()
}

// Guardar a disco después de cada escritura
function persist() {
  const data = db.export()
  writeFileSync(DB_PATH, Buffer.from(data))
}

// ── ESQUEMA ───────────────────────────────────────────────────

db.run(`
  CREATE TABLE IF NOT EXISTS contractors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    trades      TEXT    NOT NULL,
    zone        TEXT    NOT NULL,
    whatsapp    TEXT    NOT NULL,
    years_exp   INTEGER NOT NULL DEFAULT 0,
    plan        TEXT    NOT NULL DEFAULT 'free',
    verified    INTEGER NOT NULL DEFAULT 0,
    featured    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    contractor_id   INTEGER NOT NULL,
    author_name     TEXT    NOT NULL,
    author_email    TEXT    NOT NULL,
    stars           INTEGER NOT NULL,
    body            TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'pending',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    approved_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL,
    context     TEXT    NOT NULL,
    code        TEXT    NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    expires_at  TEXT    NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0
  );
`)

persist()

// ── API compatible con better-sqlite3 ────────────────────────
// Envuelve sql.js en una interfaz síncrona similar a better-sqlite3
// para que el resto del código no cambie

function prepare(sql) {
  return {
    // Devuelve una fila o undefined
    get(...params) {
      const stmt = db.prepare(sql)
      stmt.bind(params)
      const row = stmt.step() ? stmtToObj(stmt) : undefined
      stmt.free()
      return row
    },
    // Devuelve todas las filas
    all(...params) {
      const results = []
      const stmt = db.prepare(sql)
      stmt.bind(params)
      while (stmt.step()) results.push(stmtToObj(stmt))
      stmt.free()
      return results
    },
    // Ejecuta sin devolver filas (INSERT, UPDATE, DELETE)
    run(...params) {
      const stmt = db.prepare(sql)
      stmt.bind(params)
      stmt.step()
      stmt.free()
      const lastId = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0]
      persist()
      return { lastInsertRowid: lastId }
    },
  }
}

// Convierte una fila de sql.js a objeto plano
function stmtToObj(stmt) {
  const cols = stmt.getColumnNames()
  const vals = stmt.get()
  const obj = {}
  cols.forEach((c, i) => { obj[c] = vals[i] })
  return obj
}

// exec simple (para seeds y migrations)
function exec(sql) {
  db.run(sql)
  persist()
}

export default { prepare, exec }
