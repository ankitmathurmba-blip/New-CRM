// src/server.js  –  ISP CRM API Server
require("dotenv").config();
const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const rateLimit   = require("express-rate-limit");
const { testConnection } = require("./db");

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes   = require("./routes/auth");
const leadsRoutes  = require("./routes/leads");
const auditRoutes  = require("./routes/audit");
const notifsRoutes = require("./routes/notifications");
const usersRoutes  = require("./routes/users");
const masterRoutes = require("./routes/master");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173")
    .split(",")
    .map(s => s.trim()),
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 30,
  message: { error: "Too many auth attempts, please try again later" },
}));

app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: "Rate limit exceeded" },
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/leads",         leadsRoutes);
app.use("/api/audit",         auditRoutes);
app.use("/api/notifications", notifsRoutes);
app.use("/api/users",         usersRoutes);
app.use("/api/master",        masterRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found" }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   ISP CRM API Server – ReliableSoft Technologies         ║
║   Listening on: http://localhost:${PORT}                    ║
║                                                          ║
║   Endpoints:                                             ║
║     POST   /api/auth/login                               ║
║     GET    /api/leads         (paginated, filterable)    ║
║     POST   /api/leads                                    ║
║     PATCH  /api/leads/:id                                ║
║     DELETE /api/leads/:id     (admin only)               ║
║     POST   /api/leads/:id/comments                       ║
║     GET    /api/audit         (admin only)               ║
║     GET    /api/notifications                            ║
║     GET    /api/users         (admin only)               ║
║     POST   /api/users         (admin only)               ║
║     GET    /api/master/stats                             ║
║     GET    /api/master/packages                          ║
║     GET    /api/master/areas                             ║
║                                                          ║
║   Setup:                                                 ║
║     1. cp .env.example .env  → fill in DB credentials    ║
║     2. node db/migrate.js    → create tables             ║
║     3. node db/seed.js       → seed sample data          ║
║     4. npm start             → launch server             ║
╚══════════════════════════════════════════════════════════╝
    `);
  });
})();
