# AI Hiring OS — Backend

Production-grade multi-tenant FastAPI backend for an AI-powered HR platform.

## 🏗️ Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── core/                # Config, security, settings
│   │   ├── config.py        # Pydantic-settings (.env loader)
│   │   └── security.py      # Role enum + RBAC hierarchy
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── user.py          # User model
│   │   └── company.py       # Company (tenant) model
│   ├── schemas/             # Pydantic request/response schemas
│   │   ├── user.py
│   │   ├── company.py
│   │   └── auth.py
│   ├── api/                 # Route handlers
│   │   ├── deps.py          # Dependency injection (JWT, RBAC)
│   │   └── routes/
│   │       ├── health.py    # GET /health
│   │       ├── auth.py      # POST /auth/login, /auth/register, GET /auth/google
│   │       ├── users.py     # GET /me, GET /users, POST /users
│   │       └── companies.py # GET /companies, POST /companies
│   ├── services/            # Business logic layer
│   │   ├── user_service.py
│   │   └── company_service.py
│   ├── db/                  # Database connection
│   │   ├── session.py       # Async engine + session factory
│   │   └── base.py          # Declarative Base
│   └── auth/                # Authentication logic
│       └── supabase_auth.py # JWT verification, Supabase client
├── requirements.txt
├── .env.example
└── .gitignore
```

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.11+
- A [Supabase](https://supabase.com) project (free tier works)

### 2. Clone & Setup

```bash
cd AI-Hiring-OS/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy template and fill in your values
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT Secret |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection string (use the **URI** format, replace `postgresql://` with `postgresql+asyncpg://`) |

### 4. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will:
- Auto-create database tables on first startup
- Be available at `http://localhost:8000`
- Swagger docs at `http://localhost:8000/docs`
- ReDoc at `http://localhost:8000/redoc`

## 🔌 API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/health` | ❌ | Any | Server health check |
| `GET` | `/` | ❌ | Any | Service info |
| `POST` | `/auth/login` | ❌ | Any | Email + password login |
| `POST` | `/auth/register` | ❌ | Any | Register new user |
| `GET` | `/auth/google` | ❌ | Any | Google OAuth URL |
| `GET` | `/me` | ✅ | Any | Current user profile |
| `GET` | `/users` | ✅ | Any* | List users |
| `POST` | `/users` | ✅ | Admin, HR | Create user |
| `GET` | `/companies` | ✅ | Any* | List companies |
| `POST` | `/companies` | ✅ | Admin | Create company |
| `GET` | `/companies/{id}` | ✅ | Any* | Get company detail |

> \* Admin sees all tenants; other roles see only their own company/users.

## 🔐 Authentication Flow

1. **Register** via `POST /auth/register` (creates Supabase Auth user)
2. **Login** via `POST /auth/login` (returns JWT access token)
3. **Use token** as `Authorization: Bearer <token>` header
4. Backend verifies JWT → resolves DB user → attaches company context

### Google OAuth

1. `GET /auth/google` → returns redirect URL
2. Frontend navigates user to the URL
3. After consent, Supabase redirects back with tokens

## 🔑 Role-Based Access Control

| Role | Level | Permissions |
|------|-------|-------------|
| `employee` | 1 | Limited read access |
| `manager` | 2 | View shortlist + review |
| `hr` | 3 | Hiring + employee management |
| `admin` | 4 | Full system access |

## 🧪 Testing with Postman

### 1. Health Check
```
GET http://localhost:8000/health
```

### 2. Register
```
POST http://localhost:8000/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword123"
}
```

### 3. Login
```
POST http://localhost:8000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword123"
}
```

### 4. Use Token (copy access_token from login response)
```
GET http://localhost:8000/me
Authorization: Bearer <your-access-token>
```

### 5. Create Company (Admin only)
```
POST http://localhost:8000/companies
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Acme Corp"
}
```

## 📋 Phase 2 Roadmap

- [ ] AI resume screening
- [ ] Job posting system
- [ ] Resume upload & parsing
- [ ] Interview scheduling
- [ ] Analytics dashboard
