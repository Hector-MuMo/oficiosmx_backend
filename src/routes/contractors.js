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

// En Postgres, JSONB ya viene como array/objeto nativo. Dejamos el helper
// por si acaso viene como string (p.ej. desde un driver alternativo).
function parse(c) {
  if (!c) return null;
  if (typeof c.trades === "string") {
    try {
      c.trades = JSON.parse(c.trades);
    } catch {
      c.trades = [c.trades];
    }
  }
  if (typeof c.coverage_zones === "string") {
    try {
      c.coverage_zones = JSON.parse(c.coverage_zones);
    } catch {
      c.coverage_zones = [];
    }
  }
  return c;
}

// GET /api/contractors
router.get("/", async (req, res) => {
  try {
    const { trade, zone } = req.query;
    const params = [];
    let whereClause = "";

    if (trade) {
      params.push(`%${trade}%`);
      whereClause += ` AND trades::text ILIKE $${params.length}`;
    }
    if (zone) {
      params.push(`%${zone}%`);
      whereClause += ` AND (zone ILIKE $${params.length} OR coverage_zones::text ILIKE $${params.length})`;
    }

    const result = await query(
      `
      SELECT c.*,
        ROUND(AVG(r.stars)::numeric, 1)::float AS rating,
        COUNT(r.id)::int AS review_count
      FROM contractors c
      LEFT JOIN reviews r ON r.contractor_id = c.id AND r.status = 'approved'
      WHERE 1=1 ${whereClause}
      GROUP BY c.id
      ORDER BY RANDOM()
    `,
      params,
    );

    res.json({ ok: true, data: result.rows.map(parse) });
  } catch (err) {
    console.error("[GET /contractors]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// GET /api/contractors/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await query(
      `
      SELECT c.*,
        ROUND(AVG(r.stars)::numeric, 1)::float AS rating,
        COUNT(r.id)::int AS review_count
      FROM contractors c
      LEFT JOIN reviews r ON r.contractor_id = c.id AND r.status = 'approved'
      WHERE c.id = $1
      GROUP BY c.id
    `,
      [req.params.id],
    );

    const c = parse(result.rows[0]);
    if (!c)
      return res
        .status(404)
        .json({ ok: false, error: "Contratista no encontrado" });

    const reviewsRes = await query(
      `
      SELECT id, author_name, stars, body, approved_at
      FROM reviews WHERE contractor_id = $1 AND status = 'approved'
      ORDER BY approved_at DESC LIMIT 20
    `,
      [req.params.id],
    );

    c.reviews = reviewsRes.rows;
    res.json({ ok: true, data: c });
  } catch (err) {
    console.error("[GET /contractors/:id]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// POST /api/contractors
router.post("/", async (req, res) => {
  try {
    const {
      name,
      trades,
      zone,
      coverage_zones = [],
      whatsapp,
      years_exp,
      availability = "Lunes a sábado",
      rate = "",
      avatar_color = "#1F6B4E",
      plan,
      email,
    } = req.body;

    if (!name || !trades || !zone || !whatsapp || years_exp === undefined)
      return res
        .status(400)
        .json({ ok: false, error: "Faltan campos obligatorios" });

    if (!Array.isArray(trades) || trades.length === 0 || trades.length > 5)
      return res
        .status(400)
        .json({ ok: false, error: "Selecciona entre 1 y 5 oficios" });

    const wa = String(whatsapp).replace(/\D/g, "");
    if (wa.length < 10)
      return res
        .status(400)
        .json({ ok: false, error: "Número de WhatsApp inválido" });

    const safePlan = ["free", "premium"].includes(plan) ? plan : "free";

    const result = await query(
      `
      INSERT INTO contractors
        (name, trades, zone, coverage_zones, whatsapp, years_exp, availability, rate, avatar_color, plan, email)
      VALUES ($1, $2::jsonb, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        normalizeName(name),
        JSON.stringify(trades),
        zone.trim(),
        JSON.stringify(Array.isArray(coverage_zones) ? coverage_zones : []),
        wa,
        Number(years_exp),
        availability.trim() || "Lunes a sábado",
        rate.trim(),
        avatar_color || "#1F6B4E",
        safePlan,
        email?.trim() || null,
      ],
    );

    res.status(201).json({ ok: true, data: parse(result.rows[0]) });
  } catch (err) {
    console.error("[POST /contractors]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// PATCH /api/contractors/:id/verify (admin)
router.patch("/:id/verify", adminOnly, async (req, res) => {
  try {
    const { verified } = req.body;
    if (verified === undefined)
      return res
        .status(400)
        .json({ ok: false, error: "Falta el campo verified" });

    const result = await query(
      "UPDATE contractors SET verified = $1 WHERE id = $2 RETURNING *",
      [verified ? 1 : 0, req.params.id],
    );

    if (result.rowCount === 0)
      return res
        .status(404)
        .json({ ok: false, error: "Contratista no encontrado" });

    res.json({ ok: true, data: parse(result.rows[0]) });
  } catch (err) {
    console.error("[PATCH /contractors/:id/verify]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// PATCH /api/contractors/:id  (admin)
router.patch("/:id", adminOnly, async (req, res) => {
  try {
    const {
      name,
      whatsapp,
      trades,
      zone,
      coverage_zones,
      availability,
      rate,
      avatar_color,
      verified,
      email,
      years_exp,
    } = req.body;
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push(`name = $${values.length + 1}`);
      values.push(name);
    }
    if (whatsapp !== undefined) {
      fields.push(`whatsapp = $${values.length + 1}`);
      values.push(String(whatsapp).replace(/\D/g, ""));
    }
    if (trades !== undefined) {
      fields.push(`trades = $${values.length + 1}::jsonb`);
      values.push(JSON.stringify(trades));
    }
    if (zone !== undefined) {
      fields.push(`zone = $${values.length + 1}`);
      values.push(zone);
    }
    if (coverage_zones !== undefined) {
      fields.push(`coverage_zones = $${values.length + 1}::jsonb`);
      values.push(JSON.stringify(coverage_zones));
    }
    if (availability !== undefined) {
      fields.push(`availability = $${values.length + 1}`);
      values.push(availability);
    }
    if (rate !== undefined) {
      fields.push(`rate = $${values.length + 1}`);
      values.push(rate);
    }
    if (avatar_color !== undefined) {
      fields.push(`avatar_color = $${values.length + 1}`);
      values.push(avatar_color);
    }
    if (verified !== undefined) {
      fields.push(`verified = $${values.length + 1}`);
      values.push(verified ? 1 : 0);
    }
    if (email !== undefined) {
      fields.push(`email = $${values.length + 1}`);
      values.push(email?.trim() || null);
    }
    if (years_exp !== undefined) {
      fields.push(`years_exp = $${values.length + 1}`);
      values.push(Number(years_exp));
    }

    if (!fields.length)
      return res.status(400).json({ ok: false, error: "Nada que actualizar" });

    values.push(req.params.id);
    const result = await query(
      `UPDATE contractors SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );

    if (result.rowCount === 0)
      return res
        .status(404)
        .json({ ok: false, error: "Contratista no encontrado" });
    res.json({ ok: true, data: parse(result.rows[0]) });
  } catch (err) {
    console.error("[PATCH /contractors/:id]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// DELETE /api/contractors/:id  (admin)
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const result = await query(
      "DELETE FROM contractors WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (result.rowCount === 0)
      return res
        .status(404)
        .json({ ok: false, error: "Contratista no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /contractors/:id]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

export default router;
