# MVP Limitations and Future Roadmap

AI Hiring OS is a hackathon-ready MVP for AI-powered recruiting and HRMS operations. It implements the complete hiring-to-HR workflow at demonstration depth, while intentionally avoiding enterprise-only scope such as statutory payroll compliance, bank integrations, distributed event streaming, and formal load testing.

## Gap Classification

| Concern | Real Product Gap? | Hackathon Critical? | Judge Risk | Decision |
|---|---|---:|---:|---|
| Public Candidate Application Portal | Yes, if judges ask how external candidates enter the system | Important | High | Implemented |
| Voice AI Limitation | Yes, compared with realtime voice agents | No | Medium | Explain |
| 5000+ User Scalability | Yes, without load-test proof | No | High | Explain with architecture |
| Real-Time Processing | Yes, no WebSockets/queues yet | No | Medium | Explain |
| Enterprise Payroll Compliance | Yes, for production HR payroll | No | Medium | Explain |

## Candidate Portal

Current implementation:
- Public candidate portal is available at `/careers`, `/jobs/public`, and `/apply`.
- Careers is empty by default unless HR/Admin/Manager publishes an open job. Jobs with an expired open-till date are hidden.
- Candidates can view open jobs, search jobs, inspect job details, and apply.
- Application form collects name, email, phone, resume PDF, LinkedIn URL, and portfolio URL.
- Resume upload reuses the existing Supabase Storage path.
- Candidate record is created in the existing `resumes` table.
- Existing PDF extraction, AI scoring, skill-gap analysis, summary, and recommendation pipeline is triggered.
- Candidate appears automatically in recruiter candidate dashboards under the selected job.

Future improvements:
- Public company-specific careers URLs.
- Candidate email confirmation.
- Candidate status tracking portal.
- Duplicate application detection.

## Voice AI

Current:
- Browser speech recognition captures spoken candidate answers as text.
- AI evaluates the transcript for technical, communication, confidence, and overall scores.
- AI generates interview summaries and recommendations.

Limitation:
- It is not a realtime conversational voice agent with streaming speech-to-speech interaction.

Future:
- Realtime conversational voice AI.
- Voice activity detection.
- Streaming transcription.
- Live interviewer follow-up questions.
- Audio recording consent and retention policy.

## Scalability

Current:
- React/Vite frontend can be served globally through Vercel.
- FastAPI backend uses async request handling.
- PostgreSQL/Supabase provides relational tenant isolation.
- Core tables are scoped by `company_id`.
- List APIs use pagination limits.
- Backend can be containerized and moved behind autoscaling infrastructure.

Limitation:
- The project has not been formally load-tested for 5,000+ concurrent employee logins.

Future:
- Load testing with k6 or Locust.
- Autoscaling backend instances.
- Read replicas for reporting-heavy screens.
- Connection pooling and stricter query monitoring.
- Redis caching for dashboard aggregates.

## Real-Time Processing

Current:
- Resume processing uses FastAPI background tasks.
- Candidate dashboards poll while AI scoring is pending.
- Attendance and payroll data are loaded through API refreshes.

Limitation:
- No WebSockets, durable queues, or event streaming are implemented in the MVP.

Future:
- WebSockets or Server-Sent Events for live scoring updates.
- Durable task queue using Celery, RQ, Cloud Tasks, or SQS.
- Event-driven audit log for HR operations.
- Retry and dead-letter queues for failed AI jobs.

## Payroll

Current:
- Payroll is attendance-driven.
- Supports payroll generation, approval workflow, paid status, employee payroll history, payslip view, and AI payroll summary.

Limitation:
- It is not a statutory payroll engine.
- It does not calculate PF, ESI, professional tax, income tax, TDS, gratuity, or regional compliance.
- It does not integrate with banks or payment rails.

Future:
- Country-specific payroll rules.
- PF/ESI/tax modules.
- Bank payout integrations.
- Payroll audit trails and export formats.
- Finance approval matrix.

## Final MVP Positioning

AI Hiring OS should be presented as a complete hackathon MVP, not as a finished enterprise HRMS. The strongest demo story is:

> A company posts a job, a candidate applies publicly, the resume enters AI screening automatically, HR reviews AI-ranked candidates, runs AI interviews, and then manages employees through attendance, performance, and payroll workflows in the same platform.
