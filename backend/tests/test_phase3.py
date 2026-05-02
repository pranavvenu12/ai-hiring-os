"""
AI Hiring OS - Phase 3 Audit Test
Validates AI Evaluation Pipeline: Deterministic Scoring + LLM Insights.
"""
import sys
import io
import time
import uuid
import httpx
import psycopg2
import os

# -- Config --
BASE = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000")
DB = os.getenv("DATABASE_URL")
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
PWD = os.getenv("TEST_USER_PASSWORD", "TestP@ssw0rd123!")

USERS = {
    "hr": {"email": "phase3_hr@example.com", "name": "Phase3 HR", "role": "hr"},
}

results = []
tokens = {}
test_data = {}

def log(name, action, expected, actual, ok):
    s = "PASS" if ok else "FAIL"
    results.append({"name": name, "action": action, "expected": expected, "actual": actual, "status": s})
    mark = "[OK]" if ok else "[FAIL]"
    print(f"  {mark} {name}")
    if not ok:
        print(f"       Expected: {expected}")
        print(f"       Actual:   {actual}")

def setup():
    print("\n=== SETUP PHASE 3 ===\n")
    # 1. Create company and user directly in DB for speed
    conn = psycopg2.connect(DB); conn.autocommit = True
    cur = conn.cursor()
    
    # Company
    co_id = str(uuid.uuid4())
    cur.execute("INSERT INTO companies (id, name) VALUES (%s, %s) RETURNING id", (co_id, "Phase 3 Test Co"))
    test_data["co_id"] = co_id
    
    u = USERS["hr"]
    from supabase import create_client
    sb = create_client(SB_URL, SB_KEY)
    sb_uid = None
    try:
        res = sb.auth.admin.create_user({"email": u["email"], "password": PWD, "email_confirm": True})
        sb_uid = str(res.user.id)
        print(f"  [OK] Auth user created: {sb_uid}")
    except Exception as e:
        # If exists, find UID
        users = sb.auth.admin.list_users()
        for au in users:
            if au.email == u["email"]:
                sb_uid = str(au.id)
                break
        print(f"  [INFO] User exists, found UID: {sb_uid}")

    with httpx.Client(base_url=BASE, timeout=30) as c:
        # Login
        r = c.post("/auth/login", json={"email": u["email"], "password": PWD})
        if r.status_code == 200:
            tokens["hr"] = r.json()["access_token"]
            print(f"  [OK] HR Login successful")
        else:
            print(f"  [ERR] HR Login failed: {r.text}")
            sys.exit(1)

        # Ensure user exists in local DB with supabase_uid
        conn = psycopg2.connect(DB); conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email=%s", (u["email"],))
        if not cur.fetchone():
            cur.execute("INSERT INTO users (id, email, name, role, company_id, supabase_uid) VALUES (%s, %s, %s, %s, %s, %s)",
                        (str(uuid.uuid4()), u["email"], u["name"], 'hr', co_id, sb_uid))
        else:
            cur.execute("UPDATE users SET company_id=%s, role='hr', supabase_uid=%s WHERE email=%s", (co_id, sb_uid, u["email"]))
        cur.close(); conn.close()

def cleanup():
    print("\n=== CLEANUP ===\n")
    conn = psycopg2.connect(DB); conn.autocommit = True
    cur = conn.cursor()
    cur.execute("DELETE FROM ai_scores WHERE resume_id IN (SELECT id FROM resumes WHERE job_id IN (SELECT id FROM jobs WHERE company_id=%s))", (test_data.get("co_id"),))
    cur.execute("DELETE FROM resumes WHERE job_id IN (SELECT id FROM jobs WHERE company_id=%s)", (test_data.get("co_id"),))
    cur.execute("DELETE FROM jobs WHERE company_id=%s", (test_data.get("co_id"),))
    cur.execute("DELETE FROM users WHERE email=%s", (USERS["hr"]["email"],))
    cur.execute("DELETE FROM companies WHERE id=%s", (test_data.get("co_id"),))
    cur.close(); conn.close()

def test_ai_pipeline():
    print("\n--- TESTING AI PIPELINE ---")
    with httpx.Client(base_url=BASE, timeout=60) as c:
        headers = {"Authorization": f"Bearer {tokens['hr']}"}
        
        # 1. Create Job
        job_payload = {
            "title": "Python Developer",
            "description": "Looking for a Python Developer expert in FastAPI, PostgreSQL, and React. Should know Docker."
        }
        r = c.post("/jobs", json=job_payload, headers=headers)
        if r.status_code != 201:
            print(f"  [ERR] Job creation failed: {r.status_code} - {r.text}")
            sys.exit(1)
        job_id = r.json()["id"]
        test_data["job_id"] = job_id
        log("Job created", "POST /jobs", "201", f"{r.status_code}", r.status_code == 201)
        
        # 2. Upload Resume (Valid minimal PDF)
        resume_content = b"%PDF-1.1\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 50 >>\nstream\nBT /F1 24 Tf 100 700 Td (Python FastAPI React Docker SQL) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n382\n%%EOF"
        files = [("files", ("resume.pdf", resume_content, "application/pdf"))]
        r = c.post(f"/jobs/{job_id}/upload-resumes", files=files, headers=headers)
        log("Resume uploaded", "POST upload", "202", f"{r.status_code}", r.status_code == 202)
        
        # 3. Wait for processing (Extraction + Scoring + AI)
        print("  Waiting 15s for full AI pipeline (Extraction -> Scoring -> AI)...")
        time.sleep(15)
        
        # 4. Check Candidates Endpoint
        r = c.get(f"/jobs/{job_id}/candidates", headers=headers)
        log("Candidates endpoint status", "GET /candidates", "200", f"{r.status_code}", r.status_code == 200)
        
        if r.status_code == 200:
            candidates = r.json()
            log("Candidate found", "Check list size", "1", f"{len(candidates)}", len(candidates) == 1)
            
            if candidates:
                can = candidates[0]
                log("Status is COMPLETED", "Check status", "completed", can["status"], can["status"] == "completed")
                log("Deterministic score present", "Check score", "> 0", f"{can['score']}", can["score"] > 0)
                log("Skill match score present", "Check skill score", "> 0", f"{can['skill_match_score']}", can["skill_match_score"] > 0)
                
                # Check AI Insights
                has_summary = bool(can.get("summary") and len(can["summary"]) > 5)
                log("AI Summary generated", "Check summary", "True", f"{has_summary}", has_summary)
                
                has_explanation = bool(can.get("explanation") and len(can["explanation"]) > 10)
                log("AI Explanation generated", "Check explanation", "True", f"{has_explanation}", has_explanation)
                
                log("Matched skills present", "Check skills", ">= 1", f"{len(can['matched_skills'])}", len(can['matched_skills']) >= 1)

if __name__ == "__main__":
    try:
        setup()
        test_ai_pipeline()
    except Exception as e:
        print(f"\n[FATAL] {e}")
        import traceback; traceback.print_exc()
    finally:
        cleanup()
    
    # Summary
    p = sum(1 for r in results if r["status"] == "PASS")
    f = sum(1 for r in results if r["status"] == "FAIL")
    print(f"\n{'='*60}")
    print(f"  PHASE 3 AUDIT: {p + f} tests | {p} PASSED | {f} FAILED")
    print(f"{'='*60}")
