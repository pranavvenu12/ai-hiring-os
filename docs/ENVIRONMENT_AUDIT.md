# Environment Audit

## Local Environment Files

| File | Status |
| --- | --- |
| `backend/.env` | Exists locally; contains sensitive runtime values; not committed |
| `frontend/.env` | Exists locally; points to Render backend |
| `backend/.env.example` | Exists |
| `frontend/.env.example` | Exists |

## Frontend Environment

Local frontend API URL:

```text
https://ai-hiring-os-3rgo.onrender.com
```

Deployed Vercel frontend bundle currently contains:

```text
https://ai-hiring-os.duckdns.org
```

Both live backend URLs currently expose the new agent and adaptive interview routes.

## Backend Environment

Required:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`

Optional AI/email:

- `AI_GEMINI_KEY`
- `AI_GROQ_KEY`
- `AI_HF_KEY`
- `ASSEMBLYAI_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `FRONTEND_BASE_URL`

## Secret Scan

Issue found and fixed:

- Hardcoded `AI_GROQ_KEY` default was removed from `backend/app/core/config.py`.

Remaining expected matches:

- Documentation placeholders.
- Local untracked `.env` files.
- Demo password `123456` inside audit script/report.

## Risks

- Vercel environment should be updated/redeployed to the preferred API URL.
- SMTP is not configured, so email sending is skipped.
- EC2 environment variables could not be inspected without server access.
