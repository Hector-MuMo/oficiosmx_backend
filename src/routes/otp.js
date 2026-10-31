import { Router } from "express";
import { query } from "../db-pg.js";
import { sendOtpEmail } from "../mailer.js";

const router = Router();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiresAt(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

// POST /api/otp/send
router.post("/send", async (req, res) => {
  try {
    const { email, context } = req.body;
    if (!email || !context)
      return res
        .status(400)
        .json({ ok: false, error: "Faltan campos: email, context" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ ok: false, error: "Correo inválido" });

    const existing = await query(
      `
      SELECT expires_at FROM otp_codes
      WHERE email = $1 AND context = $2 AND used = 0
      ORDER BY id DESC LIMIT 1
    `,
      [email, context],
    );

    if (existing.rowCount > 0) {
      const expiresAtTime = new Date(existing.rows[0].expires_at).getTime();
      const secondsLeft = Math.ceil((expiresAtTime - Date.now()) / 1000);
      const secondsSinceCreation = 600 - secondsLeft;
      if (secondsSinceCreation < 60) {
        const waitTime = Math.ceil(60 - secondsSinceCreation);
        return res.status(429).json({
          ok: false,
          error: `Espera ${waitTime} segundos antes de pedir otro código`,
        });
      }
    }

    await query("DELETE FROM otp_codes WHERE email = $1 AND context = $2", [
      email,
      context,
    ]);

    const code = generateCode();
    await query(
      `
      INSERT INTO otp_codes (email, context, code, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
      [email, context, code, expiresAt(10)],
    );

    const label = context.startsWith("review_")
      ? "Verificación de reseña en OficioMX"
      : "Registro de contratista en OficioMX";

    const result = await sendOtpEmail(email, code, label);
    if (!result.ok)
      return res
        .status(500)
        .json({ ok: false, error: "No se pudo enviar el correo" });

    res.json({ ok: true, message: `Código enviado a ${email}` });
  } catch (err) {
    console.error("[POST /otp/send]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// POST /api/otp/verify
router.post("/verify", async (req, res) => {
  try {
    const { email, context, code } = req.body;
    if (!email || !context || !code)
      return res
        .status(400)
        .json({ ok: false, error: "Faltan campos: email, context, code" });

    const result = await query(
      `
      SELECT * FROM otp_codes
      WHERE email = $1 AND context = $2 AND used = 0
      ORDER BY id DESC LIMIT 1
    `,
      [email, context],
    );

    if (result.rowCount === 0)
      return res
        .status(400)
        .json({ ok: false, error: "Código no encontrado o ya usado" });

    const record = result.rows[0];

    if (new Date(record.expires_at) < new Date())
      return res
        .status(400)
        .json({ ok: false, error: "El código expiró, solicita uno nuevo" });

    if (record.attempts >= 5) {
      await query("DELETE FROM otp_codes WHERE id = $1", [record.id]);
      return res
        .status(400)
        .json({
          ok: false,
          error: "Demasiados intentos, solicita un nuevo código",
        });
    }

    if (record.code !== code.trim()) {
      await query(
        "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1",
        [record.id],
      );
      const left = 5 - (record.attempts + 1);
      return res
        .status(400)
        .json({
          ok: false,
          error: `Código incorrecto. Intentos restantes: ${left}`,
        });
    }

    await query("UPDATE otp_codes SET used = 1 WHERE id = $1", [record.id]);
    res.json({ ok: true, message: "Correo verificado correctamente" });
  } catch (err) {
    console.error("[POST /otp/verify]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

export default router;
