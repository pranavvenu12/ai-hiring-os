"""
AI Hiring OS - Phase 2 Audit Test Suite
Validates Job Creation, Resume Upload, Storage, Extraction, Isolation, and RBAC.
"""
import sys
import io
import time
import uuid
import httpx
import psycopg2
from supabase import create_client
import os

# -- Config (Loaded from Environment) --
BASE = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000")
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DB = os.getenv("DATABASE_URL")
PWD = os.getenv("TEST_USER_PASSWORD", "TestP@ssw0rd123!")

USERS = {
    "hr_a":       {"email": "audit_hr_a@example.com",       "name": "Audit HR A",       "role": "hr"},
    "mgr_a":      {"email": "audit_mgr_a@example.com",      "name": "Audit Manager A",  "role": "manager"},
    "emp_a":      {"email": "audit_emp_a@example.com",      "name": "Audit Employee A", "role": "employee"},
    "hr_b":       {"email": "audit_hr_b@example.com",       "name": "Audit HR B",       "role": "hr"},
}

results = []
tokens = {}
sb_uids = {}
co_ids = {}
test_jobs = {}

def log(name, action, expected, actual, ok):
    s = "PASS" if ok else "FAIL"
    results.append({"name": name, "action": action, "expected": expected, "actual": actual, "status": s})
    mark = "[OK]" if ok else "[FAIL]"
    print(f"  {mark} {name}")
    if not ok:
        print(f"       Expected: {expected}")
        print(f"       Actual:   {actual}")

def setup():
    print("\n=== SETUP ===\n")
    sb = create_client(SB_URL, SB_KEY)

    # 1. Create Supabase Auth users
    for key, u in USERS.items():
        try:
            res = sb.auth.admin.create_user({"email": u["email"], "password": PWD, "email_confirm": True})
            sb_uids[key] = str(res.user.id)
            print(f"  [OK] Auth user: {u['email']}")
        except Exception as e:
            if "already" in str(e).lower():
                for au in sb.auth.admin.list_users():
                    if au.email == u["email"]:
                        sb_uids[key] = str(au.id)
                        print(f"  [INFO] Exists: {u['email']}")
                        break
            else:
                print(f"  [ERR] {u['email']}: {e}")

    # 2. Seed DB with Companies and Users
    conn = psycopg2.connect(DB)
    conn.autocommit = True
    cur = conn.cursor()

    # Create Companies
    for label, name in [("a", "Audit Company Alpha"), ("b", "Audit Company Beta")]:
        cur.execute("SELECT id FROM companies WHERE name=%s", (name,))
        row = cur.fetchone()
        if row:
            co_ids[label] = str(row[0])
        else:
            cid = str(uuid.uuid4())
            cur.execute("INSERT INTO companies (id, name) VALUES (%s,%s) RETURNING id", (cid, name))
            co_ids[label] = str(cur.fetchone()[0])
        print(f"  [OK] Company {label.upper()}: {co_ids[label][:8]}...")

    # Create Users
    for key, u in USERS.items():
        co = co_ids["b"] if "_b" in key else co_ids["a"]
        uid = sb_uids.get(key)
        if not uid: continue
        cur.execute("SELECT id FROM users WHERE email=%s", (u["email"],))
        row = cur.fetchone()
        if row:
            cur.execute("UPDATE users SET supabase_uid=%s, role=%s, company_id=%s WHERE email=%s",
                        (uid, u["role"], co, u["email"]))
        else:
            cur.execute("INSERT INTO users (email,name,role,company_id,supabase_uid) VALUES (%s,%s,%s,%s,%s)",
                        (u["email"], u["name"], u["role"], co, uid))
        print(f"  [OK] DB user: {key} -> {u['role']}")

    cur.close()
    conn.close()

    # 3. Login all to get tokens
    with httpx.Client(base_url=BASE, timeout=30) as c:
        for key, u in USERS.items():
            r = c.post("/auth/login", json={"email": u["email"], "password": PWD})
            if r.status_code == 200:
                tokens[key] = r.json()["access_token"]
            else:
                print(f"  [ERR] Login {key}: {r.status_code} - {r.text}")

    print("\n=== Setup complete ===\n")

def cleanup():
    print("\n=== CLEANUP ===\n")
    conn = psycopg2.connect(DB); conn.autocommit = True
    cur = conn.cursor()
    # Delete resumes, jobs, users, companies
    cur.execute("DELETE FROM resumes WHERE job_id IN (SELECT id FROM jobs WHERE company_id IN (%s, %s))", (co_ids.get("a"), co_ids.get("b")))
    cur.execute("DELETE FROM jobs WHERE company_id IN (%s, %s)", (co_ids.get("a"), co_ids.get("b")))
    for u in USERS.values():
        cur.execute("DELETE FROM users WHERE email=%s", (u["email"],))
    cur.execute("DELETE FROM companies WHERE name IN (%s, %s)", ("Audit Company Alpha", "Audit Company Beta"))
    cur.close(); conn.close()

    sb = create_client(SB_URL, SB_KEY)
    for uid in sb_uids.values():
        try: sb.auth.admin.delete_user(uid)
        except: pass
    print("  [OK] Cleanup done\n")

# --- TEST 1: JOB CREATION ---
def test_job_creation():
    print("\n--- TEST 1: JOB CREATION ---")
    with httpx.Client(base_url=BASE) as c:
        payload = {"title": "Senior Python Dev", "description": "FastAPI Expert"}
        r = c.post("/jobs", json=payload, headers={"Authorization": f"Bearer {tokens['hr_a']}"})
        
        ok = r.status_code == 201
        log("HR can create job", "POST /jobs", "201", f"{r.status_code}", ok)
        
        if ok:
            job = r.json()
            test_jobs["a1"] = job["id"]
            log("Job stored in DB correctly", "Check company_id", co_ids["a"], str(job["company_id"]), str(job["company_id"]) == co_ids["a"])

# --- TEST 2: RESUME UPLOAD ---
def test_resume_upload():
    print("\n--- TEST 2: RESUME UPLOAD ---")
    job_id = test_jobs.get("a1")
    if not job_id: return

    files = [
        ("files", ("resume1.pdf", open("test_files/resume1.pdf", "rb"), "application/pdf")),
        ("files", ("resume2.pdf", open("test_files/resume2.pdf", "rb"), "application/pdf")),
    ]
    
    start_time = time.time()
    with httpx.Client(base_url=BASE) as c:
        r = c.post(f"/jobs/{job_id}/upload-resumes", files=files, headers={"Authorization": f"Bearer {tokens['hr_a']}"})
    duration = time.time() - start_time

    log("Resume upload fast (background processing)", "Upload duration", "< 2.0s", f"{duration:.2f}s", duration < 2.0)
    log("Upload returns 202 Accepted", "POST upload", "202", f"{r.status_code}", r.status_code == 202)
    
    if r.status_code == 202:
        data = r.json()
        log("Correct number of resumes received", "Check count", "2", str(len(data.get("resumes", []))), len(data.get("resumes", [])) == 2)

# --- TEST 3 & 4: EXTRACTION & DATA INTEGRITY ---
def test_extraction():
    print("\n--- TEST 3 & 4: EXTRACTION & DATA INTEGRITY ---")
    print("  Waiting 5s for background processing...")
    time.sleep(5)
    
    # Check all resumes for the job
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    cur.execute("SELECT candidate_name, extracted_text FROM resumes WHERE job_id=%s", (test_jobs["a1"],))
    rows = cur.fetchall()
    
    print(f"  Found {len(rows)} resumes in DB.")
    for name, text in rows:
        if name == "broken.pdf":
            log(f"Extraction for {name} (Broken)", "Check extracted_text", "None/Empty", f"{'Populated' if text else 'Empty'}", not text)
        else:
            log(f"Extraction for {name}", "Check extracted_text", "Not empty", f"{len(text) if text else 0} chars", bool(text and len(text) > 2))
    
    cur.close(); conn.close()

# --- TEST 5: EDGE CASES ---
def test_edge_cases():
    print("\n--- TEST 5: EDGE CASES ---")
    job_id = test_jobs.get("a1")
    
    # 1. Scanned-like PDF
    files = [("files", ("scanned.pdf", open("test_files/scanned.pdf", "rb"), "application/pdf"))]
    with httpx.Client(base_url=BASE) as c:
        r = c.post(f"/jobs/{job_id}/upload-resumes", files=files, headers={"Authorization": f"Bearer {tokens['hr_a']}"})
    log("Upload scanned PDF", "POST upload", "202", f"{r.status_code}", r.status_code == 202)
    
    # 2. Broken PDF
    files = [("files", ("broken.pdf", open("test_files/broken.pdf", "rb"), "application/pdf"))]
    with httpx.Client(base_url=BASE) as c:
        r = c.post(f"/jobs/{job_id}/upload-resumes", files=files, headers={"Authorization": f"Bearer {tokens['hr_a']}"})
    log("Upload broken PDF", "POST upload", "202", f"{r.status_code}", r.status_code == 202)
    
    print("  Waiting 5s for edge case processing...")
    time.sleep(5)

# --- TEST 6 & 7: TENANT ISOLATION ---
def test_tenant_isolation():
    print("\n--- TEST 6 & 7: TENANT ISOLATION ---")
    job_id_a = test_jobs.get("a1")
    
    with httpx.Client(base_url=BASE) as c:
        # User B tries to see User A's jobs
        r = c.get("/jobs", headers={"Authorization": f"Bearer {tokens['hr_b']}"})
        jobs = r.json()
        has_a = any(str(j["id"]) == job_id_a for j in jobs)
        log("User B cannot see Company A jobs", "GET /jobs (HR B)", "False", f"Found={has_a}", not has_a)
        
        # User B tries to upload to Job A
        files = [("files", ("evil.pdf", open("test_files/resume1.pdf", "rb"), "application/pdf"))]
        r = c.post(f"/jobs/{job_id_a}/upload-resumes", files=files, headers={"Authorization": f"Bearer {tokens['hr_b']}"})
        log("User B blocked from uploading to Job A", "POST upload (HR B -> Job A)", "404", f"{r.status_code}", r.status_code == 404)

# --- TEST 8: RBAC ---
def test_rbac():
    print("\n--- TEST 8: RBAC ---")
    job_id = test_jobs.get("a1")
    
    with httpx.Client(base_url=BASE) as c:
        # Manager can view but not upload
        r = c.get("/jobs", headers={"Authorization": f"Bearer {tokens['mgr_a']}"})
        log("Manager can view jobs", "GET /jobs (Mgr A)", "200", f"{r.status_code}", r.status_code == 200)
        
        files = [("files", ("mgr_upload.pdf", open("test_files/resume1.pdf", "rb"), "application/pdf"))]
        r = c.post(f"/jobs/{job_id}/upload-resumes", files=files, headers={"Authorization": f"Bearer {tokens['mgr_a']}"})
        log("Manager cannot upload resumes", "POST upload (Mgr A)", "403", f"{r.status_code}", r.status_code == 403)
        
        # Employee cannot view
        r = c.get("/jobs", headers={"Authorization": f"Bearer {tokens['emp_a']}"})
        log("Employee cannot view jobs", "GET /jobs (Emp A)", "403", f"{r.status_code}", r.status_code == 403)

# --- TEST 9: STORAGE VALIDATION ---
def test_storage():
    print("\n--- TEST 9: STORAGE VALIDATION ---")
    conn = psycopg2.connect(DB); cur = conn.cursor()
    cur.execute("SELECT file_url FROM resumes LIMIT 1")
    row = cur.fetchone()
    if row:
        url = row[0]
        with httpx.Client() as c:
            r = c.get(url)
            log("File URL is publicly accessible", "GET file_url", "200", f"{r.status_code}", r.status_code == 200)
    cur.close(); conn.close()

if __name__ == "__main__":
    try:
        setup()
        test_job_creation()
        test_resume_upload()
        test_edge_cases()
        test_extraction()
        test_tenant_isolation()
        test_rbac()
        test_storage()
    except Exception as e:
        print(f"\n[FATAL] {e}")
        import traceback; traceback.print_exc()
    finally:
        cleanup()
    
    # Final Summary
    p = sum(1 for r in results if r["status"] == "PASS")
    f = sum(1 for r in results if r["status"] == "FAIL")
    print(f"\n{'='*60}")
    print(f"  PHASE 2 AUDIT: {p + f} tests | {p} PASSED | {f} FAILED")
    print(f"{'='*60}")
    if f > 0:
        for r in results:
            if r["status"] == "FAIL":
                print(f"  FAIL: {r['name']} -> {r['actual']}")
    else:
        print("\n  ALL PHASE 2 TESTS PASSED!")
