// src/routes/leads.js
const router          = require("express").Router();
const { query }       = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

// helper to push an audit entry
async function addAudit(userName, userRole, action, entity, ip) {
  await query(
    "INSERT INTO audit_logs (user_name, user_role, action, entity, ip_address) VALUES ($1,$2,$3,$4,$5)",
    [userName, userRole, action, entity, ip]
  );
}

// helper to push a notification
async function pushNotif(message, type, leadId) {
  await query(
    "INSERT INTO notifications (message, type, lead_id) VALUES ($1,$2,$3)",
    [message, type, leadId || null]
  );
}

// helper – format a lead row with comments
function formatLead(row, comments = []) {
  return {
    id:           row.id,
    customerName: row.customer_name,
    mobile:       row.mobile,
    altMobile:    row.alt_mobile || "",
    email:        row.email || "",
    address:      row.address || "",
    area:         row.area || "",
    package:      row.package || "",
    invoiceAmt:   parseFloat(row.invoice_amt) || 0,
    leadSource:   row.lead_source || "",
    leadType:     row.lead_type || "",
    priority:     row.priority || "WARM",
    salesperson:  row.salesperson || "",
    status:       row.status,
    createdAt:    row.created_at
      ? new Date(row.created_at).toISOString().slice(0, 10)
      : "",
    feasibility:  row.feasibility || "Pending",
    feasNote:     row.feas_note || "",
    installation: row.installation || "Pending",
    instTech:     row.inst_tech || "",
    instDate:     row.inst_date
      ? new Date(row.inst_date).toISOString().slice(0, 10)
      : "",
    instNote:     row.inst_note || "",
    payment:      row.payment || "Pending",
    payMode:      row.pay_mode || "",
    txnId:        row.txn_id || "",
    comments:     comments.map(c => ({
      by:   c.by_name,
      role: c.by_role,
      text: c.text,
      time: new Date(c.created_at).toLocaleString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }),
    })),
    updatedAt: row.updated_at,
  };
}

// ── GET /api/leads  ───────────────────────────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const { status, priority, salesperson, area, search, page = 1, limit = 50 } = req.query;
    const where = ["1=1"];
    const params = [];

    if (status)      { params.push(status);      where.push(`l.status = $${params.length}`); }
    if (priority)    { params.push(priority);    where.push(`l.priority = $${params.length}`); }
    if (salesperson) { params.push(salesperson); where.push(`l.salesperson = $${params.length}`); }
    if (area)        { params.push(area);        where.push(`l.area = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      where.push(`(l.customer_name ILIKE $${i} OR l.mobile ILIKE $${i} OR l.id ILIKE $${i})`);
    }

    // Role-based filter
    if (req.user.role === "sales") {
      params.push(req.user.name);
      where.push(`l.salesperson = $${params.length}`);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const sql = `
      SELECT l.*,
        (SELECT COUNT(*) FROM lead_comments lc WHERE lc.lead_id = l.id) AS comment_count
      FROM leads l
      WHERE ${where.join(" AND ")}
      ORDER BY l.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countSql = `SELECT COUNT(*) FROM leads l WHERE ${where.slice(0, -2).join(" AND ")}`;
    const countParams = params.slice(0, -2);

    const [leadsRes, countRes] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const leads = leadsRes.rows.map(r => formatLead(r));
    res.json({
      leads,
      total:    parseInt(countRes.rows[0].count),
      page:     parseInt(page),
      limit:    parseInt(limit),
    });
  } catch (err) {
    console.error("GET /leads error:", err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// ── GET /api/leads/:id  ───────────────────────────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const [leadRes, commentsRes] = await Promise.all([
      query("SELECT * FROM leads WHERE id = $1", [req.params.id]),
      query("SELECT * FROM lead_comments WHERE lead_id = $1 ORDER BY created_at ASC", [req.params.id]),
    ]);
    if (!leadRes.rows[0]) return res.status(404).json({ error: "Lead not found" });
    res.json(formatLead(leadRes.rows[0], commentsRes.rows));
  } catch (err) {
    console.error("GET /leads/:id error:", err);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

// ── POST /api/leads  ──────────────────────────────────────────────────────────
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      customerName, mobile, altMobile, email, address, area, package: pkg,
      invoiceAmt, leadSource, leadType, priority, salesperson,
    } = req.body;

    if (!customerName || !mobile) {
      return res.status(400).json({ error: "customerName and mobile are required" });
    }

    // Generate ID
    const countRes = await query("SELECT COUNT(*) FROM leads");
    const newId = `LD-${String(parseInt(countRes.rows[0].count) + 1).padStart(4, "0")}`;

    await query(`
      INSERT INTO leads (
        id, customer_name, mobile, alt_mobile, email, address, area, package,
        invoice_amt, lead_source, lead_type, priority, salesperson, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'New')
    `, [
      newId, customerName, mobile, altMobile || null, email || null,
      address || null, area || null, pkg || null,
      parseFloat(invoiceAmt) || 0, leadSource || null, leadType || null,
      priority || "WARM", salesperson || req.user.name,
    ]);

    await addAudit(req.user.name, req.user.role, "Created new lead", newId, req.ip);
    await pushNotif(`${newId}: New lead created – ${customerName}`, "info", newId);

    const result = await query("SELECT * FROM leads WHERE id = $1", [newId]);
    res.status(201).json(formatLead(result.rows[0]));
  } catch (err) {
    console.error("POST /leads error:", err);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

// ── PATCH /api/leads/:id  ─────────────────────────────────────────────────────
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { auditMessage } = updates;
    delete updates.auditMessage;

    // Map camelCase → snake_case columns
    const colMap = {
      customerName: "customer_name",
      mobile:       "mobile",
      altMobile:    "alt_mobile",
      email:        "email",
      address:      "address",
      area:         "area",
      package:      "package",
      invoiceAmt:   "invoice_amt",
      leadSource:   "lead_source",
      leadType:     "lead_type",
      priority:     "priority",
      salesperson:  "salesperson",
      status:       "status",
      feasibility:  "feasibility",
      feasNote:     "feas_note",
      installation: "installation",
      instTech:     "inst_tech",
      instDate:     "inst_date",
      instNote:     "inst_note",
      payment:      "payment",
      payMode:      "pay_mode",
      txnId:        "txn_id",
    };

    const setClauses = [];
    const params     = [];

    for (const [key, val] of Object.entries(updates)) {
      const col = colMap[key];
      if (col) {
        params.push(val === "" ? null : val);
        setClauses.push(`${col} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    params.push(id);
    await query(
      `UPDATE leads SET ${setClauses.join(", ")} WHERE id = $${params.length}`,
      params
    );

    const action = auditMessage || `Updated lead ${id}`;
    await addAudit(req.user.name, req.user.role, action, id, req.ip);

    const [leadRes, commentsRes] = await Promise.all([
      query("SELECT * FROM leads WHERE id = $1", [id]),
      query("SELECT * FROM lead_comments WHERE lead_id = $1 ORDER BY created_at", [id]),
    ]);
    res.json(formatLead(leadRes.rows[0], commentsRes.rows));
  } catch (err) {
    console.error("PATCH /leads/:id error:", err);
    res.status(500).json({ error: "Failed to update lead" });
  }
});

// ── DELETE /api/leads/:id  ────────────────────────────────────────────────────
router.delete("/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT id FROM leads WHERE id = $1", [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Lead not found" });

    await query("DELETE FROM leads WHERE id = $1", [id]);
    await addAudit(req.user.name, req.user.role, "Deleted lead", id, req.ip);
    res.json({ message: `Lead ${id} deleted` });
  } catch (err) {
    console.error("DELETE /leads/:id error:", err);
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

// ── POST /api/leads/:id/comments  ─────────────────────────────────────────────
router.post("/:id/comments", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Comment text is required" });

    await query(
      "INSERT INTO lead_comments (lead_id, by_name, by_role, text) VALUES ($1,$2,$3,$4)",
      [id, req.user.name, req.user.role, text.trim()]
    );
    await addAudit(req.user.name, req.user.role, "Added comment", id, req.ip);

    const commentsRes = await query(
      "SELECT * FROM lead_comments WHERE lead_id = $1 ORDER BY created_at", [id]
    );
    res.status(201).json({
      comments: commentsRes.rows.map(c => ({
        by:   c.by_name,
        role: c.by_role,
        text: c.text,
        time: new Date(c.created_at).toLocaleString("en-IN", {
          day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
        }),
      })),
    });
  } catch (err) {
    console.error("POST /leads/:id/comments error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

module.exports = router;
