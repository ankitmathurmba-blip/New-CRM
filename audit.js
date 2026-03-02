// src/routes/audit.js
const router    = require("express").Router();
const { query } = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

// GET /api/audit
router.get("/", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { limit = 100, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    const count = await query("SELECT COUNT(*) FROM audit_logs");
    res.json({
      logs: result.rows.map(r => ({
        id:        r.id,
        user:      r.user_name,
        role:      r.user_role,
        action:    r.action,
        entity:    r.entity,
        ip:        r.ip_address,
        time:      new Date(r.created_at).toLocaleString("en-IN", {
          day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
        }),
      })),
      total: parseInt(count.rows[0].count),
    });
  } catch (err) {
    console.error("GET /audit error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

module.exports = router;
