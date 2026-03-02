// src/routes/auth.js
const router   = require("express").Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { query }= require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await query(
      "SELECT * FROM users WHERE email = $1 AND status = 'Active'",
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const payload = {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });

    // Log audit
    await query(
      "INSERT INTO audit_logs (user_name, user_role, action, ip_address) VALUES ($1,$2,$3,$4)",
      [user.name, user.role, "User logged in", req.ip]
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout  (client should discard token)
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
