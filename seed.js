// db/seed.js  –  Seeds default data into all tables
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const { pool } = require("../src/db");

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Users ──────────────────────────────────────────────────────────────
    console.log("🌱  Seeding users…");
    const usersData = [
      { name:"Admin User",   email:"admin@reliablesoft.in",    role:"admin",        status:"Active",   joined:"2023-01-01" },
      { name:"Rahul Verma",  email:"rahul@reliablesoft.in",    role:"sales",        status:"Active",   joined:"2023-03-15" },
      { name:"Sneha Kapoor", email:"sneha@reliablesoft.in",    role:"sales",        status:"Active",   joined:"2023-04-10" },
      { name:"Ajay Tiwari",  email:"ajay@reliablesoft.in",     role:"sales",        status:"Active",   joined:"2023-06-01" },
      { name:"Nidhi Joshi",  email:"nidhi@reliablesoft.in",    role:"sales",        status:"Inactive", joined:"2023-07-20" },
      { name:"IT Team Lead", email:"it@reliablesoft.in",       role:"it",           status:"Active",   joined:"2023-01-15" },
      { name:"Manoj Kumar",  email:"manoj@reliablesoft.in",    role:"installation", status:"Active",   joined:"2023-02-01" },
      { name:"Field Alpha",  email:"alpha@reliablesoft.in",    role:"installation", status:"Active",   joined:"2023-05-01" },
      { name:"Accounts Mgr", email:"accounts@reliablesoft.in", role:"accounts",     status:"Active",   joined:"2023-01-10" },
    ];
    const defaultPass = await bcrypt.hash("Password@123", 10);
    for (const u of usersData) {
      await client.query(`
        INSERT INTO users (name, email, password, role, status, joined)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (email) DO NOTHING
      `, [u.name, u.email, defaultPass, u.role, u.status, u.joined]);
    }

    // ── Packages ───────────────────────────────────────────────────────────
    console.log("🌱  Seeding packages…");
    const packages = [
      { name:"Starter 30 Mbps – ₹399/mo",    price:399,  speed:30,    cat:"Residential" },
      { name:"Home 100 Mbps – ₹699/mo",       price:699,  speed:100,   cat:"Residential" },
      { name:"Pro 200 Mbps – ₹1,099/mo",      price:1099, speed:200,   cat:"Residential" },
      { name:"Ultra 500 Mbps – ₹1,799/mo",    price:1799, speed:500,   cat:"Residential" },
      { name:"Giga 1 Gbps – ₹2,999/mo",       price:2999, speed:1000,  cat:"Commercial" },
      { name:"Business 2 Gbps – ₹4,999/mo",   price:4999, speed:2000,  cat:"Enterprise" },
    ];
    for (const p of packages) {
      await client.query(`
        INSERT INTO packages (name, price, speed_mbps, category)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (name) DO NOTHING
      `, [p.name, p.price, p.speed, p.cat]);
    }

    // ── Areas ──────────────────────────────────────────────────────────────
    console.log("🌱  Seeding areas…");
    const areas = [
      "Sector 7","Laxmi Nagar","Andheri West","Salt Lake","Koramangala","Banjara Hills","Connaught Place"
    ];
    for (const a of areas) {
      await client.query(`
        INSERT INTO areas (name) VALUES ($1) ON CONFLICT (name) DO NOTHING
      `, [a]);
    }

    // ── Leads ──────────────────────────────────────────────────────────────
    console.log("🌱  Seeding leads…");
    const leads = [
      {
        id:"LD-0001", customer_name:"Arjun Mehta",    mobile:"9876543210", alt_mobile:"",           email:"arjun@email.com",
        address:"12 MG Road, Sector 7", area:"Sector 7",      package:"Pro 200 Mbps – ₹1,099/mo",
        lead_source:"Referral",  lead_type:"Residential", priority:"HOT",  salesperson:"Rahul Verma",
        status:"Activated",                created_at:"2025-01-10",
        feasibility:"Feasible",     feas_note:"Fiber available 60m",
        installation:"Installed",   inst_tech:"Manoj Kumar",     inst_date:"2025-01-14", inst_note:"ONT placed, speed OK",
        payment:"Completed", pay_mode:"UPI",           txn_id:"UPI4455667", invoice_amt:1099,
      },
      {
        id:"LD-0002", customer_name:"Priya Sharma",   mobile:"9812345678", alt_mobile:"9812345679", email:"priya@email.com",
        address:"B-45 Laxmi Nagar",      area:"Laxmi Nagar",   package:"Home 100 Mbps – ₹699/mo",
        lead_source:"Website",   lead_type:"Residential", priority:"WARM", salesperson:"Sneha Kapoor",
        status:"Installation Pending",    created_at:"2025-01-14",
        feasibility:"Feasible",     feas_note:"Good coverage area",
        installation:"Pending",     inst_tech:"",             inst_date:null, inst_note:"",
        payment:"Pending", pay_mode:"", txn_id:"", invoice_amt:699,
      },
      {
        id:"LD-0003", customer_name:"Suresh Patel",   mobile:"9900112233", alt_mobile:"",           email:"",
        address:"7 Gandhi Colony, Salt Lake", area:"Salt Lake",  package:"Starter 30 Mbps – ₹399/mo",
        lead_source:"Walkin",    lead_type:"Residential", priority:"COLD", salesperson:"Ajay Tiwari",
        status:"Feasibility Pending",     created_at:"2025-01-16",
        feasibility:"Pending",      feas_note:"",
        installation:"Pending",     inst_tech:"",             inst_date:null, inst_note:"",
        payment:"Pending", pay_mode:"", txn_id:"", invoice_amt:399,
      },
      {
        id:"LD-0004", customer_name:"Deepa Nair",     mobile:"9871234567", alt_mobile:"",           email:"deepa@email.com",
        address:"Flat 302, Silver Oak Apts", area:"Koramangala", package:"Ultra 500 Mbps – ₹1,799/mo",
        lead_source:"Call",      lead_type:"Residential", priority:"HOT",  salesperson:"Sneha Kapoor",
        status:"Payment Pending",         created_at:"2025-01-18",
        feasibility:"Feasible",     feas_note:"Ready to proceed",
        installation:"Installed",   inst_tech:"Field Team Alpha", inst_date:"2025-01-22", inst_note:"Done, tested OK",
        payment:"Pending", pay_mode:"", txn_id:"", invoice_amt:1799,
      },
      {
        id:"LD-0005", customer_name:"Kiran Rao",      mobile:"9988776655", alt_mobile:"",           email:"",
        address:"Plot 9, New Town",          area:"Banjara Hills", package:"Home 100 Mbps – ₹699/mo",
        lead_source:"Advertisement", lead_type:"Residential", priority:"COLD", salesperson:"Rahul Verma",
        status:"Not Feasible",            created_at:"2025-01-20",
        feasibility:"Not Feasible", feas_note:"No fiber in zone, 2km gap",
        installation:"Pending",     inst_tech:"",             inst_date:null, inst_note:"",
        payment:"Pending", pay_mode:"", txn_id:"", invoice_amt:0,
      },
      {
        id:"LD-0006", customer_name:"Aarav Joshi",    mobile:"9001234567", alt_mobile:"9001234568", email:"aarav@email.com",
        address:"C-12 Andheri West",         area:"Andheri West", package:"Giga 1 Gbps – ₹2,999/mo",
        lead_source:"Social Media", lead_type:"Commercial", priority:"HOT",  salesperson:"Nidhi Joshi",
        status:"New",                     created_at:"2025-01-22",
        feasibility:"Pending",      feas_note:"",
        installation:"Pending",     inst_tech:"",             inst_date:null, inst_note:"",
        payment:"Pending", pay_mode:"", txn_id:"", invoice_amt:2999,
      },
      {
        id:"LD-0007", customer_name:"Sunita Verma",   mobile:"9765432109", alt_mobile:"",           email:"sunita@email.com",
        address:"45 Park Avenue, Sector 7",  area:"Sector 7",    package:"Business 2 Gbps – ₹4,999/mo",
        lead_source:"Field Visit", lead_type:"Enterprise", priority:"HOT",  salesperson:"Rahul Verma",
        status:"Activated",               created_at:"2024-12-28",
        feasibility:"Feasible",     feas_note:"Enterprise zone",
        installation:"Installed",   inst_tech:"Suresh Yadav",  inst_date:"2025-01-05", inst_note:"Rack mounted",
        payment:"Completed", pay_mode:"Bank Transfer", txn_id:"NEFT8899", invoice_amt:4999,
      },
      {
        id:"LD-0008", customer_name:"Rohit Malhotra", mobile:"9654321098", alt_mobile:"",           email:"",
        address:"H-7 Sector 7",              area:"Sector 7",    package:"Pro 200 Mbps – ₹1,099/mo",
        lead_source:"Referral",  lead_type:"Residential", priority:"WARM", salesperson:"Ajay Tiwari",
        status:"Installation In Progress",  created_at:"2025-01-23",
        feasibility:"Feasible",     feas_note:"Covered area",
        installation:"In Progress", inst_tech:"Field Team Beta", inst_date:"2025-01-25", inst_note:"Cable laid",
        payment:"Pending", pay_mode:"", txn_id:"", invoice_amt:1099,
      },
    ];

    for (const l of leads) {
      await client.query(`
        INSERT INTO leads (
          id, customer_name, mobile, alt_mobile, email, address, area, package, invoice_amt,
          lead_source, lead_type, priority, salesperson, status, created_at,
          feasibility, feas_note, installation, inst_tech, inst_date, inst_note,
          payment, pay_mode, txn_id
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,$21,
          $22,$23,$24
        ) ON CONFLICT (id) DO NOTHING
      `, [
        l.id, l.customer_name, l.mobile, l.alt_mobile||null, l.email||null,
        l.address, l.area, l.package, l.invoice_amt,
        l.lead_source, l.lead_type, l.priority, l.salesperson, l.status, l.created_at,
        l.feasibility, l.feas_note||null, l.installation, l.inst_tech||null,
        l.inst_date||null, l.inst_note||null,
        l.payment, l.pay_mode||null, l.txn_id||null,
      ]);
    }

    // ── Comments ───────────────────────────────────────────────────────────
    console.log("🌱  Seeding comments…");
    const comments = [
      { lead_id:"LD-0001", by_name:"Rahul Verma",  by_role:"sales",        text:"Customer ready to pay immediately",      created_at:"2025-01-10 10:00:00" },
      { lead_id:"LD-0002", by_name:"Sneha Kapoor", by_role:"sales",        text:"Submitted feasibility",                 created_at:"2025-01-14 09:30:00" },
      { lead_id:"LD-0004", by_name:"Field Team Alpha",by_role:"installation",text:"Installation complete",               created_at:"2025-01-22 16:00:00" },
      { lead_id:"LD-0005", by_name:"IT Team",      by_role:"it",           text:"Area not covered. Closed.",             created_at:"2025-01-21 11:00:00" },
    ];
    for (const c of comments) {
      await client.query(`
        INSERT INTO lead_comments (lead_id, by_name, by_role, text, created_at)
        VALUES ($1,$2,$3,$4,$5)
      `, [c.lead_id, c.by_name, c.by_role, c.text, c.created_at]);
    }

    // ── Audit Logs ─────────────────────────────────────────────────────────
    console.log("🌱  Seeding audit logs…");
    const audits = [
      { user_name:"Admin",        user_role:"admin",    action:"Activated connection",        entity:"LD-0001", ip_address:"192.168.1.1",  created_at:"2025-01-10 14:32:00" },
      { user_name:"Rahul Verma",  user_role:"sales",    action:"Created new lead",            entity:"LD-0006", ip_address:"192.168.1.5",  created_at:"2025-01-22 09:15:00" },
      { user_name:"IT Team Lead", user_role:"it",       action:"Marked Feasible",             entity:"LD-0002", ip_address:"192.168.1.8",  created_at:"2025-01-15 11:00:00" },
      { user_name:"Accounts Mgr", user_role:"accounts", action:"Payment verified & activated",entity:"LD-0007", ip_address:"192.168.1.3",  created_at:"2025-01-06 16:30:00" },
    ];
    for (const a of audits) {
      await client.query(`
        INSERT INTO audit_logs (user_name, user_role, action, entity, ip_address, created_at)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [a.user_name, a.user_role, a.action, a.entity, a.ip_address, a.created_at]);
    }

    // ── Notifications ──────────────────────────────────────────────────────
    console.log("🌱  Seeding notifications…");
    const notifs = [
      { message:"LD-0004 awaiting payment verification",      type:"warning", lead_id:"LD-0004" },
      { message:"LD-0002 installation pending — assign tech", type:"info",    lead_id:"LD-0002" },
      { message:"LD-0008 installation in progress",           type:"info",    lead_id:"LD-0008", read:true },
      { message:"LD-0005 closed — not feasible",              type:"error",   lead_id:"LD-0005", read:true },
    ];
    for (const n of notifs) {
      await client.query(`
        INSERT INTO notifications (message, type, lead_id, read)
        VALUES ($1,$2,$3,$4)
      `, [n.message, n.type, n.lead_id||null, n.read||false]);
    }

    await client.query("COMMIT");
    console.log("✅  Seed complete!");
    console.log("   Default password for all users: Password@123");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌  Seed failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
