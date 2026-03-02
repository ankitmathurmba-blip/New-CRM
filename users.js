// src/routes/users.js
const router    = require("express").Router();
const bcrypt    = require("bcryptjs");
const { query } = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

const fmt = r => ({
  id:      r.id,
  name:    r.name,
  email:   r.email,
  role:    r.role,
  status:  r.status,
  joined:  r.joined ? new Date(r.joined).toLocaleDateString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" }) : "",
});

// GET /api/users
router.get("/", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const result = await query("SELECT id,name,email,role,status,joined FROM users ORDER BY id");
    res.json(result.rows.map(fmt));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /api/users
router.post("/", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { name, email, role, password = "Password@123" } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: "name, email, role required" });

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,status,joined",
      [name, email.toLowerCase().trim(), hash, role]
    );
    res.status(201).json(fmt(result.rows[0]));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PATCH /api/users/:id
router.patch("/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { name, role, status, password } = req.body;
    const sets = [];
    const params = [];

    if (name)   { params.push(name);   sets.push(`name = $${params.length}`); }
    if (role)   { params.push(role);   sets.push(`role = $${params.length}`); }
    if (status) { params.push(status); sets.push(`status = $${params.length}`); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      params.push(hash);
      sets.push(`password = $${params.length}`);
    }

    if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });
    params.push(req.params.id);
    await query(`UPDATE users SET ${sets.join(",")} WHERE id = $${params.length}`, params);

    const result = await query("SELECT id,name,email,role,status,joined FROM users WHERE id = $1", [req.params.id]);
    res.json(fmt(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    await query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;
