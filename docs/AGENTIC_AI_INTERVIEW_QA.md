# Agentic AI Interview Q&A

## 50 Agentic AI Questions

1. Q: What makes this project agentic? A: The copilot chooses read-only tools, fetches live tenant data, reasons over results, and recommends actions.
2. Q: Is it fully autonomous? A: No. It is intentionally human-controlled.
3. Q: Can the agent hire someone? A: No. It can only recommend and explain.
4. Q: Can the agent reject candidates? A: No. Rejection remains a human decision.
5. Q: Why avoid CrewAI? A: The workflow is small, controlled, and safer with a simple custom tool registry.
6. Q: Why avoid LangGraph? A: A graph runtime would add complexity beyond the MVP need.
7. Q: Why avoid AutoGen? A: Multi-agent conversation is unnecessary for a read-only HR assistant.
8. Q: What are the agent tools? A: Jobs, candidates, profiles, comparisons, shortlist recommendations, interviews, employees, and payroll summaries.
9. Q: Are tools read-only? A: Yes. They do not mutate hiring, payroll, or employee records.
10. Q: How does the agent choose tools? A: It plans from the user message intent and runs the matching registry tools.
11. Q: Where are traces stored? A: `agent_sessions`, `agent_actions`, and `interview_agent_history`.
12. Q: Why store traces? A: For auditability, demos, and explainability.
13. Q: What is the main safety guard? A: Human approval is required for all final decisions.
14. Q: How is tenant isolation enforced? A: Every tool query filters by `company_id`.
15. Q: Who can use the copilot? A: Admin, HR, and manager roles.
16. Q: What does `/agent/ask` return? A: Answer, tools used, and suggested actions.
17. Q: Does the agent use memory? A: No. Memory was intentionally excluded.
18. Q: Why no memory? A: It reduces privacy, complexity, and audit risk.
19. Q: What is the best demo query? A: “Show me top candidates.”
20. Q: What shows explainability? A: The UI displays `tools_used` and the backend stores action traces.
21. Q: How does candidate ranking work? A: It combines resume score and interview score where available.
22. Q: What happens without interview scores? A: Resume score and skill gaps drive the recommendation.
23. Q: What is manual review? A: A bucket for low scores or broad skill gaps.
24. Q: Can the agent schedule interviews? A: It suggests scheduling; humans execute the action.
25. Q: What is adaptive interviewing? A: The next question depends on prior answers, gaps, resume, and metrics.
26. Q: Why is adaptive better than fixed questions? A: It probes weaknesses and projects more realistically.
27. Q: Does the interview agent use AssemblyAI? A: It reuses stored voice metrics from the existing AssemblyAI flow.
28. Q: What metrics affect interviews? A: Communication, confidence, fluency, speaking pace, and transcript quality.
29. Q: What is project deep dive? A: Questions about resume projects, architecture, challenges, and scalability.
30. Q: What question types exist? A: Technical, behavioral, problem solving, project deep dive, and leadership.
31. Q: Can adaptive questions go off-topic? A: The prompt constrains them to job, resume, gaps, and transcript.
32. Q: Is the recommendation final? A: No. It is advisory.
33. Q: What are final outcomes? A: Strong Hire, Hire, Consider, Reject as recommendations.
34. Q: How do you handle AI failure? A: Provider fallback and template fallback keep the flow working.
35. Q: Does the agent train a model? A: No. It uses existing provider APIs and deterministic tooling.
36. Q: What makes it easy to judge? A: Visible tool calls, question reasoning, and audit tables.
37. Q: What is the biggest agentic risk? A: Users over-trusting recommendations.
38. Q: How is over-trust reduced? A: UI and responses state that human approval is required.
39. Q: Can tools leak tenant data? A: They are scoped by company ID.
40. Q: Can candidates see recruiter data? A: Public interview routes only expose session-specific interview data.
41. Q: Is this a chatbot? A: It is more than a chatbot because it calls tools and reasons over live data.
42. Q: Is this RAG? A: Not traditional vector RAG; it uses structured database tools.
43. Q: Why structured tools instead of vector search? A: Hiring data is relational and already available through services.
44. Q: Can the agent approve payroll? A: No. Payroll tool is summary-only.
45. Q: Can the agent modify employees? A: No. Employee tool is summary-only.
46. Q: How are actions suggested? A: The response includes `suggested_actions` for UI display.
47. Q: How do WebSockets help? A: They show agent started, tool called, completed, and next-question events.
48. Q: What is the MVP agent boundary? A: Read, reason, recommend, and explain.
49. Q: What would production add? A: durable queues, stricter audit dashboards, calibrated models, and bias testing.
50. Q: Final one-line pitch? A: It is safe agentic AI for hiring, not autonomous hiring.

## 50 Architecture Questions

1. Q: What is the backend framework? A: FastAPI.
2. Q: What is the frontend framework? A: React with Vite.
3. Q: What database is used? A: PostgreSQL through SQLAlchemy async.
4. Q: Where is the agent route? A: `backend/app/api/routes/agent.py`.
5. Q: Where is planning implemented? A: `backend/app/services/agent_service.py`.
6. Q: Where are tools implemented? A: `backend/app/services/agent_tools.py`.
7. Q: Where is adaptive question logic? A: `interview_service.py` and `interview_ai_service.py`.
8. Q: How are tables created? A: Existing startup uses `Base.metadata.create_all`.
9. Q: What tables were added? A: `agent_sessions`, `agent_actions`, and `interview_agent_history`.
10. Q: Why JSONB? A: Tool outputs and metrics are flexible structured data.
11. Q: How is RBAC enforced? A: FastAPI dependencies with role guards.
12. Q: How is auth resolved? A: JWT is verified and mapped to application user.
13. Q: What is the tenant boundary? A: `company_id`.
14. Q: How does the copilot send live updates? A: `realtime_service.publish_event`.
15. Q: What events were added? A: `agent_started`, `agent_tool_called`, `agent_completed`, `next_question_generated`.
16. Q: What is the frontend copilot file? A: `frontend/src/components/RecruiterCopilot.jsx`.
17. Q: Where is it mounted? A: HR and manager dashboards.
18. Q: Is the agent available to employees? A: No.
19. Q: Is the public interview authenticated? A: No, but it is scoped to a session ID.
20. Q: How many adaptive questions are used? A: Five by default.
21. Q: Where are questions stored? A: `interview_sessions.questions`.
22. Q: Where are answers stored? A: `interview_sessions.transcript`.
23. Q: Where are voice metrics stored? A: `interview_sessions.interview_metrics`.
24. Q: How is final score stored? A: Existing interview score columns and `final_agent_report`.
25. Q: How are resume scores stored? A: `ai_scores`.
26. Q: How are candidate lists built? A: Jobs join resumes and AI scores.
27. Q: Why not add a new queue? A: Scope control; existing background pattern is reused.
28. Q: Why not use vector DB? A: Current data is structured and relational.
29. Q: What provider fallback exists? A: Gemini, Groq, Hugging Face, then templates.
30. Q: How does frontend call APIs? A: Axios wrapper in `frontend/src/services/api.js`.
31. Q: What is the build command? A: `npm run build`.
32. Q: What is the backend validation command? A: `python -m compileall backend/app`.
33. Q: What is the lint command? A: `npm run lint`.
34. Q: How does candidate drawer show insights? A: It uses score, gaps, status, and interview readiness.
35. Q: What is the largest backend change? A: Agent service plus adaptive interview generation.
36. Q: What is the largest frontend change? A: Floating copilot and adaptive question UX.
37. Q: How are tool calls audited? A: Each call creates an `AgentAction`.
38. Q: How are agent sessions audited? A: Each user prompt creates an `AgentSession`.
39. Q: How are interview questions audited? A: `InterviewAgentHistory` records reasoning and focus.
40. Q: Is the system horizontally scalable? A: Mostly, but durable worker queues would be the next step.
41. Q: What is the main latency source? A: External AI and AssemblyAI calls.
42. Q: What is deterministic? A: Tool queries, ranking formula, and fallback questions.
43. Q: What is probabilistic? A: LLM-generated questions and summaries.
44. Q: How does the app avoid destructive agent actions? A: No write tools are exposed.
45. Q: How are suggested actions represented? A: As JSON objects in the response.
46. Q: What protects payroll? A: The payroll tool returns summary only.
47. Q: What protects employee data? A: Employee tool returns aggregate stats only.
48. Q: What protects candidate status? A: No agent tool updates status.
49. Q: What would a production migration add? A: Alembic migration files for the new tables.
50. Q: Architecture one-liner? A: FastAPI tool-calling agent over tenant-scoped HR data with React demo surfaces.

## 50 HR-Tech Questions

1. Q: What HR problem does this solve? A: It reduces recruiter time spent manually ranking and triaging candidates.
2. Q: Is it an ATS? A: It includes ATS-like recruiting plus HRMS modules.
3. Q: What is the recruiter benefit? A: Faster shortlist preparation and clearer explanations.
4. Q: What is the manager benefit? A: Easier review of top candidates and team context.
5. Q: What is the candidate benefit? A: More relevant adaptive interviews.
6. Q: Does it replace recruiters? A: No. It supports recruiters.
7. Q: Why keep humans in the loop? A: Hiring decisions carry fairness, compliance, and business risk.
8. Q: What is skill gap analysis? A: Comparing job requirements against resume evidence.
9. Q: How does ranking help HR? A: It prioritizes review while preserving recruiter judgment.
10. Q: How are weak candidates handled? A: The agent flags them for manual review, not rejection.
11. Q: How does adaptive interview improve signal? A: It follows up on unclear answers and role-specific gaps.
12. Q: Why include project deep dives? A: Real interviews test ownership, architecture, and practical experience.
13. Q: What makes the voice feature useful? A: It adds communication and confidence signals.
14. Q: Is voice score enough to reject? A: No. It is only one advisory signal.
15. Q: What is the payroll AI role? A: Read-only summaries and insights.
16. Q: Can payroll AI make payments? A: No.
17. Q: Can HR audit recommendations? A: Yes, traces are persisted.
18. Q: What compliance concern remains? A: Bias testing and legal payroll compliance are production work.
19. Q: How do you explain fairness? A: AI is advisory, transparent, and paired with human review.
20. Q: How do you prevent black-box hiring? A: Display tool calls, score components, gaps, and reasoning.
21. Q: What is the best judge demo? A: Ask copilot for top candidates, then run adaptive interview.
22. Q: What is the strongest HR feature? A: End-to-end candidate flow from application to interview scorecard.
23. Q: What is the weakest production area? A: Durable background processing and model calibration.
24. Q: Can this support small companies? A: Yes, the workflow is lightweight.
25. Q: Can this support enterprises? A: The architecture can evolve, but compliance work remains.
26. Q: How is employee data used? A: Aggregated for HR operational summaries.
27. Q: How is attendance used? A: HR stats and payroll workflows.
28. Q: How is performance used? A: Manager and HR analytics.
29. Q: How does this help hiring managers? A: It highlights high-potential candidates and interview evidence.
30. Q: What is interview readiness? A: Whether candidate evidence is strong enough to proceed.
31. Q: What is risk analysis? A: Skill gaps or weak signals needing human review.
32. Q: What is suggested next action? A: A non-binding recommendation such as schedule interview or review gaps.
33. Q: How does the agent handle missing data? A: It says data is unavailable or recommends manual review.
34. Q: What is a manual-review candidate? A: Someone with low scores, broad gaps, or incomplete evidence.
35. Q: Does the app send emails? A: Not in this phase; links can be copied and shared.
36. Q: Does the app integrate job boards? A: Not yet.
37. Q: Does the app train on company data? A: No model training is implemented.
38. Q: What protects candidate privacy? A: Tenant scoping and no long-term agent memory.
39. Q: What protects against accidental decisions? A: No write tools exist for final decisions.
40. Q: What is the HR dashboard value? A: It combines hiring, employees, attendance, interviews, and payroll.
41. Q: What is the manager dashboard value? A: Candidate approval context plus team metrics.
42. Q: What is the candidate portal value? A: Applicants can enter the pipeline without internal HR upload.
43. Q: Why is this hackathon-ready? A: It is demonstrable, scoped, and explainable.
44. Q: What is the expected judge impact? A: Strong differentiation because AI is now workflow-aware, not only scoring.
45. Q: What is the business impact? A: Faster screening and better interview consistency.
46. Q: What is the risk of AI in HR? A: Bias, over-reliance, and lack of explainability.
47. Q: How does this mitigate risk? A: Advisory AI, traces, score explanations, and human approval.
48. Q: What should be added before production? A: bias testing, audit dashboards, consent flows, legal review, and queues.
49. Q: What is the HR-tech one-liner? A: AI Hiring OS is a human-controlled agentic hiring copilot plus HRMS.
50. Q: Final judge answer? A: The project uses agentic AI to recommend and adapt, while humans own decisions.
