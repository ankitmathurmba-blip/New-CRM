// src/routes/master.js
const router    = require("express").Router();
const { query } = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

// ── Packages ──────────────────────────────────────────────────────────────────
router.get("/packages", authenticate, async (_req, res) => {
  const r = await query("SELECT * FROM packages WHERE active = TRUE ORDER BY price");
  res.json(r.rows);
});

router.post("/packages", authenticate, authorize(["admin"]), async (req, res) => {
  const { name, price, speed_mbps, category } = req.body;
  if (!name || !price) return res.status(400).json({ error: "name and price required" });
  try {
    const r = await query(
      "INSERT INTO packages (name, price, speed_mbps, category) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, price, speed_mbps || 0, category || "Residential"]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Package name already exists" });
    res.status(500).json({ error: "Failed to create package" });
  }
});

router.patch("/packages/:id", authenticate, authorize(["admin"]), async (req, res) => {
  const { name, price, speed_mbps, category, active } = req.body;
  await query(
    `UPDATE packages SET
      name       = COALESCE($1, name),
      price      = COALESCE($2, price),
      speed_mbps = COALESCE($3, speed_mbps),
      category   = COALESCE($4, category),
      active     = COALESCE($5, active)
     WHERE id = $6`,
    [name, price, speed_mbps, category, active, req.params.id]
  );
  const r = await query("SELECT * FROM packages WHERE id = $1", [req.params.id]);
  res.json(r.rows[0]);
});

router.delete("/packages/:id", authenticate, authorize(["admin"]), async (req, res) => {
  await query("UPDATE packages SET active = FALSE WHERE id = $1", [req.params.id]);
  res.json({ message: "Package deactivated" });
});

// ── Areas ─────────────────────────────────────────────────────────────────────
router.get("/areas", authenticate, async (_req, res) => {
  const r = await query("SELECT * FROM areas WHERE active = TRUE ORDER BY name");
  res.json(r.rows);
});

router.post("/areas", authenticate, authorize(["admin"]), async (req, res) => {
  const { name, city, pincode } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const r = await query(
      "INSERT INTO areas (name, city, pincode) VALUES ($1,$2,$3) RETURNING *",
      [name, city || null, pincode || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Area already exists" });
    res.status(500).json({ error: "Failed to create area" });
  }
});

router.delete("/areas/:id", authenticate, authorize(["admin"]), async (req, res) => {
  await query("UPDATE areas SET active = FALSE WHERE id = $1", [req.params.id]);
  res.json({ message: "Area deactivated" });
});

// ── Dashboard Stats (convenience endpoint) ────────────────────────────────────
router.get("/stats", authenticate, async (_req, res) => {
  try {
    const r = await query(`
      SELECT
        COUNT(*)                                                                   AS total,
        COUNT(*) FILTER (WHERE status = 'New')                                    AS new_leads,
        COUNT(*) FILTER (WHERE status IN ('Feasibility Pending','New'))            AS feas_pend,
        COUNT(*) FILTER (WHERE status IN ('Installation Pending','Installation In Progress')) AS inst_pend,
        COUNT(*) FILTER (WHERE status IN ('Payment Pending','Payment Partial'))    AS pay_pend,
        COUNT(*) FILTER (WHERE status = 'Activated')                              AS activated,
        COUNT(*) FILTER (WHERE status IN ('Not Feasible','Closed','Installation Failed')) AS closed,
        COALESCE(SUM(invoice_amt) FILTER (WHERE status = 'Activated'), 0)         AS revenue
      FROM leads
    `);
    const row = r.rows[0];
    res.json({
      total:     parseInt(row.total),
      newLeads:  parseInt(row.new_leads),
      feasPend:  parseInt(row.feas_pend),
      instPend:  parseInt(row.inst_pend),
      payPend:   parseInt(row.pay_pend),
      activated: parseInt(row.activated),
      notFeas:   parseInt(row.closed),
      revenue:   parseFloat(row.revenue),
    });
  } catch (err) {
    console.error("GET /master/stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
