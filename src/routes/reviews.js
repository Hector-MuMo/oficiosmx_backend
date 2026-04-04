// src/routes/reviews.js
// ─────────────────────────────────────────────────────────────
// POST /api/reviews              — crear reseña (post-OTP)
// GET  /api/reviews/pending      — listar pendientes (admin)
// PATCH /api/reviews/:id/approve — aprobar (admin)
// PATCH /api/reviews/:id/reject  — rechazar (admin)
// ─────────────────────────────────────────────────────────────

import { Router } from 'express'
import db from '../db.js'

const router = Router()

// ── Middleware admin muy simple ───────────────────────────────
// En producción reemplaza esto con JWT o sesiones reales.
function adminOnly(req, res, next) {
  const token = req.headers['x-admin-token']
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'No autorizado' })
  }
  next()
}

// ── POST /api/reviews ────────────────────────────────────────
// El cliente envía: contractor_id, author_name, author_email,
//                   stars, body
// El OTP ya debe haber sido verificado en /api/otp/verify
// antes de llamar aquí (el frontend lo controla).
router.post('/', (req, res) => {
  const { contractor_id, author_name, author_email, stars, body } = req.body

  const missing = ['contractor_id','author_name','author_email','stars','body']
    .filter(f => req.body[f] === undefined || req.body[f] === '')
  if (missing.length) {
    return res.status(400).json({ ok: false, error: `Faltan campos: ${missing.join(', ')}` })
  }

  if (![1,2,3,4,5].includes(Number(stars))) {
    return res.status(400).json({ ok: false, error: 'Calificación debe ser entre 1 y 5' })
  }

  if (String(body).trim().length < 20) {
    return res.status(400).json({ ok: false, error: 'El comentario debe tener al menos 20 caracteres' })
  }

  // Verificar que el contratista existe
  const contractor = db.prepare(`SELECT id FROM contractors WHERE id = ?`).get(contractor_id)
  if (!contractor) {
    return res.status(404).json({ ok: false, error: 'Contratista no encontrado' })
  }

  // Un email solo puede reseñar una vez al mismo contratista
  const duplicate = db.prepare(`
    SELECT id FROM reviews
    WHERE contractor_id = ? AND author_email = ? AND status != 'rejected'
  `).get(contractor_id, author_email)

  if (duplicate) {
    return res.status(409).json({ ok: false, error: 'Este correo ya reseñó a este contratista' })
  }

  const result = db.prepare(`
    INSERT INTO reviews (contractor_id, author_name, author_email, stars, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(contractor_id, author_name.trim(), author_email.trim(), Number(stars), body.trim())

  res.status(201).json({
    ok: true,
    message: 'Reseña recibida. Se publicará tras revisión en 24 h.',
    data: { id: result.lastInsertRowid }
  })
})

// ── GET /api/reviews/pending (admin) ─────────────────────────
router.get('/pending', adminOnly, (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, c.name AS contractor_name, c.trade
    FROM reviews r
    JOIN contractors c ON c.id = r.contractor_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
  `).all()

  res.json({ ok: true, data: reviews })
})

// ── PATCH /api/reviews/:id/approve (admin) ───────────────────
router.patch('/:id/approve', adminOnly, (req, res) => {
  const info = db.prepare(`
    UPDATE reviews
    SET status = 'approved', approved_at = datetime('now')
    WHERE id = ? AND status = 'pending'
  `).run(req.params.id)

  if (info.changes === 0) {
    return res.status(404).json({ ok: false, error: 'Reseña no encontrada o ya procesada' })
  }
  res.json({ ok: true, message: 'Reseña aprobada' })
})

// ── PATCH /api/reviews/:id/reject (admin) ────────────────────
router.patch('/:id/reject', adminOnly, (req, res) => {
  const info = db.prepare(`
    UPDATE reviews SET status = 'rejected'
    WHERE id = ? AND status = 'pending'
  `).run(req.params.id)

  if (info.changes === 0) {
    return res.status(404).json({ ok: false, error: 'Reseña no encontrada o ya procesada' })
  }
  res.json({ ok: true, message: 'Reseña rechazada' })
})

export default router
