import { Router } from "express";
import { query } from "../db-pg.js";

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

function normalizeDate(val) {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : null;
}

// GET /api/ads/active (público, solo lectura)
router.get("/active", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const result = await query(
      `
      SELECT * FROM ads
      WHERE active = 1
        AND (starts_at IS NULL OR starts_at <= $1::date)
        AND (ends_at IS NULL OR ends_at >= $1::date)
      ORDER BY id ASC
    `,
      [today],
    );

    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error("[GET /ads/active]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// POST /api/ads/:id/click
router.post("/:id/click", async (req, res) => {
  try {
    await query("UPDATE ads SET clicks = clicks + 1 WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /ads/:id/click]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// GET /api/ads (admin)
router.get("/", adminOnly, async (req, res) => {
  try {
    const result = await query("SELECT * FROM ads ORDER BY created_at DESC");
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error("[GET /ads]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// POST /api/ads (admin)
router.post("/", adminOnly, async (req, res) => {
  try {
    const { title, image_url, link_url, advertiser = "" } = req.body;
    const starts_at = normalizeDate(req.body.starts_at);
    const ends_at = normalizeDate(req.body.ends_at);

    if (!title || !image_url || !link_url)
      return res
        .status(400)
        .json({
          ok: false,
          error: "Faltan campos: title, image_url, link_url",
        });

    const result = await query(
      `
      INSERT INTO ads (title, image_url, link_url, advertiser, starts_at, ends_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [
        title.trim(),
        image_url.trim(),
        link_url.trim(),
        advertiser.trim(),
        starts_at,
        ends_at,
      ],
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error("[POST /ads]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// PATCH /api/ads/:id (admin)
router.patch("/:id", adminOnly, async (req, res) => {
  try {
    const {
      active,
      title,
      image_url,
      link_url,
      advertiser,
      starts_at,
      ends_at,
    } = req.body;
    const fields = [];
    const values = [];

    if (active !== undefined) {
      fields.push(`active = $${values.length + 1}`);
      values.push(active ? 1 : 0);
    }
    if (title !== undefined) {
      fields.push(`title = $${values.length + 1}`);
      values.push(title);
    }
    if (image_url !== undefined) {
      fields.push(`image_url = $${values.length + 1}`);
      values.push(image_url);
    }
    if (link_url !== undefined) {
      fields.push(`link_url = $${values.length + 1}`);
      values.push(link_url);
    }
    if (advertiser !== undefined) {
      fields.push(`advertiser = $${values.length + 1}`);
      values.push(advertiser);
    }
    if (starts_at !== undefined) {
      fields.push(`starts_at = $${values.length + 1}`);
      values.push(normalizeDate(starts_at));
    }
    if (ends_at !== undefined) {
      fields.push(`ends_at = $${values.length + 1}`);
      values.push(normalizeDate(ends_at));
    }

    if (!fields.length)
      return res.status(400).json({ ok: false, error: "Nada que actualizar" });

    values.push(req.params.id);
    const result = await query(
      `UPDATE ads SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );

    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error("[PATCH /ads/:id]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// DELETE /api/ads/:id (admin)
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    await query("DELETE FROM ads WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /ads/:id]", err);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

export default router;
