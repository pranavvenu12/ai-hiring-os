# AI Hiring OS

AI Hiring OS is a production-grade, multi-tenant Software-as-a-Service (SaaS) platform built for modern enterprise recruitment and Human Resource Management (HRMS). By integrating state-of-the-art Artificial Intelligence (AI) scoring, automated resume parsing, interactive voice/text-based AI interviewers, and granular tenant-isolated employee, attendance, payroll, and performance modules, AI Hiring OS unites recruitment pipelines and internal workforce analytics under a single, highly performant architecture.

---

## 📖 Table of Contents
*   [Overview](#overview)
*   [Key Features](#key-features)
*   [Screenshots & UI Showcase](#screenshots-section)
*   [Architecture Overview](#architecture-overview)
*   [Detailed Documentation Links](#documentation-links)
*   [Installation & Setup](#installation)
*   [Multi-role Access & RBAC](#multi-role-access)
*   [AI & LLM Architecture](#ai-architecture)
*   [Future Roadmap](#future-roadmap)

---

## 🔍 Overview

Modern talent acquisition is fractured, relying on separate tools for job listings, applicant screening, interview coordinating, and employee tracking. AI Hiring OS bridges this gap by offering a singular workspace where candidates transition seamlessly from prospects to employees. 

Backed by a secure, tenant-isolated architecture where all companies, applicants, and employees reside in fully segregated database contexts, the platform enables:
1.  **AI-Powered Sourcing & Screener**: Multi-format resume extraction coupled with semantic matching against target job descriptions.
2.  **Voice-Activated AI Interviewing**: Automatic interview setups where a browser-native voice screen collects candidate responses, generating full transcripts and multi-dimensional reports.
3.  **Comprehensive HRMS Tools**: Employee records, attendance check-ins, payroll generation, payslips, performance scorecards, department trackers, and manager reviews.

---

## ⚡ Key Features

*   **Multi-Tenant Isolation**: Complete row-level database protection using structured tenant keys (`company_id`) that keep all files, listings, and employee profiles segregated.
*   **Role-Based Access Control (RBAC)**: Fine-grained security profiles protecting APIs and user interfaces for **Admin**, **HR**, **Manager**, and **Employee** accounts.
*   **Advanced AI Screening**: Parsing resumes, compiling skills profiles, assessing gap analyses, and scoring semantic alignment with targeted job postings.
*   **AI Interview Assistant**: Live browser voice interface with speech-to-text integration, sequential dynamic question queues, and multi-dimensional (Technical, Communication, Confidence) rating reports.
*   **Intelligent Attendance tracking**: Single click clock-in/out records with smart status determination (Present, Half-Day, Absent) based on logged active hours.
*   **Payroll & Payslips**: Attendance-derived payroll generation with HR approval, paid status tracking, employee payslip history, PDF-ready payslip output, and AI payroll summaries.
*   **Star-Rating Appraisals**: Performance appraisal workflows with manager scorecards and team analytics.
*   **Modern Premium Glassmorphism UI**: Beautifully designed dashboard workspaces built with React, Vite, TailwindCSS, and Framer Motion for premium user interactions.

---

## 📸 Screenshots Section

Below are mockup representations of the core workspaces within AI Hiring OS:

| Dashboard View | Employee Management | AI Interview Interface |
| :--- | :--- | :--- |
| ![HR Dashboard](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80) | ![Employee Grid](https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80) | ![AI Interview Session](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80) |

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    Client[React SPA - Vite + Tailwind] -->|HTTPS Requests + Bearer Token| Gateway[FastAPI API Gateway]
    Gateway -->|JWT Auth & RBAC Checks| SupabaseAuth[Supabase Auth Service]
    Gateway -->|Async SQL Session| DB[(Supabase PostgreSQL Database)]
    Gateway -->|Semantic Analysis & Q&A| AI[LLM Service - Gemini / OpenAI]
    DB -->|Isolated Queries by company_id| DB
```

### Tech Stack Detail
*   **Frontend**: React (18+), Vite, TailwindCSS, React Router, Lucide Icons, Framer Motion
*   **Backend**: FastAPI, SQLAlchemy (Async), Pydantic (v2), Uvicorn
*   **Database**: Supabase PostgreSQL, row-isolated architecture
*   **Auth**: Supabase JWT Auth Verification
*   **AI Integration**: Google Gemini API & OpenAI API integrations with robust schema-fallback structures

---

## 📂 Documentation Links

To explore the detailed design, engineering, and UX blueprints of the system, click on the links below:

*   📄 [**Product Requirements Document (PRD)**](docs/PRD.md): Outlines user personas, stories, requirements, and key performance indicators (KPIs).
*   📄 [**Technical Requirements Document (TRD)**](docs/TRD.md): Contains system designs, security setups, database patterns, and LLM retry fallback flows.
*   📄 [**UI/UX Design Specification**](docs/UI_UX_DESIGN.md): Details colors, responsive structures, typography systems, and interaction tokens.
*   📄 [**Application Flow Architecture**](docs/APP_FLOW.md): Includes visual user journeys and comprehensive system-level flowcharts.
*   📄 [**Backend Database Schema**](docs/BACKEND_SCHEMA.md): Complete data definitions, constraints, indexes, ER diagrams, and endpoint configurations.
*   📄 [**Implementation Plan**](docs/IMPLEMENTATION_PLAN.md): Outlines phased engineering stages, risk mitigations, validation checks, and milestones.

---

## 🛠️ Installation

### Prerequisites
*   Node.js (v18+)
*   Python (v3.10+)
*   PostgreSQL or a Supabase Database account

### Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On Unix/macOS:
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure the environment file (`.env`):
    ```env
    APP_NAME="AI Hiring OS"
    DATABASE_URL="postgresql+asyncpg://postgres:[password]@db.[supabase-project].supabase.co:5432/postgres"
    SUPABASE_URL="https://[project-id].supabase.co"
    SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."
    GEMINI_API_KEY="AIzaSy..."
    OPENAI_API_KEY="sk-..."
    ```
5.  Launch the FastAPI server:
    ```bash
    uvicorn app.main:app --reload
    ```

### Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Configure the environment file (`.env`):
    ```env
    VITE_API_BASE_URL="http://127.0.0.1:8000"
    ```
4.  Run the Vite development server:
    ```bash
    npm run dev
    ```

---

## 🔐 Multi-role Access

AI Hiring OS enforces role-based endpoint validation dynamically. Roles align as follows:

| Role | Navigation & Screens | Permission Scope |
| :--- | :--- | :--- |
| **Admin** / **HR** | Full HR Dashboard, Jobs, Candidates Pool, Employee Directory, Payroll, Settings | Full administrative read/write, start AI interviews, add jobs, add employees, generate/approve/pay payroll. |
| **Manager** | Manager Dashboard, Candidates, Employees, Team Reviews, Attendance, Payroll | Reads candidates, views read-only payroll summaries, manages team attendance, logs appraisal scorecards for direct reports. |
| **Employee** | Employee Portal, Clock In/Out, Payroll, Performance Scorecard, Settings | Clock-in, profile update, personal attendance logs, own payslips, view personal reviews. |

---

## 🧠 AI Architecture

1.  **Semantic Match Engine**: Evaluates applicant CV structures against targeted job listings utilizing custom prompt templates to return consistent JSON matching tables.
2.  **Adaptive AI Interviewer**: Generates customized Q&A tracks derived from applicant resumes and the target JD. The system feeds questions dynamically, registers transcription responses, and evaluates answers to compute structured scorecard records.
3.  **Graceful Fallback**: If LLM API limits are reached, the system falls back onto pre-compiled parsing templates, ensuring recruitment pipelines remain accessible.

---

## 🗺️ Future Roadmap

- [ ] **Automated PDF parsing with OCR** to bypass formatting limits of scans.
- [ ] **AI-driven career advice chatbot** for candidates.
- [ ] **Slack & Teams calendar integration** for interview coordination.
- [ ] **Interactive candidate comparative analytics tool** for managers.
- [x] **Attendance-linked payroll generation and employee payslips**.
- [ ] **External HR payroll payment integrations**.

---

## 👥 Contributors

*   **Pranav** - Lead Full Stack Architect & Project Owner
*   **Antigravity** - Intelligent Coding Assistant (Google DeepMind Team)
