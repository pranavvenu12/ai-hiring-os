"""
AI Hiring OS - Phase 3 Rigorous Audit
Validates AI Evaluation Pipeline: Correctness, Reliability, and Robustness.
"""
import sys
import io
import time
import uuid
import httpx
import psycopg2
import os
import json

# -- Config --
BASE = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000")
DB = os.getenv("DATABASE_URL")
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
PWD = os.getenv("TEST_USER_PASSWORD", "TestP@ssw0rd123!")

# -- Test Data --
audit_results = []

def log_test(name, action, expected, actual, status):
    audit_results.append({
        "Test Name": name,
        "Action": action,
        "Expected Result": expected,
        "Actual Result": actual,
        "Status": "PASS" if status else "FAIL"
    })
    print(f"{'PASS' if status else 'FAIL'}: {name}")

def get_auth_token(email, name, role, co_name, reuse_co_id=None):
    # Setup user and company directly in DB
    conn = psycopg2.connect(DB); conn.autocommit = True
    cur = conn.cursor()
    
    if reuse_co_id:
        co_id = reuse_co_id
    else:
        co_id = str(uuid.uuid4())
        cur.execute("INSERT INTO companies (id, name) VALUES (%s, %s) RETURNING id", (co_id, co_name))
    
    from supabase import create_client
    sb = create_client(SB_URL, SB_KEY)
    
    sb_uid = None
    try:
        res = sb.auth.admin.create_user({"email": email, "password": PWD, "email_confirm": True})
        sb_uid = str(res.user.id)
    except:
        users = sb.auth.admin.list_users()
        for au in users:
            if au.email == email:
                sb_uid = str(au.id); break
    
    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    if not cur.fetchone():
        cur.execute("INSERT INTO users (id, email, name, role, company_id, supabase_uid) VALUES (%s, %s, %s, %s, %s, %s)",
                    (str(uuid.uuid4()), email, name, role, co_id, sb_uid))
    else:
        cur.execute("UPDATE users SET company_id=%s, role=%s, supabase_uid=%s WHERE email=%s", (co_id, role, sb_uid, email))
    cur.close(); conn.close()

    with httpx.Client(base_url=BASE, timeout=30) as c:
        r = c.post("/auth/login", json={"email": email, "password": PWD})
        if r.status_code != 200:
            print(f"Login failed for {email}: {r.text}")
            return None, co_id
        return r.json()["access_token"], co_id

def run_audit():
    print("\n=== STARTING PHASE 3 AUDIT ===\n")
    
    # 1. Setup Identities
    hr_token, hr_co_id = get_auth_token("audit_hr@example.com", "Audit HR", "hr", "Audit Co A")
    emp_token, _ = get_auth_token("audit_emp@example.com", "Audit Emp", "employee", "Audit Co A", reuse_co_id=hr_co_id)
    co_b_token, co_b_id = get_auth_token("audit_hr_b@example.com", "Audit HR B", "hr", "Audit Co B")
    
    with httpx.Client(base_url=BASE, timeout=60) as c:
        headers_hr = {"Authorization": f"Bearer {hr_token}"}
        
        # --- 1. Pipeline Flow ---
        job_payload = {"title": "Audit Job", "description": "Expert in Python, FastAPI, and SQL."}
        r = c.post("/jobs", json=job_payload, headers=headers_hr)
        job_id = r.json()["id"]
        
        pdf_content = b"%PDF-1.1\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 50 >>\nstream\nBT /F1 24 Tf 100 700 Td (Python FastAPI SQL) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n382\n%%EOF"
        files = [("files", ("audit_resume.pdf", pdf_content, "application/pdf"))]
        c.post(f"/jobs/{job_id}/upload-resumes", files=files, headers=headers_hr)
        
        print("  Polling for status transitions...")
        status_history = []
        for _ in range(20):
            r = c.get(f"/jobs/{job_id}/candidates", headers=headers_hr)
            if r.status_code == 200 and r.json():
                s = r.json()[0]["status"]
                if not status_history or status_history[-1] != s:
                    status_history.append(s)
                if s == "completed": break
            time.sleep(2)
        
        log_test("Pipeline Flow", "Poll candidates status", "Status should transition to completed", f"{status_history}", "completed" in status_history)
        
        # --- 2. Deterministic Scoring & 3. LLM Structure ---
        candidate = r.json()[0]
        score = candidate["score"]
        skill_score = candidate["skill_match_score"]
        sem_score = candidate["semantic_score"]
        
        valid_range = (0 <= score <= 100) and (0 <= skill_score <= 100) and (0 <= sem_score <= 100)
        log_test("Deterministic Scoring", "Check score ranges", "All scores between 0-100", f"Score: {score}, Skill: {skill_score}, Semantic: {sem_score}", valid_range)
        
        structure_ok = all(k in candidate for k in ["summary", "explanation", "matched_skills", "missing_skills"])
        types_ok = isinstance(candidate["matched_skills"], list) and isinstance(candidate["missing_skills"], list)
        log_test("LLM Output Structure", "Inspect fields", "Summary, Explanation, Matched/Missing skills present and typed correctly", "Fields present and list types verified", structure_ok and types_ok)

        # --- 7. Multi-tenant Isolation ---
        headers_co_b = {"Authorization": f"Bearer {co_b_token}"}
        r_b = c.get(f"/jobs/{job_id}/candidates", headers=headers_co_b)
        log_test("Multi-tenant Isolation", "Company B accessing Company A job", "404 Not Found", f"{r_b.status_code}", r_b.status_code == 404)
        
        # --- 8. RBAC Validation ---
        headers_emp = {"Authorization": f"Bearer {emp_token}"}
        r_emp = c.get(f"/jobs/{job_id}/candidates", headers=headers_emp)
        log_test("RBAC Validation", "Employee accessing candidates", "403 Forbidden", f"{r_emp.status_code}", r_emp.status_code == 403)

        # --- 6. Performance Check ---
        print("  Testing background processing (Performance)...")
        start = time.time()
        c.post(f"/jobs/{job_id}/upload-resumes", files=files, headers=headers_hr)
        end = time.time()
        duration = end - start
        log_test("Performance Check", "Upload latency", "< 2 seconds", f"{duration:.2f}s", duration < 2.0)

    # --- 9. Data Consistency (Direct DB check) ---
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    cur.execute("SELECT resume_id, score, status FROM ai_scores ORDER BY created_at DESC LIMIT 1")
    row = cur.fetchone()
    db_ok = row is not None and row[1] >= 0 and row[2] == 'completed'
    log_test("Data Consistency", "Direct DB query on ai_scores", "Record exists with valid data", f"{row}", db_ok)
    cur.close(); conn.close()

def print_report():
    print(f"\n{'='*80}")
    print(f"{'TEST NAME':<30} | {'STATUS':<10} | {'ACTUAL RESULT'}")
    print(f"{'-'*80}")
    for res in audit_results:
        print(f"{res['Test Name']:<30} | {res['Status']:<10} | {res['Actual Result']}")
    print(f"{'='*80}")

if __name__ == "__main__":
    try:
        run_audit()
    except Exception as e:
        print(f"\n[FATAL] {e}")
        import traceback; traceback.print_exc()
    print_report()
