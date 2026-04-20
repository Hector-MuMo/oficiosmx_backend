// src/routes/contractors.js
import { Router } from 'express'
import db from '../db.js'

const router = Router()

function parse(c) {
  if (!c) return null
  try { c.trades = JSON.parse(c.trades) } catch { c.trades = [c.trades] }
  try { c.coverage_zones = JSON.parse(c.coverage_zones) } catch { c.coverage_zones = [] }
  return c
}

// GET /api/contractors
router.get('/', (req, res) => {
  const { trade, zone, sort = 'rating' } = req.query
  let query = `
    SELECT c.*,
      ROUND(AVG(r.stars), 1) AS rating,
      COUNT(r.id)            AS review_count
    FROM contractors c
    LEFT JOIN reviews r ON r.contractor_id = c.id AND r.status = 'approved'
    WHERE 1=1
  `
  const params = []
  if (trade) { query += ' AND LOWER(c.trades) LIKE LOWER(?)'; params.push(`%${trade}%`) }
  if (zone)  { query += ' AND (LOWER(c.zone) LIKE LOWER(?) OR LOWER(c.coverage_zones) LIKE LOWER(?))'; params.push(`%${zone}%`, `%${zone}%`) }
  query += ' GROUP BY c.id'
  const orderMap = {
    rating:  'c.featured DESC, rating DESC, review_count DESC',
    reviews: 'c.featured DESC, review_count DESC, rating DESC',
    newest:  'c.featured DESC, c.created_at DESC',
  }
  query += ` ORDER BY ${orderMap[sort] ?? orderMap.rating}`
  res.json({ ok: true, data: db.prepare(query).all(...params).map(parse) })
})

// GET /api/contractors/:id
router.get('/:id', (req, res) => {
  const c = parse(db.prepare(`
    SELECT c.*,
      ROUND(AVG(r.stars),1) AS rating,
      COUNT(r.id)           AS review_count
    FROM contractors c
    LEFT JOIN reviews r ON r.contractor_id = c.id AND r.status = 'approved'
    WHERE c.id = ? GROUP BY c.id
  `).get(req.params.id))
  if (!c) return res.status(404).json({ ok: false, error: 'Contratista no encontrado' })
  c.reviews = db.prepare(`
    SELECT id, author_name, stars, body, approved_at
    FROM reviews WHERE contractor_id = ? AND status = 'approved'
    ORDER BY approved_at DESC LIMIT 20
  `).all(req.params.id)
  res.json({ ok: true, data: c })
})

// POST /api/contractors
router.post('/', (req, res) => {
  const {
    name, trades, zone, coverage_zones = [],
    whatsapp, years_exp,
    availability = 'Lunes a sábado',
    rate = '',
    avatar_color = '#1F6B4E',
    plan,
  } = req.body

  if (!name || !trades || !zone || !whatsapp || years_exp === undefined)
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' })

  if (!Array.isArray(trades) || trades.length === 0 || trades.length > 4)
    return res.status(400).json({ ok: false, error: 'Selecciona entre 1 y 4 oficios' })

  const wa = String(whatsapp).replace(/\D/g, '')
  if (wa.length < 10)
    return res.status(400).json({ ok: false, error: 'Número de WhatsApp inválido' })

  const safePlan = ['free','premium'].includes(plan) ? plan : 'free'

  const result = db.prepare(`
    INSERT INTO contractors
      (name, trades, zone, coverage_zones, whatsapp, years_exp, availability, rate, avatar_color, plan)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    name.trim(),
    JSON.stringify(trades),
    zone.trim(),
    JSON.stringify(Array.isArray(coverage_zones) ? coverage_zones : []),
    wa,
    Number(years_exp),
    availability.trim() || 'Lunes a sábado',
    rate.trim(),
    avatar_color || '#1F6B4E',
    safePlan,
  )

  res.status(201).json({ ok: true, data: parse(db.prepare('SELECT * FROM contractors WHERE id = ?').get(result.lastInsertRowid)) })
})

export default router
