// src/index.js
// Las variables de entorno las carga Node 22 con --env-file=.env
// antes de ejecutar cualquier módulo, por eso no hace falta dotenv.

import express from 'express'
import cors    from 'cors'

import otpRoutes        from './routes/otp.js'
import contractorRoutes from './routes/contractors.js'
import reviewRoutes     from './routes/reviews.js'

const app  = express()
const PORT = process.env.PORT ?? 3000

// En producción FRONTEND_URL debe ser tu dominio de Netlify
// Ej: https://oficiomx.netlify.app
// En desarrollo acepta cualquier origen (FRONTEND_URL no definido)
const allowedOrigins = (process.env.FRONTEND_URL ?? '*')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    // Permitir peticiones sin origin (curl, Postman, mismo servidor)
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return cb(null, true)
    }
    cb(new Error('Origen no permitido por CORS'))
  },
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true,
}))
app.use(express.json())

app.use('/api/otp',         otpRoutes)
app.use('/api/contractors', contractorRoutes)
app.use('/api/reviews',     reviewRoutes)

app.get('/api/health', (_, res) => {
  res.json({ ok: true, version: '1.0.0', env: process.env.NODE_ENV ?? 'development' })
})

app.use((err, req, res, _next) => {
  console.error('[Error]', err)
  res.status(500).json({ ok: false, error: 'Error interno del servidor' })
})

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │  OficioMX Backend                   │
  │  http://localhost:${PORT}              │
  │  Entorno: ${(process.env.NODE_ENV ?? 'development').padEnd(25)}│
  └─────────────────────────────────────┘
  `)
})
