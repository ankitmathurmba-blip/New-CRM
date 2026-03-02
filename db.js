// src/db.js  –  PostgreSQL connection pool
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "isp_crm",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "",
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error", err);
});

// Simple query helper
const query = (text, params) => pool.query(text, params);

// Test connection at startup
const testConnection = async () => {
  try {
    const res = await pool.query("SELECT NOW() AS now");
    console.log("✅  PostgreSQL connected –", res.rows[0].now);
  } catch (err) {
    console.error("❌  PostgreSQL connection FAILED:", err.message);
    console.error("    Ensure DB credentials are correct in your .env file");
    process.exit(1);
  }
};

module.exports = { pool, query, testConnection };
