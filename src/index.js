// src/index.js
// Las variables de entorno las carga Node 22 con --env-file=.env
// antes de ejecutar cualquier módulo, por eso no hace falta dotenv.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { initDb } from "./db-pg.js";
import otpRoutes from "./routes/otp.js";
import contractorRoutes from "./routes/contractors.js";
import reviewRoutes from "./routes/reviews.js";
import adRoutes from "./routes/ads.js";

// ── Validar variables de entorno críticas al arrancar ────────
const REQUIRED_IN_PROD = ["RESEND_API_KEY", "ADMIN_TOKEN"];
const WARN_IF_MISSING = ["ADMIN_TOKEN"];

for (const key of WARN_IF_MISSING) {
  if (!process.env[key]?.trim()) {
    console.warn(`[Config] ADVERTENCIA: ${key} no está definido en .env`);
  }
}

if (process.env.NODE_ENV === "production") {
  for (const key of REQUIRED_IN_PROD) {
    if (!process.env[key]?.trim()) {
      console.error(`[Config] ERROR: ${key} es obligatorio en producción`);
      process.exit(1);
    }
  }
}

const app = express();
const PORT = process.env.PORT ?? 3000;

app.set("trust proxy", 1);
app.use(helmet());

// ────────────────────────────────────────────────────────────
// RATE LIMITERS
// ────────────────────────────────────────────────────────────

// 1. Limiter estricto SOLO para OTP (evita spam de correos/WhatsApp)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 intentos de OTP por IP
  message: { ok: false, error: "Demasiados intentos. Espera unos minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Limiter moderado para admin (protege mutaciones)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 acciones de admin por IP
  message: { ok: false, error: "Demasiadas acciones. Espera unos minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Limiter MUY permisivo para rutas públicas de lectura
//    (protege contra DDoS pero no molesta en uso normal)
const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 300, // 300 peticiones por minuto por IP
  message: { ok: false, error: "Demasiadas peticiones. Espera un momento." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ────────────────────────────────────────────────────────────
// CORS + JSON
// ────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL ?? "*")
  .split(",")
  .map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin))
        return cb(null, true);
      cb(new Error("Origen no permitido por CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());

// ────────────────────────────────────────────────────────────
// RUTAS CON LIMITERS ESPECÍFICOS
// ────────────────────────────────────────────────────────────

// OTP → limiter estricto
app.use("/api/otp", otpLimiter, otpRoutes);

// Admin (verificación, aprobación) → limiter moderado
app.use("/api/contractors/:id/verify", adminLimiter);
app.use("/api/reviews", reviewRoutes);

// Ads → limiter moderado (incluye admin y público)
app.use("/api/ads", adminLimiter, adRoutes);

// Contractors → público con limiter permisivo
app.use("/api/contractors", publicLimiter, contractorRoutes);

// Health sin límite
app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    version: "1.0.0",
    env: process.env.NODE_ENV ?? "development",
  });
});

// ────────────────────────────────────────────────────────────
// ERROR HANDLER + INIT DB + LISTEN
// ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[Error]", err);
  res.status(500).json({ ok: false, error: "Error interno del servidor" });
});

try {
  await initDb();
} catch (err) {
  console.error("[DB] Error inicializando:", err);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │  OficioMX Backend                   │
  │  http://localhost:${PORT}              │
  │  Entorno: ${(process.env.NODE_ENV ?? "development").padEnd(25)}│
  └─────────────────────────────────────┘
  `);
});
