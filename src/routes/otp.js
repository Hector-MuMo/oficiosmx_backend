// src/routes/otp.js
// ─────────────────────────────────────────────────────────────
// POST /api/otp/send    — genera y envía un código OTP
// POST /api/otp/verify  — verifica el código ingresado
// ─────────────────────────────────────────────────────────────

import { Router } from 'express'
import db from '../db.js'
import { sendOtpEmail } from '../mailer.js'

const router = Router()

// ── Helpers ───────────────────────────────────────────────────
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function expiresAt(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

// Limpia OTPs expirados o usados (llamado antes de insertar uno nuevo)
function cleanOldOtps(email, context) {
  db.prepare(`
    DELETE FROM otp_codes
    WHERE email = ? AND context = ?
  `).run(email, context)
}

// ── POST /api/otp/send ────────────────────────────────────────
router.post('/send', async (req, res) => {
  const { email, context } = req.body

  if (!email || !context) {
    return res.status(400).json({ ok: false, error: 'Faltan campos: email, context' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, error: 'Correo inválido' })
  }

  // Rate limit: máximo 1 OTP activo por email+contexto
  const existing = db.prepare(`
    SELECT expires_at FROM otp_codes
    WHERE email = ? AND context = ? AND used = 0
    ORDER BY id DESC LIMIT 1
  `).get(email, context)

  if (existing) {
    const secondsLeft = Math.ceil((new Date(existing.expires_at) - Date.now()) / 1000)
    if (secondsLeft > 9 * 60) {
      // Bloqueado si el OTP tiene más de 1 min de vida (se pidió hace menos de 1 min)
      return res.status(429).json({
        ok: false,
        error: `Espera antes de pedir otro código (${Math.ceil((secondsLeft - 9*60))}s)`
      })
    }
  }

  cleanOldOtps(email, context)

  const code = generateCode()
  db.prepare(`
    INSERT INTO otp_codes (email, context, code, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(email, context, code, expiresAt(10))

  // Etiqueta legible para el correo
  const label = context.startsWith('review_')
    ? 'Verificación de reseña en OficioMX'
    : 'Registro de contratista en OficioMX'

  const result = await sendOtpEmail(email, code, label)

  if (!result.ok) {
    return res.status(500).json({ ok: false, error: 'No se pudo enviar el correo' })
  }

  res.json({ ok: true, message: `Código enviado a ${email}` })
})

// ── POST /api/otp/verify ──────────────────────────────────────
router.post('/verify', (req, res) => {
  const { email, context, code } = req.body

  if (!email || !context || !code) {
    return res.status(400).json({ ok: false, error: 'Faltan campos: email, context, code' })
  }

  const record = db.prepare(`
    SELECT * FROM otp_codes
    WHERE email = ? AND context = ? AND used = 0
    ORDER BY id DESC LIMIT 1
  `).get(email, context)

  if (!record) {
    return res.status(400).json({ ok: false, error: 'Código no encontrado o ya usado' })
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ ok: false, error: 'El código expiró, solicita uno nuevo' })
  }

  // Máximo 5 intentos fallidos por OTP
  if (record.attempts >= 5) {
    db.prepare(`DELETE FROM otp_codes WHERE id = ?`).run(record.id)
    return res.status(400).json({ ok: false, error: 'Demasiados intentos, solicita un nuevo código' })
  }

  if (record.code !== code.trim()) {
    db.prepare(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`).run(record.id)
    const left = 5 - (record.attempts + 1)
    return res.status(400).json({ ok: false, error: `Código incorrecto. Intentos restantes: ${left}` })
  }

  // ✓ Código correcto — marcarlo como usado
  db.prepare(`UPDATE otp_codes SET used = 1 WHERE id = ?`).run(record.id)

  res.json({ ok: true, message: 'Correo verificado correctamente' })
})

export default router
