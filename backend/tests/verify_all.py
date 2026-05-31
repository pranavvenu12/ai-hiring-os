"""
AI Hiring OS - Complete End-to-End System & Security Runtime Verification
Executes full Hire-to-Retain flow and asserts strict multi-tenant isolation.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import uuid
import httpx
import psycopg2
import os
from supabase import create_client

# Load environment variables manually
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip().strip('"').strip("'")

# Correct AsyncPG connection URL for psycopg2
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    db_url = db_url.replace("%40", "@")
    os.environ["DATABASE_URL"] = db_url

from urllib.parse import urlparse, unquote

def connect_db():
    url_str = os.getenv("DATABASE_URL")
    if url_str.startswith("postgresql+asyncpg://"):
        url_str = url_str.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(url_str)
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path.lstrip("/"),
        user=parsed.username,
        password=unquote(parsed.password) if parsed.password else None
    )

BASE_URL = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000")
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
PWD = os.getenv("TEST_USER_PASSWORD", "TestP@ssw0rd123!")

USERS = {
    "admin": {"email": "v_admin@aihos-test.com", "name": "Verifier Admin", "role": "admin"},
    "hr": {"email": "v_hr@aihos-test.com", "name": "Verifier HR", "role": "hr"},
    "manager": {"email": "v_mgr@aihos-test.com", "name": "Verifier Manager", "role": "manager"},
    "employee": {"email": "v_emp@aihos-test.com", "name": "Verifier Employee", "role": "employee"},
    "tenant_b": {"email": "v_tenantb@aihos-test.com", "name": "Verifier Other Tenant", "role": "hr"}
}

tokens = {}
sb_uids = {}
company_ids = {}
db_user_ids = {}
employee_ids = {}
job_id = None
candidate_id = None
interview_session_id = None

results = []

def record_result(section, test_name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    results.append({
        "section": section,
        "test_name": test_name,
        "status": status,
        "detail": detail
    })
    mark = "[OK]" if passed else "[FAIL]"
    print(f"  {mark} {section} - {test_name} {': ' + detail if detail else ''}")

def setup_users_and_companies():
    print("\n=== SETUP VERIFICATION USERS ===")
    sb = create_client(SB_URL, SB_KEY)
    
    # 1. Create Supabase Auth accounts
    for key, u in USERS.items():
        try:
            res = sb.auth.admin.create_user({"email": u["email"], "password": PWD, "email_confirm": True})
            sb_uids[key] = str(res.user.id)
            print(f"  Auth account created: {u['email']}")
        except Exception:
            for au in sb.auth.admin.list_users():
                if au.email == u["email"]:
                    sb_uids[key] = str(au.id)
                    break
            print(f"  Auth account exists: {u['email']}")

    # 2. Get tokens
    c = httpx.Client(base_url=BASE_URL, timeout=30)
    for key, u in USERS.items():
        r = c.post("/auth/login", json={"email": u["email"], "password": PWD})
        if r.status_code == 200:
            tokens[key] = r.json()["access_token"]
    c.close()

    # 3. Create Companies and link Users in DB
    conn = connect_db()
    conn.autocommit = True
    cur = conn.cursor()
    
    # Clean up previous verifier records if any
    cur.execute("DELETE FROM companies WHERE name IN ('Verifier Co A', 'Verifier Co B')")
    
    # Insert Verifier Co A
    cid_a = str(uuid.uuid4())
    cur.execute("INSERT INTO companies (id, name) VALUES (%s, %s) RETURNING id", (cid_a, "Verifier Co A"))
    company_ids["a"] = str(cur.fetchone()[0])
    
    # Insert Verifier Co B
    cid_b = str(uuid.uuid4())
    cur.execute("INSERT INTO companies (id, name) VALUES (%s, %s) RETURNING id", (cid_b, "Verifier Co B"))
    company_ids["b"] = str(cur.fetchone()[0])

    for key, u in USERS.items():
        co_id = company_ids["b"] if key == "tenant_b" else company_ids["a"]
        uid = sb_uids[key]
        cur.execute("INSERT INTO users (id, email, name, role, company_id, supabase_uid) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (str(uuid.uuid4()), u["email"], u["name"], u["role"], co_id, uid))
        db_user_ids[key] = str(cur.fetchone()[0])

    cur.close()
    conn.close()
    print("=== Setup Complete ===\n")

def run_database_validation():
    print("--- 4. DATABASE VALIDATION ---")
    conn = connect_db()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        tables = [r[0] for r in cur.fetchall()]
        required_tables = ["companies", "users", "employees", "jobs", "resumes", "ai_scores", "attendance_records", "performance_reviews", "interview_sessions"]
        
        all_exist = True
        missing = []
        for t in required_tables:
            if t not in tables:
                all_exist = False
                missing.append(t)
        
        record_result("Database Validation", "All Tables Exist", all_exist, f"Missing: {missing}" if missing else "Validated successfully.")
        
        # Verify FK constraints on attendance_records and performance_reviews
        cur.execute("""
            SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('attendance_records', 'performance_reviews')
        """)
        fks = cur.fetchall()
        record_result("Database Validation", "Foreign Keys Valid", len(fks) >= 2, f"Discovered {len(fks)} key constraints.")
    except Exception as e:
        record_result("Database Validation", "Schema Validation", False, str(e))
    finally:
        cur.close()
        conn.close()

def run_employee_flow():
    global employee_ids
    print("\n--- 5. EMPLOYEE FLOW ---")
    c = httpx.Client(base_url=BASE_URL, timeout=30)
    headers_hr = {"Authorization": f"Bearer {tokens['hr']}"}
    headers_emp = {"Authorization": f"Bearer {tokens['employee']}"}
    headers_mgr = {"Authorization": f"Bearer {tokens['manager']}"}

    try:
        # HR creates employee
        payload = {
            "full_name": "Test Worker",
            "email": USERS["employee"]["email"],
            "phone": "+1234567890",
            "department": "Engineering",
            "designation": "Developer",
            "joining_date": "2026-05-01",
            "employment_type": "full_time",
            "user_id": db_user_ids["employee"]
        }
        r = c.post("/employees", json=payload, headers=headers_hr)
        emp_created = r.status_code == 201
        record_result("Employee Flow", "HR Creates Employee", emp_created, f"HTTP {r.status_code}")
        
        if emp_created:
            employee_ids["employee"] = r.json()["id"]

        # Create Manager Profile
        payload_mgr = {
            "full_name": "Test Manager",
            "email": USERS["manager"]["email"],
            "phone": "+199999999",
            "department": "Engineering",
            "designation": "Engineering Manager",
            "joining_date": "2026-01-01",
            "employment_type": "full_time",
            "user_id": db_user_ids["manager"]
        }
        r_mgr = c.post("/employees", json=payload_mgr, headers=headers_hr)
        if r_mgr.status_code == 201:
            employee_ids["manager"] = r_mgr.json()["id"]
            # Link employee to manager via psycopg2
            conn = connect_db()
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("UPDATE employees SET manager_id=%s WHERE id=%s", (employee_ids["manager"], employee_ids["employee"]))
            cur.close()
            conn.close()

        # Employee views profile
        r = c.get("/employees", headers=headers_emp)
        emp_views = r.status_code == 200 and r.json().get("total") == 1
        record_result("Employee Flow", "Employee Views Profile", emp_views, f"total={r.json().get('total') if r.status_code==200 else 'N/A'}")

        # Manager views team
        r = c.get("/employees", headers=headers_mgr)
        mgr_views = r.status_code == 200 and r.json().get("total", 0) >= 1
        record_result("Employee Flow", "Manager Views Team", mgr_views, f"total={r.json().get('total') if r.status_code==200 else 'N/A'}")
    except Exception as e:
        record_result("Employee Flow", "Error during execution", False, str(e))
    finally:
        c.close()

def run_attendance_flow():
    print("\n--- 6. ATTENDANCE FLOW ---")
    c = httpx.Client(base_url=BASE_URL, timeout=30)
    headers_emp = {"Authorization": f"Bearer {tokens['employee']}"}

    try:
        # Clock In
        r = c.post("/attendance/clock-in", headers=headers_emp)
        clocked_in = r.status_code == 200
        record_result("Attendance Flow", "Employee Clock In", clocked_in, f"HTTP {r.status_code}")

        # Clock Out
        r = c.post("/attendance/clock-out", headers=headers_emp)
        clocked_out = r.status_code == 200
        record_result("Attendance Flow", "Employee Clock Out", clocked_out, f"HTTP {r.status_code}")

        if clocked_out:
            data = r.json()
            hours_calc = "total_hours" in data and data["total_hours"] is not None
            record_result("Attendance Flow", "Hours Calculation", hours_calc, f"Hours: {data.get('total_hours')}")
            
            status_derived = "status" in data and data["status"] in ["present", "half_day", "absent"]
            record_result("Attendance Flow", "Attendance Status Derivation", status_derived, f"Status: {data.get('status')}")
    except Exception as e:
        record_result("Attendance Flow", "Error during execution", False, str(e))
    finally:
        c.close()

def run_performance_flow():
    print("\n--- 7. PERFORMANCE FLOW ---")
    c = httpx.Client(base_url=BASE_URL, timeout=30)
    headers_mgr = {"Authorization": f"Bearer {tokens['manager']}"}
    headers_emp = {"Authorization": f"Bearer {tokens['employee']}"}

    try:
        # Manager submits review
        payload = {
            "employee_id": employee_ids["employee"],
            "rating": 5.0,
            "strengths": "Outstanding runtime stability.",
            "improvements": "Continuous integration speed.",
            "comments": "Excellentペアプロ作業."
        }
        r = c.post("/performance", json=payload, headers=headers_mgr)
        submitted = r.status_code == 201
        record_result("Performance Flow", "Manager Submits Review", submitted, f"HTTP {r.status_code}")

        # Employee retrieves review
        r = c.get("/performance/me", headers=headers_emp)
        retrieved = r.status_code == 200 and len(r.json().get("reviews", [])) >= 1
        record_result("Performance Flow", "Employee Retrieves Review", retrieved, f"HTTP {r.status_code} reviews_count={len(r.json().get('reviews', [])) if r.status_code==200 else '0'}")
    except Exception as e:
        record_result("Performance Flow", "Error during execution", False, str(e))
    finally:
        c.close()

def run_ai_interview_flow():
    global job_id, candidate_id, interview_session_id
    print("\n--- 8. AI INTERVIEW FLOW ---")
    c = httpx.Client(base_url=BASE_URL, timeout=30)
    headers_hr = {"Authorization": f"Bearer {tokens['hr']}"}

    try:
        # Seeding mock Job and Candidate (Resume)
        conn = connect_db()
        conn.autocommit = True
        cur = conn.cursor()
        
        job_id = str(uuid.uuid4())
        cur.execute("INSERT INTO jobs (id, company_id, title, description, created_by) VALUES (%s, %s, %s, %s, %s)",
                    (job_id, company_ids["a"], "Verification Role", "Must build high performance systems. Key skills: FastAPI, PostgreSQL.", db_user_ids["hr"]))
        
        candidate_id = str(uuid.uuid4())
        cur.execute("INSERT INTO resumes (id, job_id, candidate_name, file_url, extracted_text) VALUES (%s, %s, %s, %s, %s)",
                    (candidate_id, job_id, "Candidate Verify", "http://storage.com/pdf", "Verification Candidate resume text. Experienced developer."))
        
        cur.close()
        conn.close()

        # Create session and generate questions
        payload = {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "interview_type": "technical"
        }
        r = c.post("/interviews/start", json=payload, headers=headers_hr)
        started = r.status_code == 201 and "questions" in r.json()
        record_result("AI Interview Flow", "Create Interview Session & Generate Questions", started, f"Questions count={len(r.json().get('questions', [])) if started else 0}")
        
        if started:
            interview_session_id = r.json()["id"]

            # Submit answers to questions
            questions = r.json()["questions"]
            for idx, q in enumerate(questions[:2]):  # submit 2 answers for test
                ans_payload = {
                    "question_index": idx,
                    "answer_text": f"This is dynamic answer verification to question {idx} regarding {q.get('category')} topic."
                }
                c.post(f"/interviews/{interview_session_id}/answer", json=ans_payload, headers=headers_hr)
            
            # Complete interview & generate AI scorecard / summary
            r_comp = c.post(f"/interviews/{interview_session_id}/complete", headers=headers_hr)
            completed = r_comp.status_code == 200
            record_result("AI Interview Flow", "Submit Answers & Complete AI Evaluation", completed, f"Overall Score: {r_comp.json().get('overall_score') if completed else 'N/A'}")
    except Exception as e:
        record_result("AI Interview Flow", "Error during execution", False, str(e))
    finally:
        c.close()

def run_security_validation():
    print("\n--- 9. SECURITY VALIDATION ---")
    c = httpx.Client(base_url=BASE_URL, timeout=30)
    headers_tenant_b = {"Authorization": f"Bearer {tokens['tenant_b']}"}
    headers_emp = {"Authorization": f"Bearer {tokens['employee']}"}

    try:
        # Cross-Tenant Access Check (Tenant B attempts to access Tenant A employee)
        r = c.get(f"/employees/{employee_ids['employee']}", headers=headers_tenant_b)
        isolation_ok = r.status_code == 404  # isolated records should not be found or are rejected with 403/404
        record_result("Security Validation", "Tenant Isolation Enforcement", isolation_ok, f"HTTP {r.status_code} (Expects 404/403)")

        # Role Restrictions Check (Employee attempts to post new review)
        payload = {
            "employee_id": employee_ids["employee"],
            "rating": 5.0,
            "strengths": "Attacking security blocks.",
            "comments": "Succeeding review post."
        }
        r = c.post("/performance", json=payload, headers=headers_emp)
        role_restricted = r.status_code == 403
        record_result("Security Validation", "Role Restrictions Verification", role_restricted, f"HTTP {r.status_code} (Expects 403)")

        # JWT Enforcement (No auth header request is blocked)
        r = c.get("/employees")
        jwt_enforced = r.status_code == 401
        record_result("Security Validation", "JWT Authentication Enforcement", jwt_enforced, f"HTTP {r.status_code} (Expects 401)")
    except Exception as e:
        record_result("Security Validation", "Error during execution", False, str(e))
    finally:
        c.close()

def cleanup_verifier_records():
    print("\n=== CLEANUP VERIFIER RECORDS ===")
    conn = connect_db()
    conn.autocommit = True
    cur = conn.cursor()
    try:
        # Clean up database tables for verifier companies
        cur.execute("DELETE FROM companies WHERE name IN ('Verifier Co A', 'Verifier Co B')")
        print("  Database tables cleaned up successfully.")
    except Exception as e:
        print(f"  Error during DB cleanup: {e}")
    finally:
        cur.close()
        conn.close()

    sb = create_client(SB_URL, SB_KEY)
    for uid in sb_uids.values():
        try:
            sb.auth.admin.delete_user(uid)
            print(f"  Deleted Auth user: {uid}")
        except:
            pass
    print("=== Cleanup Complete ===\n")

if __name__ == "__main__":
    try:
        setup_users_and_companies()
        run_database_validation()
        run_employee_flow()
        run_attendance_flow()
        run_performance_flow()
        run_ai_interview_flow()
        run_security_validation()
    except Exception as e:
        print(f"[FATAL ERROR] {e}")
    finally:
        cleanup_verifier_records()
        
    print("\n" + "=" * 60)
    print("  FINAL RUNTIME SYSTEM VERIFICATION REPORT")
    print("=" * 60)
    passed_cnt = sum(1 for r in results if r["status"] == "PASS")
    failed_cnt = sum(1 for r in results if r["status"] == "FAIL")
    print(f"  Total Verified Tests: {passed_cnt + failed_cnt}")
    print(f"  PASSED: {passed_cnt}")
    print(f"  FAILED: {failed_cnt}")
    print("=" * 60)
    for r in results:
        status_color = "✔" if r["status"] == "PASS" else "✘"
        print(f"  {status_color} {r['section']} - {r['test_name']}: {r['status']} ({r['detail']})")
    print("=" * 60)
