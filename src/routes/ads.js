// src/routes/ads.js
import { Router } from 'express'
import db from '../db.js'

const router = Router()

function adminOnly(req, res, next) {
  const incoming = (req.headers['x-admin-token'] ?? '').trim()
  const expected = (process.env.ADMIN_TOKEN ?? '').trim()
  if (!expected)
    return res.status(500).json({ ok: false, error: 'ADMIN_TOKEN no configurado' })
  if (!incoming || incoming !== expected)
    return res.status(401).json({ ok: false, error: 'No autorizado' })
  next()
}

// Normaliza fecha de entrada: '' o undefined → null, 'YYYY-MM-DD' → 'YYYY-MM-DD'
function normalizeDate(val) {
  if (!val || typeof val !== 'string') return null
  const trimmed = val.trim()
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : null
}

// ── GET /api/ads/active ───────────────────────────────────────────────────────
// Retorna todos los banners activos dentro del rango de fechas.
// Usa SUBSTR(campo,1,10) para comparar solo 'YYYY-MM-DD', porque el
// input type="date" guarda '2026-04-20' (10 chars) y si comparamos con
// '2026-04-20 17:10:00' (19 chars), SQLite considera el string más corto
// como MENOR → banners del día actual fallan el filtro ends_at >= now.
router.get('/active', (req, res) => {
  const today = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'

  // Paso 1: desactivar automáticamente banners cuya fecha fin ya pasó.
  // Solo 1 parámetro '?' → .run(today)
  db.prepare(`
    UPDATE ads
    SET    active = 0
    WHERE  active = 1
      AND  ends_at IS NOT NULL
      AND  TRIM(ends_at) != ''
      AND  SUBSTR(ends_at, 1, 10) < ?
  `).run(today)

  // Paso 2: traer banners activos dentro de rango.
  // La query tiene exactamente 2 '?' → .all(today, today)
  const activeAds = db.prepare(`
    SELECT * FROM ads
    WHERE  active = 1
      AND  (starts_at IS NULL OR TRIM(starts_at) = '' OR SUBSTR(starts_at, 1, 10) <= ?)
      AND  (ends_at   IS NULL OR TRIM(ends_at)   = '' OR SUBSTR(ends_at,   1, 10) >= ?)
    ORDER BY id ASC
  `).all(today, today)

  // Paso 3: registrar impresión (fuera del loop de all para no re-preparar)
  if (activeAds.length > 0) {
    const ids = activeAds.map(a => a.id)
    db.prepare(
      `UPDATE ads SET impressions = impressions + 1 WHERE id IN (${ids.map(() => '?').join(',')})`
    ).run(...ids)
  }

  res.json({ ok: true, data: activeAds })
})

// ── POST /api/ads/:id/click ───────────────────────────────────────────────────
router.post('/:id/click', (req, res) => {
  db.prepare('UPDATE ads SET clicks = clicks + 1 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ── GET /api/ads (admin) ──────────────────────────────────────────────────────
router.get('/', adminOnly, (req, res) => {
  const ads = db.prepare('SELECT * FROM ads ORDER BY created_at DESC').all()
  res.json({ ok: true, data: ads })
})

// ── POST /api/ads (admin) ─────────────────────────────────────────────────────
router.post('/', adminOnly, (req, res) => {
  const { title, image_url, link_url, advertiser = '' } = req.body
  const starts_at = normalizeDate(req.body.starts_at)
  const ends_at   = normalizeDate(req.body.ends_at)

  if (!title || !image_url || !link_url)
    return res.status(400).json({ ok: false, error: 'Faltan campos: title, image_url, link_url' })

  // 6 parámetros '?' → 6 valores
  const result = db.prepare(`
    INSERT INTO ads (title, image_url, link_url, advertiser, starts_at, ends_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title.trim(), image_url.trim(), link_url.trim(), advertiser.trim(), starts_at, ends_at)

  const ad = db.prepare('SELECT * FROM ads WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ ok: true, data: ad })
})

// ── PATCH /api/ads/:id (admin) ────────────────────────────────────────────────
router.patch('/:id', adminOnly, (req, res) => {
  const { active, title, image_url, link_url, advertiser, starts_at, ends_at } = req.body
  const fields = []
  const values = []

  if (active     !== undefined) { fields.push('active = ?');     values.push(active ? 1 : 0) }
  if (title      !== undefined) { fields.push('title = ?');      values.push(title) }
  if (image_url  !== undefined) { fields.push('image_url = ?');  values.push(image_url) }
  if (link_url   !== undefined) { fields.push('link_url = ?');   values.push(link_url) }
  if (advertiser !== undefined) { fields.push('advertiser = ?'); values.push(advertiser) }
  if (starts_at  !== undefined) { fields.push('starts_at = ?');  values.push(normalizeDate(starts_at)) }
  if (ends_at    !== undefined) { fields.push('ends_at = ?');    values.push(normalizeDate(ends_at)) }

  if (!fields.length)
    return res.status(400).json({ ok: false, error: 'Nada que actualizar' })

  // N campos + 1 id = N+1 parámetros exactos
  values.push(req.params.id)
  db.prepare(`UPDATE ads SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  const ad = db.prepare('SELECT * FROM ads WHERE id = ?').get(req.params.id)
  res.json({ ok: true, data: ad })
})

// ── DELETE /api/ads/:id (admin) ───────────────────────────────────────────────
router.delete('/:id', adminOnly, (req, res) => {
  db.prepare('DELETE FROM ads WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
