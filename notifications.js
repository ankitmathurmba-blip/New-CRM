// src/routes/notifications.js
const router    = require("express").Router();
const { query } = require("../db");
const { authenticate } = require("../middleware/auth");

// GET /api/notifications
router.get("/", authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30`
    );
    res.json(result.rows.map(n => ({
      id:      n.id,
      msg:     n.message,
      type:    n.type,
      read:    n.read,
      leadId:  n.lead_id,
      time:    new Date(n.created_at).toLocaleString("en-IN", {
        day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
      }),
    })));
  } catch (err) {
    console.error("GET /notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    await query("UPDATE notifications SET read = TRUE");
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    await query("UPDATE notifications SET read = TRUE WHERE id = $1", [req.params.id]);
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

module.exports = router;
