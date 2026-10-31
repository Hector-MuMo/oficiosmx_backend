// src/db-pg.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requiere SSL
});

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS contractors (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      trades JSONB NOT NULL DEFAULT '[]'::jsonb,
      zone TEXT NOT NULL,
      coverage_zones JSONB NOT NULL DEFAULT '[]'::jsonb,
      whatsapp TEXT NOT NULL,
      years_exp INTEGER NOT NULL DEFAULT 0,
      availability TEXT NOT NULL DEFAULT 'Lunes a sábado',
      rate TEXT NOT NULL DEFAULT '',
      avatar_color TEXT NOT NULL DEFAULT '#1F6B4E',
      plan TEXT NOT NULL DEFAULT 'free',
      verified INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      contractor_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_email TEXT NOT NULL,
      stars INTEGER NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      context TEXT NOT NULL,
      code TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ads (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      link_url TEXT NOT NULL,
      advertiser TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      starts_at DATE,
      ends_at DATE,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_contractors_zone ON contractors(zone);
    CREATE INDEX IF NOT EXISTS idx_reviews_contractor ON reviews(contractor_id, status);
    CREATE INDEX IF NOT EXISTS idx_otp_email_context ON otp_codes(email, context);
  `);

  await query(`
    ALTER TABLE contractors ADD COLUMN IF NOT EXISTS email TEXT;
  `);

  console.log("[DB] Tablas creadas/verificadas");
}
