# AI System Audit

## AI Features

| Feature | Status | Implementation |
| --- | --- | --- |
| Resume extraction | PASS | PyMuPDF in `extraction_service.py` |
| Resume scoring | PASS | deterministic + provider fallback in `evaluation_service.py` and `ai_service.py` |
| Skill gap analysis | PASS | persisted in `ai_scores.matched_skills` / `missing_skills` |
| Candidate ranking | PASS | candidate list and copilot compare tools |
| AssemblyAI voice processing | PASS if key configured | `assemblyai_service.py`; browser fallback exists |
| Adaptive Interview Agent | PASS | `interview_ai_service.py`, `interview_service.py` |
| Recruiter Copilot Agent | PASS | `/agent/ask`, `agent_service.py`, `agent_tools.py` |
| Hiring recommendations | PASS | advisory only |
| Payroll insights | PASS | payroll summary generation |

## Provider Fallback

| Provider | Status |
| --- | --- |
| Gemini | Supported via `AI_GEMINI_KEY` |
| Groq | Supported via `AI_GROQ_KEY`; now env-only |
| Hugging Face Router | Supported via `AI_HF_KEY` |
| AssemblyAI | Supported via `ASSEMBLYAI_API_KEY` |
| NVIDIA | Not implemented/configured in code |
| Deterministic/template fallback | PASS |

## Failure Modes

- If LLM providers fail, deterministic resume scoring remains available.
- If adaptive question LLM fails, fallback questions are generated.
- If AssemblyAI fails, browser speech-recognition fallback/text submission is available.
- If SMTP is missing, shortlist still returns public interview link.

## Agent Safety

- Recruiter Copilot tools are read-only.
- Agent cannot hire, reject, approve payroll, or modify employee data.
- Agent traces are stored in `agent_sessions` and `agent_actions`.
- Interview question traces are stored in `interview_agent_history`.

## Risks

- No formal bias evaluation.
- No rate-limit/backoff framework around external AI providers.
- No NVIDIA provider despite being mentioned in audit scope.
