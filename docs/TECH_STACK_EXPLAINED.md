# Tech Stack Explained

This document explains every major technology actually used in AI Hiring OS and prepares the owner for technical interviews.

## React

| Topic | Details |
|---|---|
| What it is | A JavaScript library for building component-based user interfaces |
| Why chosen | Fast SPA development, reusable pages/components, strong ecosystem |
| Alternatives | Angular, Vue, Svelte |
| Why not alternatives | Angular is heavier for this prototype; Vue/Svelte are strong but React has broader hiring/interview familiarity |
| Benefits | Reusable components, hooks, ecosystem, routing support |
| Drawbacks | Client-side complexity, bundle size, state management discipline needed |
| Scalability | Scales well with component boundaries, lazy loading, and clear data fetching patterns |

Common question: Why React?

Answer: React gave the project a fast way to build role-specific dashboards, forms, tables, and interactive interview/payroll screens with a familiar component model and broad ecosystem support.

Advanced question: What would you improve?

Answer: Add route-level lazy loading and split heavy dashboard modules to reduce the Vite bundle warning.

CTO-level question: Is React enough for enterprise HRMS?

Answer: Yes for the client tier. Enterprise readiness depends more on architecture, accessibility, testing, observability, and backend security than on React alone.

## Vite

| Topic | Details |
|---|---|
| What it is | Modern frontend build tool and dev server |
| Why chosen | Fast local dev, simple React setup, production bundling |
| Alternatives | Webpack, Parcel, Next.js |
| Why not alternatives | Webpack requires more config; Parcel is less common; Next.js SSR is not needed for this SPA |
| Benefits | Fast HMR, clean config, Vercel compatibility |
| Drawbacks | SPA SEO limitations, bundle splitting must be managed manually |

Interview answer: Vite is ideal here because the product is dashboard-heavy and does not require server-rendered pages.

## Tailwind CSS

| Topic | Details |
|---|---|
| What it is | Utility-first CSS framework |
| Why chosen | Fast consistent styling and responsive utilities |
| Alternatives | CSS Modules, Bootstrap, MUI, Chakra |
| Why not alternatives | Bootstrap/MUI would impose a stronger visual identity; Tailwind allowed the custom Apple-inspired theme |
| Benefits | Speed, consistency, responsive classes |
| Drawbacks | Long class strings, no formal component system by default |

Interview answer: Tailwind helps build dense HR dashboards without maintaining large CSS files.

## FastAPI

| Topic | Details |
|---|---|
| What it is | Python async web API framework |
| Why chosen | Async support, Pydantic validation, automatic docs, Python AI ecosystem |
| Alternatives | Django, Flask, Node/Express |
| Why not alternatives | Django is heavier for API-only; Flask lacks native structure; Node is strong but Python aligns with AI/PDF processing |
| Benefits | Fast development, type hints, OpenAPI, async I/O |
| Drawbacks | Requires discipline around migrations, background work, and dependency management |
| Scalability | Stateless FastAPI workers can scale horizontally behind a load balancer |

Common question: Why FastAPI instead of Django?

Answer: This product is API-first with async AI/database calls. FastAPI fits better than a full MVC framework.

## SQLAlchemy Async

| Topic | Details |
|---|---|
| What it is | Python ORM with async database support |
| Why chosen | Typed models, relationships, async PostgreSQL access |
| Alternatives | Django ORM, Prisma, raw SQL |
| Why not alternatives | Django ORM ties to Django; Prisma is not native Python; raw SQL increases boilerplate |
| Benefits | Clear model layer, composable queries, relationships |
| Drawbacks | Async ORM requires careful session handling |

Interview answer: SQLAlchemy keeps domain models explicit while supporting async FastAPI request handling.

## Supabase

| Topic | Details |
|---|---|
| What it is | Backend platform providing PostgreSQL, Auth, Storage, and APIs |
| Why chosen | Fast setup for database, authentication, and file storage |
| Alternatives | Firebase, AWS Cognito/S3/RDS, Neon + Auth0 |
| Why not alternatives | Firebase is NoSQL-first; AWS stack adds setup complexity; Neon/Auth0 splits vendors |
| Benefits | PostgreSQL, Auth, Storage in one platform |
| Drawbacks | Connection pooler configuration matters; service keys must be protected |

## PostgreSQL

| Topic | Details |
|---|---|
| What it is | Relational database |
| Why chosen | HRMS data is relational: companies, users, employees, jobs, resumes, payroll |
| Alternatives | MongoDB, Firebase Firestore, MySQL |
| Why not alternatives | MongoDB/Firestore are less natural for relational reporting; MySQL is viable but Supabase provides PostgreSQL |
| Benefits | ACID, joins, indexes, constraints |
| Drawbacks | Requires schema/migration management |

CTO question: Why not MongoDB?

Answer: The domain has strong relationships and reporting needs. PostgreSQL handles tenant filtering, joins, and payroll constraints better.

## JWT

| Topic | Details |
|---|---|
| What it is | Signed token carrying authentication claims |
| Why chosen | Supabase Auth issues JWTs; backend can verify and resolve current user |
| Benefits | Stateless API auth |
| Drawbacks | Token storage in localStorage has XSS risk; rotation/session hardening is needed |

## RBAC

| Topic | Details |
|---|---|
| What it is | Role-based access control |
| Roles | Admin, HR, Manager, Employee |
| Why chosen | HRMS workflows differ clearly by role |
| Benefits | Simple, explainable permissions |
| Drawbacks | May need attribute-based permissions for larger enterprises |

## Multi-Tenant Architecture

| Topic | Details |
|---|---|
| What it is | Multiple companies share one app/database with logical isolation |
| Why chosen | SaaS model |
| Implementation | `company_id` on major tables and service-level filters |
| Benefits | Efficient shared infrastructure |
| Drawbacks | Requires strict query discipline and tests |

CTO question: How do you prevent cross-tenant leakage?

Answer: The backend resolves `company_id` from the authenticated user and applies it to queries; routes also validate parent ownership before returning child data.

## Gemini, HuggingFace, and AI Fallback Chain

| Topic | Details |
|---|---|
| Gemini | Primary AI provider when key is configured |
| HuggingFace Router | Secondary provider when HF key is configured |
| Template fallback | Deterministic fallback for demo reliability |
| Why chosen | Keeps AI features working even when a provider fails |
| Drawback | Fallback quality is lower than LLM output |

## Speech Recognition

| Topic | Details |
|---|---|
| What it is | Browser `SpeechRecognition`/`webkitSpeechRecognition` |
| Used in | AI Interview page |
| Benefits | No backend audio infrastructure needed |
| Drawbacks | Browser support varies; not a production-grade voice model |

## PDF Generation

| Topic | Details |
|---|---|
| Current implementation | Payroll payslip opens printable HTML and calls browser print |
| Benefit | No extra dependency or backend renderer |
| Drawback | It is print/save-as-PDF, not direct server-side PDF generation |

## Docker, EC2, Render, Vercel, GitHub

| Technology | Current Role |
|---|---|
| Docker | Backend container on EC2 via `docker-compose.aws.yml` |
| EC2 | Always-on backend hosting path |
| Render | Legacy backend deployment config retained |
| Vercel | Frontend deployment config |
| GitHub | Source control and deployment source |

Deployment interview answer: The active production direction is Vercel for static frontend and EC2 Docker for the always-on FastAPI backend. Supabase remains the managed database/auth/storage layer.
# Enterprise Upgrade Notes

- AssemblyAI is used for recorded voice interview transcription and speech analytics.
- FastAPI WebSockets provide tenant-scoped realtime updates without replacing REST APIs.
- Locust is included for reproducible concurrency validation.
- Payroll uses persisted salary components instead of only attendance-adjusted base salary.
