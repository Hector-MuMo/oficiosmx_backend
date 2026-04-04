// src/routes/contractors.js
import { Router } from \'express\'
import db from \'../db.js\'

const router = Router()

// Parsear trades de JSON a array
function parse(c) {
  if (!c) return null
  try { c.trades = JSON.parse(c.trades) } catch { c.trades = [c.trades] }
  return c
}

// GET /api/contractors?trade=X&zone=Y&sort=Z
router.get(\'/\', (req, res) => {
  const { trade, zone, sort = \'rating\' } = req.query
  let query = `
    SELECT c.*,
      ROUND(AVG(r.stars), 1) AS rating,
      COUNT(r.id)            AS review_count
    FROM contractors c
    LEFT JOIN reviews r ON r.contractor_id = c.id AND r.status = \'approved\'
    WHERE 1=1
  `
  const params = []

  // Búsqueda en trades usando LIKE sobre el JSON serializado
  if (trade) {
    query += \' AND LOWER(c.trades) LIKE LOWER(?)\'
    params.push(`%${trade}%`)
  }
  if (zone) {
    query += \' AND LOWER(c.zone) LIKE LOWER(?)\'
    params.push(`%${zone}%`)
  }

  query += \' GROUP BY c.id\'
  const orderMap = {
    rating:  \'c.featured DESC, rating DESC, review_count DESC\',
    reviews: \'c.featured DESC, review_count DESC, rating DESC\',
    newest:  \'c.featured DESC, c.created_at DESC\',
  }
  query += ` ORDER BY ${orderMap[sort] ?? orderMap.rating}`

  const rows = db.prepare(query).all(...params).map(parse)
  res.json({ ok: true, data: rows })
})

// GET /api/contractors/:id
router.get(\'/:id\', (req, res) => {
  const c = parse(db.prepare(`
    SELECT c.*,
      ROUND(AVG(r.stars),1) AS rating,
      COUNT(r.id)           AS review_count
    FROM contractors c
    LEFT JOIN reviews r ON r.contractor_id = c.id AND r.status = \'approved\'
    WHERE c.id = ? GROUP BY c.id
  `).get(req.params.id))

  if (!c) return res.status(404).json({ ok: false, error: \'Contratista no encontrado\' })

  c.reviews = db.prepare(`
    SELECT id, author_name, stars, body, approved_at
    FROM reviews WHERE contractor_id = ? AND status = \'approved\'
    ORDER BY approved_at DESC LIMIT 20
  `).all(req.params.id)

  res.json({ ok: true, data: c })
})

// POST /api/contractors
router.post(\'/\', (req, res) => {
  const { name, trades, zone, whatsapp, years_exp, plan } = req.body

  if (!name || !trades || !zone || !whatsapp || years_exp === undefined)
    return res.status(400).json({ ok: false, error: \'Faltan campos obligatorios\' })

  // Validar trades: array de 1-4 strings
  if (!Array.isArray(trades) || trades.length === 0 || trades.length > 4)
    return res.status(400).json({ ok: false, error: \'Selecciona entre 1 y 4 oficios\' })

  const wa = String(whatsapp).replace(/\\D/g, \'\')
  if (wa.length < 10)
    return res.status(400).json({ ok: false, error: \'Número de WhatsApp inválido\' })

  const safePlan = [\'free\',\'premium\'].includes(plan) ? plan : \'free\'

  const result = db.prepare(`
    INSERT INTO contractors (name, trades, zone, whatsapp, years_exp, plan)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), JSON.stringify(trades), zone.trim(), wa, Number(years_exp), safePlan)

  const newC = parse(db.prepare(\'SELECT * FROM contractors WHERE id = ?\').get(result.lastInsertRowid))
  res.status(201).json({ ok: true, data: newC })
})

export default router
