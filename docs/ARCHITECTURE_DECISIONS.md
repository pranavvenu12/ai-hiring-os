# Architecture Decision Records

## ADR 1: React for Frontend

| Field | Decision |
|---|---|
| Problem | Build role-specific dashboards and interactive workflows quickly |
| Options | React, Angular, Vue, Svelte |
| Decision | React |
| Tradeoffs | Large ecosystem and speed; bundle size and client complexity |
| Long-Term Impact | Can scale with component boundaries and route-level splitting |

## ADR 2: Vite for Build Tooling

| Field | Decision |
|---|---|
| Problem | Need fast local development and production SPA build |
| Options | Vite, Webpack, Parcel, Next.js |
| Decision | Vite |
| Tradeoffs | Very fast SPA workflow; no SSR by default |
| Long-Term Impact | Works well for dashboard app; add lazy loading later |

## ADR 3: FastAPI for Backend

| Field | Decision |
|---|---|
| Problem | Need API-first backend with AI/PDF processing support |
| Options | FastAPI, Django, Flask, Node/Express |
| Decision | FastAPI |
| Tradeoffs | Async and Pydantic benefits; more manual structure than Django |
| Long-Term Impact | Stateless API can scale horizontally |

## ADR 4: Supabase and PostgreSQL

| Field | Decision |
|---|---|
| Problem | Need auth, relational database, and storage quickly |
| Options | Supabase, Firebase, AWS-native stack, Neon/Auth0/S3 |
| Decision | Supabase PostgreSQL/Auth/Storage |
| Tradeoffs | Fast integrated setup; must protect service role keys and configure pooler |
| Long-Term Impact | PostgreSQL fits HRMS reporting and constraints |

## ADR 5: Multi-Tenant Shared Database

| Field | Decision |
|---|---|
| Problem | Support multiple companies in one SaaS product |
| Options | Shared DB with `company_id`, separate schema per tenant, separate DB per tenant |
| Decision | Shared DB with `company_id` isolation |
| Tradeoffs | Efficient and simple; requires strict filters and tests |
| Long-Term Impact | Suitable for MVP and SMB SaaS; large enterprise customers may need stronger isolation options |

## ADR 6: RBAC

| Field | Decision |
|---|---|
| Problem | HRMS actions differ by user type |
| Options | RBAC, ABAC, custom permissions |
| Decision | RBAC with Admin/HR/Manager/Employee |
| Tradeoffs | Simple and explainable; less flexible than ABAC |
| Long-Term Impact | Can evolve into permission claims or policy engine |

## ADR 7: AI Fallback Chain

| Field | Decision |
|---|---|
| Problem | AI providers can fail or rate limit |
| Options | Single provider, multi-provider fallback, no fallback |
| Decision | Gemini -> HuggingFace -> template fallback |
| Tradeoffs | Better reliability; fallback output quality is lower |
| Long-Term Impact | Allows demo continuity and provider flexibility |

## ADR 8: Attendance-Driven Payroll

| Field | Decision |
|---|---|
| Problem | Implement payroll in a way tied to existing HRMS data |
| Options | Manual payroll, attendance-driven payroll, external payroll API |
| Decision | Attendance-driven payroll |
| Tradeoffs | Clear MVP and audit trail; does not cover tax/statutory calculations |
| Long-Term Impact | Can later connect approved records to accounting/payment systems |

## ADR 9: Background Processing

| Field | Decision |
|---|---|
| Problem | Resume extraction and AI evaluation can take longer than a request |
| Options | FastAPI BackgroundTasks, Celery/RQ, external queue |
| Decision | FastAPI BackgroundTasks |
| Tradeoffs | Simple MVP; not durable |
| Long-Term Impact | Replace with queue for production reliability |

## ADR 10: Async APIs

| Field | Decision |
|---|---|
| Problem | Backend performs database, storage, and AI I/O |
| Options | Sync APIs, async APIs |
| Decision | Async FastAPI and async SQLAlchemy |
| Tradeoffs | More careful session handling; better concurrency for I/O workloads |
| Long-Term Impact | Supports horizontal scale and high concurrency better than blocking I/O |

## ADR 11: Why Not Django

Django is strong for admin-heavy monoliths, but the project is an API-first SPA with async AI calls. FastAPI provided a lighter, clearer fit.

## ADR 12: Why Not NodeJS

NodeJS would work, but Python gave better alignment with PyMuPDF, AI workflow scripting, and FastAPI/Pydantic data contracts.

## ADR 13: Why Not Firebase

Firebase is fast for realtime NoSQL apps, but HRMS payroll, employees, attendance, jobs, and candidate scoring are relational. PostgreSQL is a better fit.

## ADR 14: Why Not MongoDB

MongoDB can support SaaS apps, but this domain benefits from relational constraints, joins, and reporting. PostgreSQL reduces data consistency risk.
