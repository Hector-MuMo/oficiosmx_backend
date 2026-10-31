import { Router } from "express";
import { query } from "../db-pg.js";
import { normalizeName } from "../utils/normalize.js";

const router = Router();

function adminOnly(req, res, next) {
  const incoming = (req.headers["x-admin-token"] ?? "").trim();
  const expected = (process.env.ADMIN_TOKEN ?? "").trim();
  if (!expected)
    return res
      .status(500)
      .json({ ok: false, error: "ADMIN_TOKEN no configurado" });
  if (!incoming || incoming !== expected)
    return res.status(401).json({ ok: false, error: "No autorizado" });
  next();
}

// POST /api/reviews
router.post("/", async (req, res) => {
  try {
    const { contractor_id, author_name, author_email, stars, body } = req.body;

    const missing = [
      "contractor_id",
      "author_name",
      "author_email",
      "stars",
      "body",
    ].filter((f) => req.body[f] === undefined || req.body[f] === "");
    if (missing.length)
      return res
        .status(400)
        .json({ ok: false, error: `Faltan campos: ${missing.join(", ")}` });

    if (![1, 2, 3, 4, 5].includes(Number(stars)))
      return res
        .status(400)
        .json({ ok: false, error: "Calificación debe ser entre 1 y 5" });

    if (String(body).trim().length < 20)
      return res
        .status(400)
        .json({
          ok: false,
          error: "El comentario debe tener al menos 20 caracteres",
        });

    const contractor = await query("SELECT id FROM contractors WHERE id = $1", [
      contractor_id,
    ]);
    if (contractor.rowCount === 0)
      return res
        .status(404)
        .json({ ok: false, error: "Contratista no encontrado" });

    const duplicate = await query(
      "SELECT id FROM reviews WHERE contractor_id = $1 AND author_email = $2 AND status != $3",
      [contractor_id, author_email, "rejected"],
    );
    if (duplicate.rowCount > 0)
      return res
        .status(409)
        .json({ ok: false, error: "Este correo ya reseñó a este contratista" });

    const result = await query(
      `
      INSERT INTO reviews (contractor_id, author_name, author_email, stars, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [
        contractor_id,
        normalizeName(author_name),
        author_email.trim(),
        Number(stars),
        body.trim(),
      ],
    );

    res.status(201).json({
      ok: true,
      message: "Reseña recibida. Se publicará tras revisión en 24 h.",
      data: { id: result.rows[0].id },
    });
  } catch (err) {
    console.error("[POST /reviews]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// GET /api/reviews/pending
router.get("/pending", adminOnly, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.id, r.contractor_id, r.author_name, r.author_email,
             r.stars, r.body, r.status, r.created_at,
             c.name AS contractor_name, c.trades
      FROM reviews r
      JOIN contractors c ON c.id = r.contractor_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC
    `);

    const reviews = result.rows.map((r) => {
      const trades = Array.isArray(r.trades) ? r.trades : [];
      return { ...r, trades, trade: trades.join(", ") };
    });

    res.json({ ok: true, data: reviews });
  } catch (err) {
    console.error("[GET /reviews/pending]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// PATCH /api/reviews/:id/approve
router.patch("/:id/approve", adminOnly, async (req, res) => {
  try {
    const result = await query(
      `UPDATE reviews SET status = 'approved', approved_at = NOW()
       WHERE id = $1 AND status = 'pending' RETURNING id`,
      [req.params.id],
    );

    if (result.rowCount === 0) {
      const exists = await query("SELECT id FROM reviews WHERE id = $1", [
        req.params.id,
      ]);
      if (exists.rowCount === 0)
        return res
          .status(404)
          .json({ ok: false, error: "Reseña no encontrada" });
      return res
        .status(409)
        .json({ ok: false, error: "La reseña ya fue procesada" });
    }

    res.json({ ok: true, message: "Reseña aprobada" });
  } catch (err) {
    console.error("[PATCH /reviews/:id/approve]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// PATCH /api/reviews/:id/reject
router.patch("/:id/reject", adminOnly, async (req, res) => {
  try {
    const result = await query(
      `UPDATE reviews SET status = 'rejected' WHERE id = $1 AND status = 'pending' RETURNING id`,
      [req.params.id],
    );

    if (result.rowCount === 0) {
      const exists = await query("SELECT id FROM reviews WHERE id = $1", [
        req.params.id,
      ]);
      if (exists.rowCount === 0)
        return res
          .status(404)
          .json({ ok: false, error: "Reseña no encontrada" });
      return res
        .status(409)
        .json({ ok: false, error: "La reseña ya fue procesada" });
    }

    res.json({ ok: true, message: "Reseña rechazada" });
  } catch (err) {
    console.error("[PATCH /reviews/:id/reject]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

export default router;
