# ISP CRM – Full Stack Setup Guide
## ReliableSoft Technologies

---

## 📁 Project Structure

```
isp-crm-backend/               ← Node.js + Express + PostgreSQL API
├── src/
│   ├── server.js              ← Main Express app
│   ├── db.js                  ← PostgreSQL connection pool
│   ├── middleware/
│   │   └── auth.js            ← JWT authentication & role guard
│   └── routes/
│       ├── auth.js            ← POST /api/auth/login
│       ├── leads.js           ← Full CRUD + comments
│       ├── audit.js           ← GET /api/audit
│       ├── notifications.js   ← GET/PATCH /api/notifications
│       ├── users.js           ← User management (admin only)
│       └── master.js          ← Packages, areas, stats
├── db/
│   ├── migrate.js             ← Creates all PostgreSQL tables
│   └── seed.js                ← Seeds sample data
├── .env.example               ← Environment variable template
└── package.json

isp-crm-frontend/
└── isp-crm-api.jsx            ← Updated React frontend (API-connected)
```

---

## 🗄️ Database Schema

```
users           → System staff (admin, sales, it, installation, accounts)
leads           → Customer enquiries with full workflow tracking
lead_comments   → Per-lead comments/notes (FK → leads)
audit_logs      → All system actions with user/role/IP
notifications   → Real-time alerts per lead event
packages        → ISP plans (master data)
areas           → Service zones (master data)
```

---

## ⚡ Quick Start

### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS (Homebrew)
brew install postgresql && brew services start postgresql

# Create database
psql -U postgres -c "CREATE DATABASE isp_crm;"
```

### 2. Setup Backend
```bash
cd isp-crm-backend
npm install

# Copy and edit environment config
cp .env.example .env
# Edit .env: set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET

# Run migrations (creates all tables)
npm run migrate

# Seed sample data
npm run seed

# Start server
npm start
# → Server running at http://localhost:5000
```

### 3. Setup Frontend
Place `isp-crm-api.jsx` in your React project (Vite/CRA).

```bash
# If using Vite
npm create vite@latest isp-crm-ui -- --template react
cd isp-crm-ui && npm install
# Copy isp-crm-api.jsx → src/App.jsx
npm run dev
```

---

## 🔑 Default Login Credentials

| Email                          | Password       | Role         |
|-------------------------------|----------------|--------------|
| admin@reliablesoft.in         | Password@123   | Admin        |
| rahul@reliablesoft.in         | Password@123   | Sales        |
| sneha@reliablesoft.in         | Password@123   | Sales        |
| it@reliablesoft.in            | Password@123   | IT           |
| manoj@reliablesoft.in         | Password@123   | Installation |
| accounts@reliablesoft.in      | Password@123   | Accounts     |

---

## 🔌 API Reference

### Auth
| Method | Endpoint            | Description           |
|--------|---------------------|-----------------------|
| POST   | /api/auth/login     | Login → JWT token     |
| POST   | /api/auth/logout    | Logout (client-side)  |

### Leads
| Method | Endpoint                        | Access    | Description                |
|--------|---------------------------------|-----------|----------------------------|
| GET    | /api/leads                      | All       | List leads (filter/paginate)|
| GET    | /api/leads/:id                  | All       | Get single lead + comments  |
| POST   | /api/leads                      | admin,sales| Create new lead            |
| PATCH  | /api/leads/:id                  | All       | Update lead fields          |
| DELETE | /api/leads/:id                  | admin     | Delete lead                 |
| POST   | /api/leads/:id/comments         | All       | Add comment                 |

### Other
| Method | Endpoint                        | Access    |
|--------|---------------------------------|-----------|
| GET    | /api/master/stats               | All       |
| GET    | /api/master/packages            | All       |
| GET    | /api/master/areas               | All       |
| GET    | /api/audit                      | admin     |
| GET    | /api/notifications              | All       |
| PATCH  | /api/notifications/read-all     | All       |
| GET    | /api/users                      | admin     |
| POST   | /api/users                      | admin     |
| PATCH  | /api/users/:id                  | admin     |
| DELETE | /api/users/:id                  | admin     |

---

## 🔒 Role-Based Access Control

| Feature              | Admin | Sales | IT  | Install | Accounts |
|----------------------|-------|-------|-----|---------|----------|
| Dashboard            | ✅    | ✅    | ✅  | ✅      | ✅       |
| All Leads            | ✅    | Own   | —   | —       | —        |
| Create Lead          | ✅    | ✅    | —   | —       | —        |
| Feasibility          | ✅    | —     | ✅  | —       | —        |
| Installation         | ✅    | —     | —   | ✅      | —        |
| Accounts/Payments    | ✅    | —     | —   | —       | ✅       |
| Reports              | ✅    | —     | —   | —       | —        |
| Audit Trail          | ✅    | —     | —   | —       | —        |
| User Management      | ✅    | —     | —   | —       | —        |
| Admin Override       | ✅    | —     | —   | —       | —        |

---

## 🌿 Environment Variables (.env)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=isp_crm
DB_USER=postgres
DB_PASSWORD=your_secure_password

PORT=5000
NODE_ENV=development

JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=8h

CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 🚀 Production Deployment

### Backend
```bash
npm install --production
NODE_ENV=production JWT_SECRET=<strong-secret> npm start

# With PM2
pm2 start src/server.js --name isp-crm-api
```

### Frontend
- Update `API_BASE` in `isp-crm-api.jsx` to your production server URL
- Build: `npm run build`
- Deploy `dist/` to Nginx / Vercel / Netlify

### Nginx Reverse Proxy Example
```nginx
server {
  listen 80;
  server_name crm.yourdomain.com;
  
  location /api/ {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
  
  location / {
    root /var/www/isp-crm/dist;
    try_files $uri $uri/ /index.html;
  }
}
```
