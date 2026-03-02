import { useState, useRef, useEffect, useCallback } from "react";

// ── Fonts ─────────────────────────────────────────────────────────────────────
const gf = document.createElement("link");
gf.rel = "stylesheet";
gf.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&display=swap";
document.head.appendChild(gf);

const style = document.createElement("style");
style.textContent = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Nunito',sans-serif;background:#f1f4f9;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:#f1f4f9;}
  ::-webkit-scrollbar-thumb{background:#c5cde0;border-radius:4px;}
  input,select,textarea,button{font-family:'Nunito',sans-serif;}
  @keyframes fadeDown{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes spin{to{transform:rotate(360deg);}}
  .fade-in{animation:fadeIn 0.2s ease;}
  .fade-down{animation:fadeDown 0.18s ease;}
  .nav-link:hover{background:#1a4fa0 !important;}
  .nav-link.active{background:#1a4fa0 !important;}
  .btn-primary:hover{background:#1a4fa0 !important;}
  .btn-outline:hover{background:#f0f4ff !important;}
  .btn-danger:hover{background:#c0392b !important;}
  .table-row:hover{background:#f5f8ff !important;}
  .sidebar-sub-link:hover{background:#1a4fa0 !important;padding-left:36px !important;}
  .card-section{transition:all 0.2s;}
  input:focus,select:focus,textarea:focus{outline:none;border-color:#2563EB !important;box-shadow:0 0 0 3px rgba(37,99,235,0.1);}
  .dropdown-opt:hover{background:#f0f4ff;}
  .spinner{animation:spin 0.8s linear infinite;}
`;
document.head.appendChild(style);

// ── API Configuration ─────────────────────────────────────────────────────────
// Change this to your backend URL in production
const API_BASE = "http://localhost:5000/api";

// ── API Client ────────────────────────────────────────────────────────────────
class ApiClient {
  constructor() {
    this.token = localStorage.getItem("isp_crm_token") || null;
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem("isp_crm_token", token);
    else localStorage.removeItem("isp_crm_token");
  }

  getHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    return headers;
  }

  async request(method, path, body = null) {
    const opts = { method, headers: this.getHeaders() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  get(path)          { return this.request("GET",    path); }
  post(path, body)   { return this.request("POST",   path, body); }
  patch(path, body)  { return this.request("PATCH",  path, body); }
  delete(path)       { return this.request("DELETE", path); }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(email, password) {
    const data = await this.post("/auth/login", { email, password });
    this.setToken(data.token);
    return data;
  }
  logout() { this.setToken(null); }

  // ── Leads ─────────────────────────────────────────────────────────────────
  getLeads(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/leads${qs ? "?" + qs : ""}`);
  }
  getLead(id)         { return this.get(`/leads/${id}`); }
  createLead(data)    { return this.post("/leads", data); }
  updateLead(id, data){ return this.patch(`/leads/${id}`, data); }
  deleteLead(id)      { return this.delete(`/leads/${id}`); }
  addComment(id, text){ return this.post(`/leads/${id}/comments`, { text }); }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getStats()          { return this.get("/master/stats"); }

  // ── Meta ──────────────────────────────────────────────────────────────────
  getPackages()       { return this.get("/master/packages"); }
  getAreas()          { return this.get("/master/areas"); }
  getAuditLogs(p = {}) {
    const qs = new URLSearchParams(p).toString();
    return this.get(`/audit${qs ? "?" + qs : ""}`);
  }
  getNotifications()         { return this.get("/notifications"); }
  markAllNotifsRead()        { return this.patch("/notifications/read-all"); }
  getUsers()                 { return this.get("/users"); }
  createUser(data)           { return this.post("/users", data); }
  updateUser(id, data)       { return this.patch(`/users/${id}`, data); }
  deleteUser(id)             { return this.delete(`/users/${id}`); }
}

const api = new ApiClient();

// ── Constants (fallback when not loaded from API) ─────────────────────────────
const LEAD_SOURCES = ["Call","Website","Walkin","Referral","Advertisement","Social Media","Field Visit"];
const LEAD_TYPES   = ["Residential","Commercial","Enterprise","Government","Educational"];
const PRIORITIES   = ["HOT","WARM","COLD"];
const DEFAULT_PACKAGES = ["Starter 30 Mbps – ₹399/mo","Home 100 Mbps – ₹699/mo","Pro 200 Mbps – ₹1,099/mo","Ultra 500 Mbps – ₹1,799/mo","Giga 1 Gbps – ₹2,999/mo","Business 2 Gbps – ₹4,999/mo"];
const DEFAULT_AREAS = ["Sector 7","Laxmi Nagar","Andheri West","Salt Lake","Koramangala","Banjara Hills","Connaught Place"];
const SALESPEOPLE  = ["Rahul Verma","Sneha Kapoor","Ajay Tiwari","Nidhi Joshi"];
const TECHNICIANS  = ["Manoj Kumar","Suresh Yadav","Field Team Alpha","Field Team Beta"];
const ROLES_LIST   = ["admin","sales","it","installation","accounts"];

const PKG_PRICE = { "Starter 30 Mbps – ₹399/mo":399,"Home 100 Mbps – ₹699/mo":699,"Pro 200 Mbps – ₹1,099/mo":1099,"Ultra 500 Mbps – ₹1,799/mo":1799,"Giga 1 Gbps – ₹2,999/mo":2999,"Business 2 Gbps – ₹4,999/mo":4999 };

const ROLES = {
  admin:        { label:"Admin / Owner",   short:"Admin",   color:"#2563EB" },
  sales:        { label:"Sales Team",      short:"Sales",   color:"#0891b2" },
  it:           { label:"IT / Feasibility",short:"IT",      color:"#7c3aed" },
  installation: { label:"Installation",    short:"Install", color:"#d97706" },
  accounts:     { label:"Accounts",        short:"Accts",   color:"#059669" },
};

const STATUS_COLOR = {
  "New":                     { bg:"#dbeafe", text:"#1d4ed8", dot:"#2563EB" },
  "Feasibility Pending":     { bg:"#fef3c7", text:"#92400e", dot:"#f59e0b" },
  "Not Feasible":            { bg:"#fee2e2", text:"#991b1b", dot:"#ef4444" },
  "Infrastructure Required": { bg:"#ffedd5", text:"#9a3412", dot:"#f97316" },
  "Installation Pending":    { bg:"#ede9fe", text:"#5b21b6", dot:"#7c3aed" },
  "Installation In Progress":{ bg:"#e0e7ff", text:"#3730a3", dot:"#6366f1" },
  "Installation Failed":     { bg:"#fee2e2", text:"#991b1b", dot:"#ef4444" },
  "Payment Pending":         { bg:"#ffedd5", text:"#9a3412", dot:"#f97316" },
  "Payment Partial":         { bg:"#fef9c3", text:"#713f12", dot:"#eab308" },
  "Activated":               { bg:"#dcfce7", text:"#14532d", dot:"#16a34a" },
  "Closed":                  { bg:"#f3f4f6", text:"#374151", dot:"#6b7280" },
};

const PRIORITY_STYLE = {
  HOT:  { bg:"#fee2e2", text:"#b91c1c" },
  WARM: { bg:"#fef3c7", text:"#92400e" },
  COLD: { bg:"#dbeafe", text:"#1e40af" },
};

const fmt      = n => `₹${Number(n).toLocaleString("en-IN")}`;
const nowStr   = () => new Date().toLocaleString("en-IN",{ day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit" });
const todayStr = () => new Date().toISOString().slice(0,10);
const C = {
  sidebar:"#1e3a8a",sidebarDark:"#172f74",sidebarActive:"#1a4fa0",sidebarText:"#bfdbfe",sidebarTextActive:"#ffffff",
  primary:"#2563EB",primaryHover:"#1d4ed8",bg:"#f1f4f9",white:"#ffffff",
  border:"#e2e8f0",border2:"#d1d5db",text:"#1e293b",muted:"#64748b",faint:"#94a3b8",
  red:"#dc2626",green:"#16a34a",orange:"#d97706",
};

const IS = { width:"100%",background:C.white,border:`1px solid ${C.border2}`,borderRadius:6,padding:"8px 11px",color:C.text,fontSize:13,outline:"none",transition:"border-color 0.15s,box-shadow 0.15s" };
const SS = { ...IS,cursor:"pointer",appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%2364748b' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",paddingRight:30 };
const TA = { ...IS,minHeight:80,resize:"vertical" };

// ── UI primitives (unchanged from original) ───────────────────────────────────
function Label({ children, required }) {
  return <label style={{ display:"block",fontSize:12,fontWeight:600,color:C.muted,marginBottom:5,letterSpacing:"0.02em" }}>{children}{required && <span style={{ color:C.red,marginLeft:2 }}>*</span>}</label>;
}
function Field({ label, required, children, half }) {
  return <div style={{ marginBottom:16,flex:half?"1 1 calc(50% - 8px)":"1 1 100%" }}><Label required={required}>{label}</Label>{children}</div>;
}
function Row({ children }) { return <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>{children}</div>; }

function StatusBadge({ status }) {
  const s = STATUS_COLOR[status]||{ bg:"#f3f4f6",text:"#374151",dot:"#6b7280" };
  return <span style={{ background:s.bg,color:s.text,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5,whiteSpace:"nowrap" }}><span style={{ width:6,height:6,borderRadius:"50%",background:s.dot,display:"inline-block" }}/>{status}</span>;
}
function PriorityBadge({ p }) {
  const s = PRIORITY_STYLE[p]||PRIORITY_STYLE.COLD;
  return <span style={{ background:s.bg,color:s.text,padding:"2px 10px",borderRadius:12,fontSize:11,fontWeight:800,letterSpacing:"0.05em" }}>{p}</span>;
}

function Spinner({ size=20 }) {
  return <div className="spinner" style={{ width:size,height:size,border:`2px solid #e2e8f0`,borderTopColor:C.primary,borderRadius:"50%",display:"inline-block" }}/>;
}

function Toast({ msg, type, onClose }) {
  const bg = { success:C.green, error:C.red, info:C.primary, warning:C.orange }[type]||C.primary;
  useEffect(() => { const t = setTimeout(onClose, 3500); return ()=>clearTimeout(t); }, []);
  return (
    <div className="fade-down" style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:bg,color:"#fff",padding:"12px 18px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,0.2)",display:"flex",gap:12,alignItems:"center",maxWidth:320 }}>
      <span style={{ flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:16 }}>✕</button>
    </div>
  );
}

function CustomSelect({ value, onChange, options, placeholder, width }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position:"relative",width:width||"100%" }}>
      <div onClick={()=>setOpen(!open)} style={{ ...IS,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderColor:open?C.primary:C.border2,boxShadow:open?"0 0 0 3px rgba(37,99,235,0.1)":"none" }}>
        <span style={{ color:value?C.text:C.faint,fontSize:13 }}>{value||placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ transform:open?"rotate(180deg)":"none",transition:"0.2s" }}><path fill={C.faint} d="M7 10l5 5 5-5z"/></svg>
      </div>
      {open && (
        <div className="fade-down" style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:100,background:C.white,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",overflow:"hidden" }}>
          {options.map(opt=>(
            <div key={opt} className="dropdown-opt" onClick={()=>{ onChange(opt); setOpen(false); }} style={{ padding:"9px 13px",fontSize:13,color:C.text,cursor:"pointer",background:value===opt?"#eff6ff":C.white,fontWeight:value===opt?600:400 }}>{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, defaultOpen=true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,marginBottom:16,overflow:"hidden" }}>
      <div onClick={()=>setOpen(!open)} style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 20px",borderBottom:open?`1px solid ${C.border}`:"none",cursor:"pointer",userSelect:"none",background:open?C.white:"#fafbfc" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" style={{ transform:open?"rotate(0)":"rotate(-90deg)",transition:"0.2s" }}><path fill={C.primary} d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
        <span style={{ fontWeight:700,fontSize:13,color:C.text }}>{title}</span>
      </div>
      {open && <div style={{ padding:"18px 20px" }}>{children}</div>}
    </div>
  );
}

function Modal({ title, subtitle, onClose, wide, children }) {
  return (
    <div onClick={onClose} className="fade-in" style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.white,borderRadius:12,width:"100%",maxWidth:wide?860:580,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ padding:"16px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.white,zIndex:1 }}>
          <div>
            <h3 style={{ fontSize:16,fontWeight:800,color:C.text }}>{title}</h3>
            {subtitle && <p style={{ fontSize:12,color:C.muted,marginTop:2 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9",border:"none",borderRadius:6,width:30,height:30,cursor:"pointer",fontSize:15,color:C.muted }}>✕</button>
        </div>
        <div style={{ padding:"20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Table({ headers, children, emptyMsg }) {
  return (
    <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden" }}>
      <table style={{ width:"100%",borderCollapse:"collapse" }}>
        <thead><tr style={{ background:"#f8fafc",borderBottom:`1px solid ${C.border}` }}>{headers.map(h=><th key={h} style={{ padding:"11px 14px",textAlign:"left",fontSize:12,fontWeight:700,color:C.muted,whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
      {!children||(Array.isArray(children)&&children.filter(Boolean).length===0) ? <div style={{ padding:40,textAlign:"center",color:C.faint,fontSize:13 }}>{emptyMsg||"No records found"}</div> : null}
    </div>
  );
}
function TR({ children, onClick }) { return <tr className="table-row" onClick={onClick} style={{ borderBottom:`1px solid ${C.border}`,cursor:onClick?"pointer":"default",transition:"background 0.1s" }}>{children}</tr>; }
function TD({ children, bold, mono, color }) { return <td style={{ padding:"11px 14px",fontSize:12.5,color:color||(bold?C.text:C.muted),fontWeight:bold?600:400,fontFamily:mono?"monospace":"inherit",whiteSpace:"nowrap" }}>{children}</td>; }

function Btn({ children, onClick, variant="primary", sm, disabled, icon, loading }) {
  const V = {
    primary:{ bg:C.primary,text:"#fff",border:`1px solid ${C.primary}` },
    success:{ bg:"#16a34a",text:"#fff",border:"1px solid #16a34a" },
    danger: { bg:C.red,   text:"#fff",border:`1px solid ${C.red}` },
    outline:{ bg:C.white, text:C.primary,border:`1px solid ${C.primary}` },
    ghost:  { bg:"#f1f5f9",text:C.muted,border:"1px solid #e2e8f0" },
    "red-o":{ bg:C.white, text:C.red,   border:`1px solid ${C.red}` },
    orange: { bg:"#d97706",text:"#fff",border:"1px solid #d97706" },
  };
  const v = V[variant]||V.primary;
  return (
    <button className={`btn-${variant}`} onClick={onClick} disabled={disabled||loading} style={{ background:v.bg,color:v.text,border:v.border,borderRadius:6,cursor:(disabled||loading)?"not-allowed":"pointer",padding:sm?"6px 14px":"8px 18px",fontSize:sm?12:13,fontWeight:700,display:"inline-flex",alignItems:"center",gap:6,opacity:(disabled||loading)?0.5:1,transition:"all 0.15s",whiteSpace:"nowrap" }}>
      {loading ? <Spinner size={14}/> : icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

function InfoRow({ label, value, color }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"6px 0",borderBottom:`1px solid ${C.border}` }}>
      <span style={{ fontSize:11,color:C.faint,fontWeight:600,minWidth:110 }}>{label}</span>
      <span style={{ fontSize:12,color:color||C.text,fontWeight:600,textAlign:"right",flex:1,marginLeft:8 }}>{value}</span>
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:16,fontSize:13,color:C.muted }}>
      {items.map((item,i)=>(
        <span key={i} style={{ display:"flex",alignItems:"center",gap:6 }}>
          {i>0 && <span style={{ color:C.faint }}>/</span>}
          <span style={{ color:i===items.length-1?C.text:C.muted,fontWeight:i===items.length-1?600:400 }}>{i===0?"🏠 "+item:item}</span>
        </span>
      ))}
    </div>
  );
}

function PageHeader({ icon, title, subtitle, action }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ width:40,height:40,borderRadius:10,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{icon}</div>
        <div>
          <h2 style={{ fontSize:18,fontWeight:800,color:C.text,letterSpacing:"-0.01em" }}>{title}</h2>
          {subtitle && <p style={{ fontSize:12,color:C.muted,marginTop:2 }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 20px",flex:"1 1 140px",borderLeft:`4px solid ${color}`,position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",top:10,right:14,fontSize:22,opacity:0.12 }}>{icon}</div>
      <div style={{ fontSize:26,fontWeight:800,color,lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12,color:C.muted,marginTop:5,fontWeight:600 }}>{label}</div>
      {sub && <div style={{ fontSize:11,color:C.faint,marginTop:2 }}>{sub}</div>}
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, toast }) {
  const [email, setEmail]       = useState("admin@reliablesoft.in");
  const [password, setPassword] = useState("Password@123");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const data = await api.login(email, password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#1e3a8a 0%,#2563EB 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:C.white,borderRadius:16,padding:"40px 44px",width:"100%",maxWidth:420,boxShadow:"0 32px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ textAlign:"center",marginBottom:32 }}>
          <div style={{ width:56,height:56,background:"#eff6ff",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 14px" }}>🌐</div>
          <h1 style={{ fontSize:22,fontWeight:800,color:C.text }}>ReliableSoft CRM</h1>
          <p style={{ fontSize:13,color:C.muted,marginTop:4 }}>ISP Lead & Customer Management</p>
        </div>

        {error && <div style={{ background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",fontSize:13,color:C.red,marginBottom:16 }}>{error}</div>}

        <div style={{ marginBottom:16 }}>
          <Label required>Email</Label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={IS} placeholder="your@email.com" onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoFocus />
        </div>
        <div style={{ marginBottom:24 }}>
          <Label required>Password</Label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={IS} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        </div>

        <Btn onClick={handleLogin} loading={loading} disabled={!email||!password} style={{ width:"100%" }}>
          Sign In
        </Btn>

        <div style={{ marginTop:20,background:"#f8fafc",borderRadius:8,padding:"12px 14px",fontSize:12,color:C.muted }}>
          <div style={{ fontWeight:700,marginBottom:6 }}>Demo Accounts (Password: Password@123)</div>
          {[["admin@reliablesoft.in","Admin"],["rahul@reliablesoft.in","Sales"],["it@reliablesoft.in","IT"],["manoj@reliablesoft.in","Installation"],["accounts@reliablesoft.in","Accounts"]].map(([e,r])=>(
            <div key={e} onClick={()=>setEmail(e)} style={{ cursor:"pointer",color:C.primary,padding:"2px 0" }}>
              <span style={{ fontWeight:600 }}>{r}:</span> {e}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── New Lead Modal ────────────────────────────────────────────────────────────
function NewLeadModal({ onClose, onCreate, packages, areas }) {
  const [form, setForm] = useState({
    customerName:"",mobile:"",altMobile:"",email:"",address:"",area:"",
    package:"",leadSource:"",leadType:"Residential",priority:"WARM",salesperson:"",invoiceAmt:""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const set = k => v => setForm(p=>({ ...p, [k]:v }));

  const save = async () => {
    if (!form.customerName.trim() || !form.mobile.trim()) { setError("Name and mobile are required"); return; }
    setSaving(true); setError("");
    try {
      const lead = await api.createLead({ ...form, invoiceAmt: form.package ? (PKG_PRICE[form.package]||0) : (parseFloat(form.invoiceAmt)||0) });
      onCreate(lead);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Lead" subtitle="Add a new ISP customer inquiry" onClose={onClose} wide>
      {error && <div style={{ background:"#fee2e2",borderRadius:8,padding:"10px 14px",fontSize:13,color:C.red,marginBottom:16 }}>{error}</div>}
      <SectionCard title="Customer Info">
        <Row>
          <Field label="Customer Name" required half><input value={form.customerName} onChange={e=>set("customerName")(e.target.value)} style={IS} placeholder="Full Name" /></Field>
          <Field label="Mobile" required half><input value={form.mobile} onChange={e=>set("mobile")(e.target.value)} style={IS} placeholder="10-digit mobile" /></Field>
        </Row>
        <Row>
          <Field label="Alternate Mobile" half><input value={form.altMobile} onChange={e=>set("altMobile")(e.target.value)} style={IS} placeholder="Optional" /></Field>
          <Field label="Email" half><input type="email" value={form.email} onChange={e=>set("email")(e.target.value)} style={IS} placeholder="email@example.com" /></Field>
        </Row>
        <Field label="Address"><textarea value={form.address} onChange={e=>set("address")(e.target.value)} style={TA} placeholder="Full address" /></Field>
        <Row>
          <Field label="Area" half><CustomSelect value={form.area} onChange={set("area")} options={areas} placeholder="Select area" /></Field>
          <Field label="Lead Type" half><CustomSelect value={form.leadType} onChange={set("leadType")} options={LEAD_TYPES} placeholder="Type" /></Field>
        </Row>
      </SectionCard>
      <SectionCard title="Lead Details">
        <Row>
          <Field label="Package" half><CustomSelect value={form.package} onChange={v=>{ set("package")(v); set("invoiceAmt")(String(PKG_PRICE[v]||"")); }} options={packages} placeholder="Select plan" /></Field>
          <Field label="Invoice Amount" half><input type="number" value={form.invoiceAmt} onChange={e=>set("invoiceAmt")(e.target.value)} style={IS} placeholder="₹ amount" /></Field>
        </Row>
        <Row>
          <Field label="Lead Source" half><CustomSelect value={form.leadSource} onChange={set("leadSource")} options={LEAD_SOURCES} placeholder="How did they reach?" /></Field>
          <Field label="Priority" half><CustomSelect value={form.priority} onChange={set("priority")} options={PRIORITIES} placeholder="Priority" /></Field>
        </Row>
        <Field label="Salesperson"><input value={form.salesperson} onChange={e=>set("salesperson")(e.target.value)} style={IS} placeholder="Assigned sales rep" /></Field>
      </SectionCard>
      <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} loading={saving} disabled={!form.customerName||!form.mobile}>Create Lead</Btn>
      </div>
    </Modal>
  );
}

// ── View Lead Modal ───────────────────────────────────────────────────────────
function ViewLeadModal({ leadId, role, onClose, onUpdated, packages, areas }) {
  const [lead, setLead]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [toast, setToast]   = useState(null);

  const showToast = (msg, type="success") => setToast({ msg, type });

  useEffect(() => {
    api.getLead(leadId).then(l => { setLead(l); setLoading(false); }).catch(()=>setLoading(false));
  }, [leadId]);

  const update = async (changes, auditMessage) => {
    if (!lead) return;
    setSaving(true);
    try {
      const updated = await api.updateLead(lead.id, { ...changes, auditMessage });
      setLead(updated);
      onUpdated && onUpdated(updated);
      showToast("Lead updated successfully");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    setSaving(true);
    try {
      const res = await api.addComment(lead.id, commentText.trim());
      setLead(p => ({ ...p, comments: res.comments }));
      setCommentText("");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Modal title="Loading…" onClose={onClose}><div style={{ textAlign:"center",padding:40 }}><Spinner size={32}/></div></Modal>;
  if (!lead)   return <Modal title="Not Found" onClose={onClose}><div style={{ padding:24,color:C.muted }}>Lead not found.</div></Modal>;

  const STEPS = [
    { label:"New",         done: true },
    { label:"Feasibility", done: ["Installation Pending","Installation In Progress","Installation Failed","Payment Pending","Payment Partial","Activated","Closed"].includes(lead.status), fail: lead.status==="Not Feasible" },
    { label:"Installation",done: ["Payment Pending","Payment Partial","Activated"].includes(lead.status), fail: lead.status==="Installation Failed" },
    { label:"Payment",     done: ["Activated"].includes(lead.status), fail: lead.status==="Payment Partial" },
    { label:"Activated",   done: lead.status==="Activated" },
  ];

  const canActivate = lead.installation==="Installed" && lead.payment==="Completed" && lead.status!=="Activated";

  return (
    <Modal title={`Lead: ${lead.id}`} subtitle={lead.customerName} onClose={onClose} wide>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Workflow steps */}
      <div style={{ background:"#f8fafc",border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 20px",marginBottom:16 }}>
        <div style={{ display:"flex",alignItems:"center",marginBottom:12 }}>
          {STEPS.map((s,i)=>{
            const color = s.fail?C.red:s.done?C.green:C.faint;
            return (
              <div key={s.label} style={{ display:"flex",alignItems:"center",flex:i<4?1:"none" }}>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:60 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:color+"20",border:`2px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color }}>{s.fail?"✗":s.done?"✓":i+1}</div>
                  <span style={{ fontSize:9,color,fontWeight:700,textAlign:"center",lineHeight:1.2 }}>{s.label}</span>
                </div>
                {i<4 && <div style={{ flex:1,height:2,background:s.done?C.green+"60":C.border,margin:"0 4px 16px" }}/>}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:10,display:"flex",alignItems:"center",gap:10 }}>
          <StatusBadge status={lead.status}/>
          <PriorityBadge p={lead.priority}/>
          {lead.leadSource && <span style={{ background:"#eff6ff",color:C.primary,padding:"2px 9px",borderRadius:12,fontSize:11,fontWeight:700 }}>{lead.leadSource}</span>}
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
        <SectionCard title="Customer Details">
          <InfoRow label="Name"        value={lead.customerName}/>
          <InfoRow label="Mobile"      value={lead.mobile}/>
          <InfoRow label="Alt. Mobile" value={lead.altMobile}/>
          <InfoRow label="Email"       value={lead.email}/>
          <InfoRow label="Address"     value={lead.address}/>
          <InfoRow label="Area"        value={lead.area}/>
          <InfoRow label="Package"     value={lead.package?.split("–")[0]} color={C.primary}/>
          <InfoRow label="Invoice Amt" value={fmt(lead.invoiceAmt||0)} color={C.orange}/>
          <InfoRow label="Salesperson" value={lead.salesperson}/>
          <InfoRow label="Lead Type"   value={lead.leadType}/>
          <InfoRow label="Created"     value={lead.createdAt}/>
        </SectionCard>
        <SectionCard title="Workflow Details">
          <InfoRow label="Current Status" value={lead.status}/>
          <InfoRow label="Feasibility"    value={lead.feasibility} color={lead.feasibility==="Feasible"?C.green:lead.feasibility==="Not Feasible"?C.red:C.muted}/>
          {lead.feasNote && <div style={{ background:"#f8fafc",borderRadius:6,padding:"7px 10px",fontSize:11,color:C.muted,margin:"6px 0" }}>{lead.feasNote}</div>}
          <InfoRow label="Installation"   value={lead.installation} color={lead.installation==="Installed"?C.green:C.muted}/>
          {lead.instTech && <InfoRow label="Technician"   value={lead.instTech}/>}
          {lead.instDate && <InfoRow label="Install Date" value={lead.instDate}/>}
          {lead.instNote && <div style={{ background:"#f8fafc",borderRadius:6,padding:"7px 10px",fontSize:11,color:C.muted,margin:"6px 0" }}>{lead.instNote}</div>}
          <InfoRow label="Payment" value={lead.payment} color={lead.payment==="Completed"?C.green:C.muted}/>
          {lead.payMode && <InfoRow label="Pay Mode" value={lead.payMode}/>}
          {lead.txnId   && <InfoRow label="TXN ID"   value={lead.txnId}/>}
        </SectionCard>
      </div>

      {/* Admin Override */}
      {role==="admin" && (
        <div style={{ background:"#fff5f5",border:`1px solid ${C.red}20`,borderRadius:10,padding:16,marginBottom:16 }}>
          <div style={{ fontSize:11,fontWeight:700,color:C.red,letterSpacing:"0.08em",marginBottom:10 }}>⚡ ADMIN OVERRIDE</div>
          <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
            <select defaultValue={lead.status} onChange={e=>update({ status:e.target.value },`Admin override → ${e.target.value}`)} style={{ ...SS,width:220 }}>
              {Object.keys(STATUS_COLOR).map(s=><option key={s}>{s}</option>)}
            </select>
            {canActivate && (
              <Btn variant="success" loading={saving} onClick={()=>{ update({ status:"Activated" },"Admin force-activated"); onClose(); }}>✓ Force Activate</Btn>
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      <SectionCard title="Comments & Notes">
        <div style={{ maxHeight:200,overflowY:"auto",marginBottom:12 }}>
          {(lead.comments||[]).length===0 && <div style={{ fontSize:12,color:C.faint,padding:"8px 0" }}>No comments yet</div>}
          {(lead.comments||[]).map((c,i)=>(
            <div key={i} style={{ background:"#f8fafc",borderRadius:8,padding:"10px 13px",marginBottom:8 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                <span style={{ fontSize:11,fontWeight:700,color:C.primary }}>{c.by}</span>
                <span style={{ fontSize:10,color:C.faint }}>{c.time}</span>
              </div>
              <p style={{ fontSize:12,color:C.text,lineHeight:1.5 }}>{c.text}</p>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&postComment()} placeholder="Add a comment… (Enter to post)" style={{ ...IS,flex:1 }}/>
          <Btn sm onClick={postComment} loading={saving}>Post</Btn>
        </div>
      </SectionCard>
    </Modal>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ stats, leads, role, onOpen, onNew, loading }) {
  const recent = [...leads].slice(0, 6);
  return (
    <div>
      <Breadcrumb items={["Home","Dashboard"]}/>
      <PageHeader icon="🏠" title="Dashboard" subtitle="Welcome back! Here's your business overview." action={(role==="admin"||role==="sales") && <Btn onClick={onNew} icon="+">New Lead</Btn>}/>
      {loading && <div style={{ textAlign:"center",padding:40 }}><Spinner size={32}/></div>}
      {!loading && (
        <>
          <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:20 }}>
            <StatCard label="Total Leads"        value={stats.total}     color="#2563EB" icon="👥"/>
            <StatCard label="Feasibility Queue"  value={stats.feasPend}  color="#d97706" icon="🔍"/>
            <StatCard label="Install Pending"    value={stats.instPend}  color="#7c3aed" icon="🔧"/>
            <StatCard label="Payment Pending"    value={stats.payPend}   color="#dc2626" icon="💳"/>
            <StatCard label="Activated"          value={stats.activated} color="#16a34a" icon="✅" sub={`${stats.total?Math.round((stats.activated/stats.total)*100):0}% conversion`}/>
            {role==="admin" && <StatCard label="Monthly Revenue" value={`₹${((stats.revenue||0)/1000).toFixed(1)}K`} color="#0891b2" icon="₹" sub="From active plans"/>}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
            <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:20 }}>
              <h4 style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:16,borderBottom:`1px solid ${C.border}`,paddingBottom:10 }}>📊 Workflow Pipeline</h4>
              {[
                { label:"New Leads",    count:stats.newLeads,  color:"#2563EB" },
                { label:"Feasibility",  count:stats.feasPend,  color:"#d97706" },
                { label:"Installation", count:stats.instPend,  color:"#7c3aed" },
                { label:"Payment",      count:stats.payPend,   color:"#dc2626" },
                { label:"Activated",    count:stats.activated, color:"#16a34a" },
              ].map(p=>(
                <div key={p.label} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                    <span style={{ fontSize:12,color:C.text,fontWeight:500 }}>{p.label}</span>
                    <span style={{ fontSize:12,fontWeight:700,color:p.color }}>{p.count}</span>
                  </div>
                  <div style={{ background:"#f1f4f9",borderRadius:6,height:7 }}>
                    <div style={{ width:`${stats.total?Math.round(((p.count||0)/stats.total)*100):0}%`,background:p.color,height:"100%",borderRadius:6,transition:"width 0.6s" }}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:20 }}>
              <h4 style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:12,borderBottom:`1px solid ${C.border}`,paddingBottom:10 }}>🕐 Recent Leads</h4>
              {recent.map(lead=>(
                <div key={lead.id} onClick={()=>onOpen(lead)} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:7,cursor:"pointer",marginBottom:2 }} className="table-row">
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{lead.customerName}</div>
                    <div style={{ fontSize:11,color:C.faint }}>{lead.id} · {lead.package?.split("–")[0].trim()}</div>
                  </div>
                  <StatusBadge status={lead.status}/>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Leads Page ────────────────────────────────────────────────────────────────
function LeadsPage({ leads, role, onOpen, onNew, loading }) {
  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterSource,   setFilterSource]   = useState("All");

  const shown = leads.filter(l=>{
    const qs = [l.customerName,l.id,l.mobile,l.address,l.area].join(" ").toLowerCase();
    return (!search||qs.includes(search.toLowerCase())) && (filterStatus==="All"||l.status===filterStatus) && (filterPriority==="All"||l.priority===filterPriority) && (filterSource==="All"||l.leadSource===filterSource);
  });

  return (
    <div>
      <Breadcrumb items={["Home","Leads","All Leads"]}/>
      <PageHeader icon="👥" title="Leads Management" subtitle={`${shown.length} of ${leads.length} leads`} action={(role==="admin"||role==="sales") && <Btn onClick={onNew} icon="+">New Lead</Btn>}/>
      <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",marginBottom:16 }}>
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search by name, ID, mobile…" style={{ ...IS,width:260,flexShrink:0 }}/>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ ...SS,width:200 }}>
            <option value="All">All Statuses</option>
            {Object.keys(STATUS_COLOR).map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} style={{ ...SS,width:140 }}>
            <option value="All">All Priorities</option>
            {PRIORITIES.map(p=><option key={p}>{p}</option>)}
          </select>
          <select value={filterSource} onChange={e=>setFilterSource(e.target.value)} style={{ ...SS,width:160 }}>
            <option value="All">All Sources</option>
            {LEAD_SOURCES.map(s=><option key={s}>{s}</option>)}
          </select>
          <Btn onClick={()=>{ setSearch("");setFilterStatus("All");setFilterPriority("All");setFilterSource("All"); }} variant="ghost" sm>Reset</Btn>
        </div>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginTop:10 }}>
          {["All","New","Feasibility Pending","Installation Pending","Payment Pending","Activated"].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} style={{ padding:"4px 12px",borderRadius:20,fontSize:11,cursor:"pointer",fontWeight:600,border:"1px solid",background:filterStatus===s?C.primary:"#f8fafc",borderColor:filterStatus===s?C.primary:C.border,color:filterStatus===s?"#fff":C.muted,transition:"all 0.15s" }}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign:"center",padding:60 }}><Spinner size={32}/></div> : (
        <Table headers={["Lead ID","Customer","Mobile","Lead Source","Package","Priority","Salesperson","Status","Created","Action"]}>
          {shown.map(lead=>(
            <TR key={lead.id} onClick={()=>onOpen(lead)}>
              <TD bold color={C.primary}>{lead.id}</TD>
              <td style={{ padding:"11px 14px" }}><div style={{ fontSize:13,fontWeight:700,color:C.text }}>{lead.customerName}</div><div style={{ fontSize:11,color:C.faint }}>{lead.area}</div></td>
              <TD mono>{lead.mobile}</TD>
              <TD>{lead.leadSource}</TD>
              <td style={{ padding:"11px 14px",fontSize:12,color:C.muted,maxWidth:160 }}>{lead.package?.split("–")[0].trim()}</td>
              <td style={{ padding:"11px 14px" }}><PriorityBadge p={lead.priority}/></td>
              <TD>{lead.salesperson}</TD>
              <td style={{ padding:"11px 14px" }}><StatusBadge status={lead.status}/></td>
              <TD mono>{lead.createdAt}</TD>
              <td style={{ padding:"11px 14px" }}><Btn sm variant="outline" onClick={e=>{e.stopPropagation();onOpen(lead);}}>View</Btn></td>
            </TR>
          ))}
        </Table>
      )}
    </div>
  );
}

// ── Feasibility Page ──────────────────────────────────────────────────────────
function FeasibilityPage({ leads, onRefresh, onOpen, loading }) {
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState("Feasible");
  const [notes,    setNotes]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const queue = leads.filter(l=>l.status==="New"||l.status==="Feasibility Pending");

  const submit = async ticket => {
    const statusMap = { "Feasible":"Installation Pending","Not Feasible":"Not Feasible","Infrastructure Required":"Infrastructure Required" };
    setSaving(true);
    try {
      await api.updateLead(ticket.id, { feasibility:decision,feasNote:notes,status:statusMap[decision],auditMessage:`Feasibility: ${decision}` });
      setToast({ msg:"Feasibility decision saved",type:"success" });
      onRefresh();
      setSelected(null); setNotes("");
    } catch (err) {
      setToast({ msg:err.message,type:"error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <Breadcrumb items={["Home","Feasibility"]}/>
      <PageHeader icon="🔍" title="Feasibility Assessment" subtitle={`${queue.length} ticket(s) pending technical review`}/>
      {loading ? <div style={{ textAlign:"center",padding:60 }}><Spinner size={32}/></div> : (
        queue.length===0 ? (
          <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:48,textAlign:"center" }}>
            <div style={{ fontSize:40,marginBottom:12 }}>✅</div>
            <div style={{ fontSize:15,fontWeight:700,color:C.text }}>All Clear!</div>
            <p style={{ fontSize:13,color:C.muted,marginTop:6 }}>No pending feasibility checks.</p>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14 }}>
            {queue.map(ticket=>(
              <div key={ticket.id} style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:20 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:700,color:C.text }}>{ticket.customerName}</div>
                    <div style={{ fontSize:11,color:C.primary,fontWeight:600 }}>{ticket.id}</div>
                  </div>
                  <StatusBadge status={ticket.status}/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 14px",marginBottom:12 }}>
                  {[["📍 Area",ticket.area],["📦 Package",ticket.package?.split("–")[0].trim()],["📱 Mobile",ticket.mobile],["🎯 Priority",ticket.priority]].map(([l,v])=>(
                    <div key={l}><div style={{ fontSize:10,color:C.faint }}>{l}</div><div style={{ fontSize:12,fontWeight:600,color:C.text }}>{v}</div></div>
                  ))}
                </div>
                <div style={{ fontSize:11,color:C.muted,background:"#f8fafc",borderRadius:6,padding:"7px 10px",marginBottom:14 }}>{ticket.address}</div>
                <div style={{ display:"flex",gap:8 }}>
                  <Btn sm variant="success" onClick={()=>{setSelected(ticket);setDecision("Feasible");}}>✓ Feasible</Btn>
                  <Btn sm variant="red-o"   onClick={()=>{setSelected(ticket);setDecision("Not Feasible");}}>✗ Not Feasible</Btn>
                  <Btn sm variant="ghost"   onClick={()=>onOpen(ticket)}>Details</Btn>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {selected && (
        <Modal title={`Feasibility Decision — ${selected.id}`} subtitle={selected.customerName} onClose={()=>setSelected(null)}>
          <SectionCard title="Customer Info">
            <div style={{ fontSize:13,color:C.text }}>{selected.address}</div>
            <div style={{ fontSize:12,color:C.muted,marginTop:4 }}>{selected.package} · {selected.area}</div>
          </SectionCard>
          <Field label="Decision" required><CustomSelect value={decision} onChange={setDecision} options={["Feasible","Not Feasible","Infrastructure Required"]} placeholder="Select decision"/></Field>
          <Field label="Technical Notes" required><textarea value={notes} onChange={e=>setNotes(e.target.value)} style={TA} placeholder="Area survey notes, distance from fiber point…"/></Field>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setSelected(null)}>Cancel</Btn>
            <Btn variant={decision==="Feasible"?"success":"danger"} onClick={()=>submit(selected)} disabled={!notes.trim()} loading={saving}>Confirm: {decision}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Installation Page ─────────────────────────────────────────────────────────
function InstallationPage({ leads, onRefresh, onOpen, loading }) {
  const [selected, setSelected] = useState(null);
  const [tech,     setTech]     = useState(TECHNICIANS[0]);
  const [instDate, setInstDate] = useState("");
  const [notes,    setNotes]    = useState("");
  const [instStatus,setInstStatus] = useState("Installed");
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const queue = leads.filter(l=>l.status==="Installation Pending"||l.status==="Installation In Progress");

  const submit = async ticket => {
    const statusMap = { "Installed":"Payment Pending","In Progress":"Installation In Progress","Failed Installation":"Installation Failed" };
    setSaving(true);
    try {
      await api.updateLead(ticket.id, { installation:instStatus,instNote:notes,instTech:tech,instDate:instDate||todayStr(),status:statusMap[instStatus],auditMessage:`Installation: ${instStatus}` });
      setToast({ msg:"Installation updated",type:"success" });
      onRefresh();
      setSelected(null); setNotes(""); setInstDate("");
    } catch (err) {
      setToast({ msg:err.message,type:"error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <Breadcrumb items={["Home","Installation"]}/>
      <PageHeader icon="🔧" title="Installation Management" subtitle={`${queue.length} active installation ticket(s)`}/>
      {loading ? <div style={{ textAlign:"center",padding:60 }}><Spinner size={32}/></div> : (
        <Table headers={["Ticket ID","Customer","Address","Package","Technician","Sched. Date","Status","Action"]}>
          {queue.map(ticket=>(
            <TR key={ticket.id}>
              <TD bold color="#7c3aed">IT-{ticket.id.slice(3)}</TD>
              <td style={{ padding:"11px 14px" }}><div style={{ fontSize:13,fontWeight:700,color:C.text }}>{ticket.customerName}</div><div style={{ fontSize:11,color:C.faint }}>{ticket.mobile}</div></td>
              <TD>{ticket.address?.slice(0,26)}{ticket.address?.length>26?"…":""}</TD>
              <TD>{ticket.package?.split("–")[0].trim()}</TD>
              <TD>{ticket.instTech||"—"}</TD>
              <TD mono>{ticket.instDate||"—"}</TD>
              <td style={{ padding:"11px 14px" }}><StatusBadge status={ticket.status}/></td>
              <td style={{ padding:"11px 14px",display:"flex",gap:6 }}>
                <Btn sm onClick={()=>{setSelected(ticket);setTech(ticket.instTech||TECHNICIANS[0]);}}>Update</Btn>
                <Btn sm variant="ghost" onClick={()=>onOpen(ticket)}>View</Btn>
              </td>
            </TR>
          ))}
        </Table>
      )}
      {selected && (
        <Modal title={`Installation — ${selected.id}`} subtitle={selected.customerName} onClose={()=>setSelected(null)}>
          <SectionCard title="Job Details">
            <InfoRow label="Customer" value={selected.customerName}/><InfoRow label="Address" value={selected.address}/><InfoRow label="Package" value={selected.package?.split("–")[0]}/>
          </SectionCard>
          <Row>
            <Field label="Technician" required half><CustomSelect value={tech} onChange={setTech} options={TECHNICIANS} placeholder="Assign technician"/></Field>
            <Field label="Install Date" half><input type="date" value={instDate} onChange={e=>setInstDate(e.target.value)} style={IS} min={todayStr()}/></Field>
          </Row>
          <Field label="Status" required><CustomSelect value={instStatus} onChange={setInstStatus} options={["Installed","In Progress","Failed Installation"]} placeholder="Result"/></Field>
          <Field label="Field Notes" required><textarea value={notes} onChange={e=>setNotes(e.target.value)} style={TA} placeholder="Equipment used, cables laid, issues faced…"/></Field>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setSelected(null)}>Cancel</Btn>
            <Btn variant="success" onClick={()=>submit(selected)} disabled={!notes.trim()} loading={saving}>Save Installation</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Accounts Page ─────────────────────────────────────────────────────────────
function AccountsPage({ leads, onRefresh, onOpen, loading }) {
  const [selected, setSelected] = useState(null);
  const [payMode,  setPayMode]  = useState("UPI");
  const [txnId,    setTxnId]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const queue = leads.filter(l=>l.status==="Payment Pending"||l.status==="Payment Partial");
  const PAY_MODES = ["UPI","Cash","Bank Transfer","Cheque","Online Portal"];

  const verify = async ticket => {
    if (!txnId.trim()) { setToast({ msg:"TXN ID required",type:"error" }); return; }
    setSaving(true);
    try {
      await api.updateLead(ticket.id, { payment:"Completed",payMode,txnId,status:"Activated",auditMessage:"Payment verified & activated" });
      setToast({ msg:`${ticket.id} activated!`,type:"success" });
      onRefresh();
      setSelected(null); setTxnId("");
    } catch (err) {
      setToast({ msg:err.message,type:"error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <Breadcrumb items={["Home","Accounts"]}/>
      <PageHeader icon="💰" title="Accounts & Payments" subtitle={`${queue.length} payment(s) pending verification`}/>
      {loading ? <div style={{ textAlign:"center",padding:60 }}><Spinner size={32}/></div> : (
        <Table headers={["Lead ID","Customer","Package","Amount","Installation","Status","Action"]}>
          {queue.map(ticket=>(
            <TR key={ticket.id}>
              <TD bold color={C.primary}>{ticket.id}</TD>
              <td style={{ padding:"11px 14px" }}><div style={{ fontSize:13,fontWeight:700,color:C.text }}>{ticket.customerName}</div><div style={{ fontSize:11,color:C.faint }}>{ticket.mobile}</div></td>
              <TD>{ticket.package?.split("–")[0].trim()}</TD>
              <TD bold color={C.orange}>{fmt(ticket.invoiceAmt||0)}</TD>
              <td style={{ padding:"11px 14px" }}><span style={{ fontSize:11,fontWeight:600,color:ticket.installation==="Installed"?C.green:C.orange }}>{ticket.installation}</span></td>
              <td style={{ padding:"11px 14px" }}><StatusBadge status={ticket.status}/></td>
              <td style={{ padding:"11px 14px",display:"flex",gap:6 }}>
                <Btn sm variant="success" onClick={()=>{setSelected(ticket);setTxnId("");}}>Verify</Btn>
                <Btn sm variant="ghost"   onClick={()=>onOpen(ticket)}>View</Btn>
              </td>
            </TR>
          ))}
        </Table>
      )}
      {selected && (
        <Modal title={`Payment Verification — ${selected.id}`} subtitle={selected.customerName} onClose={()=>setSelected(null)}>
          <SectionCard title="Invoice Summary">
            <InfoRow label="Customer"    value={selected.customerName}/>
            <InfoRow label="Package"     value={selected.package?.split("–")[0]}/>
            <InfoRow label="Amount Due"  value={fmt(selected.invoiceAmt||0)} color={C.orange}/>
            <InfoRow label="Installation"value={selected.installation} color={selected.installation==="Installed"?C.green:C.orange}/>
          </SectionCard>
          <Row>
            <Field label="Payment Mode" required half><CustomSelect value={payMode} onChange={setPayMode} options={PAY_MODES} placeholder="Mode"/></Field>
            <Field label="TXN / Reference ID" required half><input value={txnId} onChange={e=>setTxnId(e.target.value)} style={IS} placeholder="UPI ref, NEFT UTR…"/></Field>
          </Row>
          <div style={{ background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"12px 14px",fontSize:12,color:"#15803d",marginBottom:16 }}>
            ✅ Confirming will mark this lead as <strong>Activated</strong> and record payment.
          </div>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setSelected(null)}>Cancel</Btn>
            <Btn variant="success" onClick={()=>verify(selected)} disabled={!txnId.trim()} loading={saving}>Confirm Payment & Activate</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Reports Page ──────────────────────────────────────────────────────────────
function ReportsPage({ leads }) {
  const byStatus = Object.keys(STATUS_COLOR).map(s=>({ label:s,count:leads.filter(l=>l.status===s).length })).filter(s=>s.count>0);
  const bySales  = SALESPEOPLE.map(sp=>({ sp,total:leads.filter(l=>l.salesperson===sp).length,activated:leads.filter(l=>l.salesperson===sp&&l.status==="Activated").length }));
  const byArea   = DEFAULT_AREAS.map(a=>({ area:a,count:leads.filter(l=>l.area===a).length })).filter(a=>a.count>0);

  return (
    <div>
      <Breadcrumb items={["Home","Reports"]}/>
      <PageHeader icon="📊" title="Reports & Analytics" subtitle="Business performance overview"/>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
        <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:20 }}>
          <h4 style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:16 }}>📈 Leads by Status</h4>
          {byStatus.map(s=>(
            <div key={s.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}` }}>
              <StatusBadge status={s.label}/>
              <span style={{ fontWeight:700,color:C.text }}>{s.count}</span>
            </div>
          ))}
        </div>
        <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:20 }}>
          <h4 style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:16 }}>👤 Sales Performance</h4>
          {bySales.map(s=>(
            <div key={s.sp} style={{ padding:"8px 0",borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <span style={{ fontSize:13,fontWeight:600,color:C.text }}>{s.sp}</span>
                <span style={{ fontSize:11,color:C.muted }}>{s.total} leads · {s.activated} activated</span>
              </div>
              <div style={{ background:"#f1f4f9",borderRadius:4,height:5,marginTop:5 }}>
                <div style={{ width:`${s.total?Math.round((s.activated/s.total)*100):0}%`,background:C.green,height:"100%",borderRadius:4 }}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:20 }}>
          <h4 style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:16 }}>🗺️ Leads by Area</h4>
          {byArea.map(a=>(
            <div key={a.area} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:13,color:C.text }}>{a.area}</span>
              <span style={{ fontWeight:700,color:C.primary }}>{a.count}</span>
            </div>
          ))}
        </div>
        <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:20 }}>
          <h4 style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:16 }}>📦 Leads by Priority</h4>
          {PRIORITIES.map(p=>{
            const cnt = leads.filter(l=>l.priority===p).length;
            return (
              <div key={p} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}` }}>
                <PriorityBadge p={p}/>
                <span style={{ fontWeight:700,color:C.text }}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Audit Page ────────────────────────────────────────────────────────────────
function AuditPage() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditLogs({ limit:100 }).then(r=>{ setLogs(r.logs||[]); setLoading(false); }).catch(()=>setLoading(false));
  }, []);

  const ROLE_COLOR = { admin:"#2563EB",sales:"#0891b2",it:"#7c3aed",installation:"#d97706",accounts:"#059669" };

  return (
    <div>
      <Breadcrumb items={["Home","Audit Trail"]}/>
      <PageHeader icon="📋" title="Audit Trail" subtitle="Full activity log across all roles"/>
      {loading ? <div style={{ textAlign:"center",padding:60 }}><Spinner size={32}/></div> : (
        <Table headers={["Timestamp","User","Role","Action","Entity","IP"]}>
          {logs.map(log=>(
            <TR key={log.id}>
              <TD mono>{log.time}</TD>
              <TD bold>{log.user}</TD>
              <td style={{ padding:"11px 14px" }}><span style={{ background:(ROLE_COLOR[log.role]||C.muted)+"20",color:ROLE_COLOR[log.role]||C.muted,padding:"2px 9px",borderRadius:12,fontSize:11,fontWeight:700 }}>{log.role}</span></td>
              <TD>{log.action}</TD>
              <TD bold color={C.primary}>{log.entity||"—"}</TD>
              <TD mono>{log.ip}</TD>
            </TR>
          ))}
        </Table>
      )}
    </div>
  );
}

// ── Users / Settings Page ─────────────────────────────────────────────────────
function UsersPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({ name:"",email:"",role:"sales",password:"Password@123" });
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  const load = () => api.getUsers().then(r=>{ setUsers(r); setLoading(false); }).catch(()=>setLoading(false));
  useEffect(()=>{ load(); },[]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal==="add") await api.createUser(form);
      setToast({ msg:"User saved",type:"success" }); setModal(null); load();
    } catch (err) {
      setToast({ msg:err.message,type:"error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async u => {
    try {
      await api.updateUser(u.id, { status: u.status==="Active"?"Inactive":"Active" });
      load();
    } catch (err) {
      setToast({ msg:err.message,type:"error" });
    }
  };

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <Breadcrumb items={["Home","Settings","Users"]}/>
      <PageHeader icon="⚙️" title="User Management" subtitle="Manage system users and roles" action={<Btn icon="+" onClick={()=>{ setForm({ name:"",email:"",role:"sales",password:"Password@123" }); setModal("add"); }}>Add User</Btn>}/>
      {loading ? <div style={{ textAlign:"center",padding:60 }}><Spinner size={32}/></div> : (
        <Table headers={["ID","Name","Email","Role","Status","Joined","Action"]}>
          {users.map(u=>(
            <TR key={u.id}>
              <TD mono>{u.id}</TD>
              <TD bold>{u.name}</TD>
              <TD mono>{u.email}</TD>
              <td style={{ padding:"11px 14px" }}><span style={{ background:C.primary+"20",color:C.primary,padding:"2px 9px",borderRadius:12,fontSize:11,fontWeight:700 }}>{u.role}</span></td>
              <td style={{ padding:"11px 14px" }}><span style={{ background:u.status==="Active"?"#dcfce7":"#f3f4f6",color:u.status==="Active"?C.green:C.muted,padding:"2px 9px",borderRadius:12,fontSize:11,fontWeight:700 }}>{u.status}</span></td>
              <TD mono>{u.joined}</TD>
              <td style={{ padding:"11px 14px" }}><Btn sm variant="ghost" onClick={()=>toggleStatus(u)}>{u.status==="Active"?"Disable":"Enable"}</Btn></td>
            </TR>
          ))}
        </Table>
      )}
      {modal==="add" && (
        <Modal title="Add User" onClose={()=>setModal(null)}>
          <Field label="Full Name" required><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={IS}/></Field>
          <Field label="Email" required><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={IS}/></Field>
          <Field label="Role" required><CustomSelect value={form.role} onChange={v=>setForm(p=>({...p,role:v}))} options={ROLES_LIST} placeholder="Select role"/></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} style={IS}/></Field>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn onClick={save} loading={saving} disabled={!form.name||!form.email}>Create User</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,         setUser]        = useState(() => {
    // Restore session if token exists
    const token = localStorage.getItem("isp_crm_token");
    const stored = localStorage.getItem("isp_crm_user");
    if (token && stored) { try { return JSON.parse(stored); } catch{} }
    return null;
  });
  const [page,         setPage]        = useState("dashboard");
  const [leads,        setLeads]       = useState([]);
  const [stats,        setStats]       = useState({ total:0,newLeads:0,feasPend:0,instPend:0,payPend:0,activated:0,notFeas:0,revenue:0 });
  const [notifs,       setNotifs]      = useState([]);
  const [showNotif,    setShowNotif]   = useState(false);
  const [modal,        setModal]       = useState(null);
  const [masterOpen,   setMasterOpen]  = useState(false);
  const [loading,      setLoading]     = useState(false);
  const [packages,     setPackages]    = useState(DEFAULT_PACKAGES);
  const [areas,        setAreas]       = useState(DEFAULT_AREAS);
  const [toast,        setToast]       = useState(null);

  const role = user?.role || "sales";

  const showToast = (msg, type="success") => setToast({ msg, type });

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLeads({ limit:200 });
      setLeads(res.leads || []);
    } catch (err) {
      showToast("Failed to load leads: "+err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.getStats();
      setStats(s);
    } catch {}
  }, []);

  const loadNotifs = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifs(data);
    } catch {}
  }, []);

  const loadMeta = useCallback(async () => {
    try {
      const [pkgs, areasData] = await Promise.all([api.getPackages(), api.getAreas()]);
      if (pkgs.length)      setPackages(pkgs.map(p=>p.name));
      if (areasData.length) setAreas(areasData.map(a=>a.name));
    } catch {}
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("isp_crm_user", JSON.stringify(user));
      loadLeads(); loadStats(); loadNotifs(); loadMeta();
    }
  }, [user]);

  const handleLogin = u => setUser(u);
  const handleLogout = () => {
    api.logout();
    localStorage.removeItem("isp_crm_user");
    setUser(null); setLeads([]); setPage("dashboard");
  };

  const NAV_ACCESS = {
    admin:        ["dashboard","leads","feasibility","installation","accounts","reports","audit","users"],
    sales:        ["dashboard","leads"],
    it:           ["dashboard","feasibility"],
    installation: ["dashboard","installation"],
    accounts:     ["dashboard","accounts"],
  };
  const allowed = NAV_ACCESS[role] || ["dashboard"];
  useEffect(() => { if (!allowed.includes(page)) setPage("dashboard"); }, [role]);

  const unread = notifs.filter(n=>!n.read).length;

  const handleLeadUpdated = updated => {
    setLeads(p => p.map(l => l.id===updated.id ? updated : l));
    loadStats();
  };

  const openLead = lead => setModal({ type:"view", id:lead.id });

  if (!user) return <LoginScreen onLogin={handleLogin}/>;

  return (
    <div style={{ display:"flex",height:"100vh",background:C.bg,fontFamily:"'Nunito',sans-serif",overflow:"hidden" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* ── Sidebar ── */}
      <aside style={{ width:240,background:C.sidebar,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto" }}>
        <div style={{ padding:"18px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,background:"rgba(255,255,255,0.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#fff"/></svg>
            </div>
            <div>
              <div style={{ fontSize:13,fontWeight:800,color:"#fff",letterSpacing:"-0.01em" }}>Lead Management</div>
              <div style={{ fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:1 }}>ReliableSoft Technologies</div>
            </div>
          </div>
        </div>

        {/* User info */}
        <div style={{ padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <div style={{ width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff" }}>{user.name[0]}</div>
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:"#fff" }}>{user.name}</div>
              <div style={{ fontSize:10,color:"rgba(255,255,255,0.5)" }}>{ROLES[role]?.label}</div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1,padding:"10px 8px" }}>
          {[
            { id:"dashboard",    icon:"🏠", label:"Dashboard" },
            { id:"leads",        icon:"👥", label:"Leads Management" },
            { id:"feasibility",  icon:"🔍", label:"Feasibility" },
            { id:"installation", icon:"🔧", label:"Installation" },
            { id:"accounts",     icon:"💰", label:"Accounts" },
            { id:"reports",      icon:"📊", label:"Reports" },
            { id:"audit",        icon:"📋", label:"Audit Trail" },
          ].filter(n=>allowed.includes(n.id)).map(n=>(
            <button key={n.id} className="nav-link" onClick={()=>setPage(n.id)} style={{ display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 13px",borderRadius:7,border:"none",cursor:"pointer",background:page===n.id?C.sidebarActive:"transparent",color:page===n.id?"#fff":C.sidebarText,fontSize:13,fontWeight:page===n.id?700:500,marginBottom:2,textAlign:"left",transition:"all 0.15s" }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>{n.label}
            </button>
          ))}
          {allowed.includes("audit") && (
            <div>
              <button className="nav-link" onClick={()=>setMasterOpen(!masterOpen)} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"9px 13px",borderRadius:7,border:"none",cursor:"pointer",background:"transparent",color:C.sidebarText,fontSize:13,fontWeight:500,marginBottom:2,textAlign:"left" }}>
                <span style={{ display:"flex",alignItems:"center",gap:9 }}><span>⚙️</span>Settings</span>
                <span style={{ fontSize:10 }}>{masterOpen?"▲":"▼"}</span>
              </button>
              {masterOpen && (
                <div style={{ paddingLeft:8 }}>
                  <button className="sidebar-sub-link" onClick={()=>setPage("users")} style={{ display:"block",width:"100%",padding:"7px 13px 7px 28px",borderRadius:6,border:"none",cursor:"pointer",background:page==="users"?"rgba(255,255,255,0.1)":"transparent",color:"rgba(191,219,254,0.7)",fontSize:12,marginBottom:1,textAlign:"left",transition:"all 0.15s" }}>User Management</button>
                </div>
              )}
            </div>
          )}
        </nav>

        <div style={{ padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={handleLogout} style={{ width:"100%",padding:"8px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,color:"rgba(255,255,255,0.7)",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center" }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        <header style={{ height:56,background:C.white,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <span style={{ fontSize:14,fontWeight:700,color:C.text }}>ReliableSoft Technologies Pvt. Ltd.</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ position:"relative" }}>
              <button onClick={()=>setShowNotif(!showNotif)} style={{ background:"none",border:"none",cursor:"pointer",position:"relative",fontSize:18,color:C.muted,display:"flex",alignItems:"center" }}>🔔
                {unread>0 && <span style={{ position:"absolute",top:-4,right:-4,background:C.red,borderRadius:"50%",fontSize:9,color:"#fff",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800 }}>{unread}</span>}
              </button>
              {showNotif && (
                <div className="fade-down" style={{ position:"absolute",top:36,right:0,background:C.white,border:`1px solid ${C.border}`,borderRadius:10,width:320,zIndex:200,boxShadow:"0 12px 32px rgba(0,0,0,0.12)" }}>
                  <div style={{ padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between" }}>
                    <span style={{ fontWeight:700,fontSize:13,color:C.text }}>Notifications</span>
                    <button onClick={async()=>{ await api.markAllNotifsRead(); setNotifs(p=>p.map(n=>({...n,read:true}))); }} style={{ fontSize:11,color:C.primary,background:"none",border:"none",cursor:"pointer",fontWeight:700 }}>Mark all read</button>
                  </div>
                  {notifs.slice(0,6).map(n=>{
                    const nc = { info:C.primary,warning:C.orange,error:C.red,success:C.green }[n.type]||C.muted;
                    return (
                      <div key={n.id} style={{ padding:"10px 16px",borderBottom:`1px solid ${C.border}`,background:n.read?"#fff":"#f8faff",display:"flex",gap:10,alignItems:"flex-start" }}>
                        <div style={{ width:7,height:7,borderRadius:"50%",background:nc,marginTop:4,flexShrink:0 }}/>
                        <div>
                          <div style={{ fontSize:12,color:n.read?C.muted:C.text,fontWeight:n.read?400:600 }}>{n.msg}</div>
                          <div style={{ fontSize:10,color:C.faint,marginTop:2 }}>{n.time}</div>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={()=>setShowNotif(false)} style={{ width:"100%",padding:"9px",fontSize:12,color:C.muted,background:"none",border:"none",cursor:"pointer",borderTop:`1px solid ${C.border}` }}>Close</button>
                </div>
              )}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:32,height:32,borderRadius:"50%",background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800 }}>{user.name[0]}</div>
              <span style={{ fontSize:13,fontWeight:700,color:C.text }}>{ROLES[role]?.short}</span>
            </div>
          </div>
        </header>

        <main style={{ flex:1,overflowY:"auto",padding:24 }} className="fade-in" key={page}>
          {page==="dashboard"    && <Dashboard stats={stats} leads={leads} role={role} onOpen={openLead} onNew={()=>setModal({type:"new"})} loading={loading}/>}
          {page==="leads"        && <LeadsPage  leads={leads} role={role} onOpen={openLead} onNew={()=>setModal({type:"new"})} loading={loading}/>}
          {page==="feasibility"  && <FeasibilityPage leads={leads} onRefresh={()=>{ loadLeads();loadStats(); }} onOpen={openLead} loading={loading}/>}
          {page==="installation" && <InstallationPage leads={leads} onRefresh={()=>{ loadLeads();loadStats(); }} onOpen={openLead} loading={loading}/>}
          {page==="accounts"     && <AccountsPage    leads={leads} onRefresh={()=>{ loadLeads();loadStats(); }} onOpen={openLead} loading={loading}/>}
          {page==="reports"      && <ReportsPage leads={leads}/>}
          {page==="audit"        && <AuditPage/>}
          {page==="users"        && <UsersPage/>}
        </main>
      </div>

      {/* Modals */}
      {modal?.type==="new" && (
        <NewLeadModal
          packages={packages} areas={areas}
          onClose={()=>setModal(null)}
          onCreate={lead=>{ setLeads(p=>[lead,...p]); loadStats(); loadNotifs(); }}
        />
      )}
      {modal?.type==="view" && (
        <ViewLeadModal
          leadId={modal.id} role={role}
          packages={packages} areas={areas}
          onClose={()=>setModal(null)}
          onUpdated={handleLeadUpdated}
        />
      )}
    </div>
  );
}
