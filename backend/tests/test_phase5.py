"""
AI Hiring OS - Phase 5 Integration & RBAC Tests
Tests: Employee, Attendance, Performance, AI Interview Assistant
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import uuid
import httpx
import psycopg2
import os
from supabase import create_client

# Load .env file manually
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip().strip('"').strip("'")

from urllib.parse import urlparse, unquote

def connect_db():
    url_str = os.getenv("DATABASE_URL")
    if not url_str:
        raise ValueError("DATABASE_URL environment variable is not set")
    if url_str.startswith("postgresql+asyncpg://"):
        url_str = url_str.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(url_str)
    dbname = parsed.path.lstrip("/")
    user = parsed.username
    password = unquote(parsed.password) if parsed.password else None
    host = parsed.hostname
    port = parsed.port or 5432
    return psycopg2.connect(
        host=host,
        port=port,
        database=dbname,
        user=user,
        password=password
    )

BASE = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000")
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
PWD = os.getenv("TEST_USER_PASSWORD", "TestP@ssw0rd123!")

USERS = {
    "admin":    {"email": "t_admin@aihos-test.com",    "name": "Test Admin",    "role": "admin"},
    "hr":       {"email": "t_hr@aihos-test.com",       "name": "Test HR",       "role": "hr"},
    "manager":  {"email": "t_mgr@aihos-test.com",      "name": "Test Manager",  "role": "manager"},
    "employee": {"email": "t_emp@aihos-test.com",       "name": "Test Employee", "role": "employee"},
}

tokens = {}
sb_uids = {}
co_ids = {}
employee_ids = {}

results = []

def log(name, action, expected, actual, ok):
    s = "PASS" if ok else "FAIL"
    results.append({"name": name, "action": action, "expected": expected, "actual": actual, "status": s})
    mark = "[OK]" if ok else "[FAIL]"
    print(f"  {mark} {name}")
    if not ok:
        print(f"       Expected: {expected}")
        print(f"       Actual:   {actual}")

def setup():
    print("\n=== SETUP PHASE 5 TESTS ===\n")
    sb = create_client(SB_URL, SB_KEY)

    # Resolve Supabase Auth users or create them
    for key, u in USERS.items():
        try:
            res = sb.auth.admin.create_user({"email": u["email"], "password": PWD, "email_confirm": True})
            sb_uids[key] = str(res.user.id)
        except Exception as e:
            for au in sb.auth.admin.list_users():
                if au.email == u["email"]:
                    sb_uids[key] = str(au.id)
                    break

    # Login to get JWTs
    c = httpx.Client(base_url=BASE, timeout=30)
    for key, u in USERS.items():
        r = c.post("/auth/login", json={"email": u["email"], "password": PWD})
        if r.status_code == 200:
            tokens[key] = r.json()["access_token"]
            print(f"  [OK] Login token: {key}")
        else:
            print(f"  [ERR] Login token {key}: {r.status_code} - {r.text[:200]}")
    c.close()

    # Seed Company Alpha
    conn = connect_db()
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("SELECT id FROM companies WHERE name=%s", ("TestCo Alpha",))
    row = cur.fetchone()
    if row:
        co_ids["a"] = str(row[0])
    else:
        cid = str(uuid.uuid4())
        cur.execute("INSERT INTO companies (id, name) VALUES (%s,%s) RETURNING id", (cid, "TestCo Alpha"))
        co_ids["a"] = str(cur.fetchone()[0])

    for key, u in USERS.items():
        uid = sb_uids.get(key)
        cur.execute("SELECT id FROM users WHERE email=%s", (u["email"],))
        u_row = cur.fetchone()
        if not u_row:
            cur.execute("INSERT INTO users (email,name,role,company_id,supabase_uid) VALUES (%s,%s,%s,%s,%s)",
                        (u["email"], u["name"], u["role"], co_ids["a"], uid))
        else:
            cur.execute("UPDATE users SET supabase_uid=%s, role=%s, company_id=%s WHERE email=%s",
                        (uid, u["role"], co_ids["a"], u["email"]))

    cur.close()
    conn.close()

def test_employee_module():
    print("\n--- EMPLOYEE MODULE TESTS ---")
    c = httpx.Client(base_url=BASE, timeout=30)
    headers_hr = {"Authorization": f"Bearer {tokens['hr']}"}
    headers_mgr = {"Authorization": f"Bearer {tokens['manager']}"}
    headers_emp = {"Authorization": f"Bearer {tokens['employee']}"}

    # Create employee as HR
    payload = {
        "full_name": "John Doe",
        "email": "johndoe@aihos-test.com",
        "phone": "+1234567890",
        "department": "Engineering",
        "designation": "Software Engineer",
        "joining_date": "2026-01-15",
        "employment_type": "full_time"
    }
    r = c.post("/employees", json=payload, headers=headers_hr)
    log("HR: create employee", "POST /employees", "201", f"{r.status_code}", r.status_code == 201)
    
    if r.status_code == 201:
        emp = r.json()
        employee_ids["johndoe"] = emp["id"]
        log("HR: employee code auto-generated", "Check employee_code", "EMP-", f"{emp.get('employee_code')}", "employee_code" in emp and emp["employee_code"].startswith("EMP-"))

    # Link Employee user account
    conn = connect_db()
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email=%s", (USERS["employee"]["email"],))
    u_id = cur.fetchone()[0]
    
    # Create employee record linked to the employee user account
    cur.execute("DELETE FROM employees WHERE email=%s", (USERS["employee"]["email"],))
    cur.execute("INSERT INTO employees (id, company_id, user_id, employee_code, full_name, email, department, designation, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (str(uuid.uuid4()), co_ids["a"], u_id, "EMP-EMP", USERS["employee"]["name"], USERS["employee"]["email"], "Engineering", "Developer", "active"))
    employee_ids["employee"] = str(cur.fetchone()[0])
    
    cur.execute("SELECT id FROM users WHERE email=%s", (USERS["manager"]["email"],))
    m_id = cur.fetchone()[0]
    cur.execute("DELETE FROM employees WHERE email=%s", (USERS["manager"]["email"],))
    cur.execute("INSERT INTO employees (id, company_id, user_id, employee_code, full_name, email, department, designation, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (str(uuid.uuid4()), co_ids["a"], m_id, "EMP-MGR", USERS["manager"]["name"], USERS["manager"]["email"], "Engineering", "Engineering Manager", "active"))
    employee_ids["manager"] = str(cur.fetchone()[0])
    
    # Link employee to manager
    cur.execute("UPDATE employees SET manager_id=%s WHERE id=%s", (employee_ids["manager"], employee_ids["employee"]))
    
    cur.close()
    conn.close()

    # List employees
    r = c.get("/employees", headers=headers_hr)
    log("HR: list all employees", "GET /employees", "200", f"{r.status_code}", r.status_code == 200 and r.json().get("total", 0) >= 1)

    r = c.get("/employees", headers=headers_emp)
    log("Employee: list (sees only self)", "GET /employees", "total=1", f"total={r.json().get('total')}", r.status_code == 200 and r.json().get("total") == 1)

    c.close()

def test_attendance_module():
    print("\n--- ATTENDANCE MODULE TESTS ---")
    c = httpx.Client(base_url=BASE, timeout=30)
    headers_emp = {"Authorization": f"Bearer {tokens['employee']}"}

    # Delete today's record if exists to ensure clean clock-in
    conn = connect_db()
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("DELETE FROM attendance_records WHERE employee_id=%s", (employee_ids["employee"],))
    cur.close()
    conn.close()

    # Clock in
    r = c.post("/attendance/clock-in", headers=headers_emp)
    log("Employee: Clock In", "POST /attendance/clock-in", "200 successfully", f"{r.status_code} {r.text[:50]}", r.status_code == 200)

    # Double Clock in rejected
    r = c.post("/attendance/clock-in", headers=headers_emp)
    log("Employee: Double Clock In rejected", "POST /attendance/clock-in", "400", f"{r.status_code}", r.status_code == 400)

    # Clock out
    r = c.post("/attendance/clock-out", headers=headers_emp)
    log("Employee: Clock Out", "POST /attendance/clock-out", "200 successfully", f"{r.status_code}", r.status_code == 200)

    c.close()

def test_performance_module():
    print("\n--- PERFORMANCE MODULE TESTS ---")
    c = httpx.Client(base_url=BASE, timeout=30)
    headers_mgr = {"Authorization": f"Bearer {tokens['manager']}"}
    headers_emp = {"Authorization": f"Bearer {tokens['employee']}"}

    # Manager reviews direct report
    payload = {
        "employee_id": employee_ids["employee"],
        "rating": 5.0,
        "strengths": "Great full-stack developer, very rapid execution.",
        "improvements": "Keep doing what you are doing.",
        "comments": "Exceptional pairs partner."
    }
    r = c.post("/performance", json=payload, headers=headers_mgr)
    log("Manager: submit performance review", "POST /performance", "201 successfully", f"{r.status_code}", r.status_code == 201)

    # Employee sees reviews
    r = c.get("/performance/me", headers=headers_emp)
    log("Employee: view own reviews", "GET /performance/me", "200 with review", f"{r.status_code} len={len(r.json().get('reviews', []))}", r.status_code == 200 and len(r.json().get("reviews", [])) >= 1)

    c.close()

if __name__ == "__main__":
    try:
        setup()
        test_employee_module()
        test_attendance_module()
        test_performance_module()
    except Exception as e:
        print(f"\n[FATAL] {e}")
        import traceback
        traceback.print_exc()

    # Summary
    p = sum(1 for r in results if r["status"] == "PASS")
    f = sum(1 for r in results if r["status"] == "FAIL")
    print(f"\n{'='*60}")
    print(f"  PHASE 5 INTEGRATION RESULTS: {p + f} tests | {p} PASSED | {f} FAILED")
    print(f"{'='*60}")
