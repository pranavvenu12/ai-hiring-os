# Deployment Guide

AI Hiring OS is a two-service app:

- `frontend/`: Vite React static app.
- `backend/`: FastAPI API that requires Supabase and PostgreSQL-compatible connection settings.

## Required Backend Environment

Set these on the backend host:

- `APP_ENV=production`
- `DEBUG=false`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `AI_GEMINI_KEY` or `AI_HF_KEY` when AI scoring is enabled

Use the Supabase pooled database URL when deploying from hosts that do not support direct IPv6 database connections.

## Required Frontend Environment

Set this during the frontend build:

- `VITE_API_BASE_URL=https://<backend-domain>`

## Recommended Azure Setup

Use Azure Static Web Apps for `frontend/` and Azure App Service for Containers for `backend/`.

Frontend:

- App location: `frontend`
- Build command: `npm ci && npm run build`
- Output location: `dist`

Backend:

- Build and push `backend/Dockerfile` to Azure Container Registry.
- Deploy that image to Azure App Service for Containers.
- Add the backend environment variables as App Service application settings.
- Set `CORS_ORIGINS` to the deployed Static Web Apps URL.

## Recommended AWS Setup

Use AWS Amplify Hosting for `frontend/` and AWS App Runner for `backend/`.

Frontend:

- App root: `frontend`
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Add `VITE_API_BASE_URL` in Amplify environment variables.

Backend:

- Build `backend/Dockerfile` and push the image to Amazon ECR.
- Create an AWS App Runner service from that ECR image.
- Add the backend environment variables in App Runner. Store secrets in AWS Secrets Manager where possible.
- Set `CORS_ORIGINS` to the deployed Amplify URL.

## Current Recommendation

For this app, AWS App Runner plus Amplify is the lowest-ops AWS path. On Azure, Static Web Apps plus App Service for Containers is similarly straightforward. Since the repo already has Vercel/Render config, the least migration work remains Vercel for frontend and Render for backend, but Azure/AWS are ready through the Dockerfile above.
