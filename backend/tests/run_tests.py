"""
AI Hiring OS - Comprehensive Backend Test Suite
Tests: Auth, Multi-tenant isolation, RBAC, Data validation
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import uuid
import httpx
import psycopg2
import os
from supabase import create_client

# -- Config (Loaded from Environment) --
BASE = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000")
SB_URL = os.getenv("SUPABASE_URL")
SB_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DB = os.getenv("DATABASE_URL")
PWD = os.getenv("TEST_USER_PASSWORD", "TestP@ssw0rd123!")

USERS = {
    "admin":    {"email": "t_admin@aihos.test",    "name": "Test Admin",    "role": "admin"},
    "hr":       {"email": "t_hr@aihos.test",       "name": "Test HR",       "role": "hr"},
    "manager":  {"email": "t_mgr@aihos.test",      "name": "Test Manager",  "role": "manager"},
    "employee": {"email": "t_emp@aihos.test",       "name": "Test Employee", "role": "employee"},
    "user_b":   {"email": "t_userb@aihos.test",     "name": "Test User B",   "role": "employee"},
}

results = []
tokens = {}
sb_uids = {}
co_ids = {}


def log(name, action, expected, actual, ok):
    s = "PASS" if ok else "FAIL"
    results.append({"name": name, "action": action, "expected": expected, "actual": actual, "status": s})
    mark = "[OK]" if ok else "[FAIL]"
    print(f"  {mark} {name}")
    if not ok:
        print(f"       Expected: {expected}")
        print(f"       Actual:   {actual}")


# -- SETUP --
def setup():
    print("\n=== SETUP ===\n")
    sb = create_client(SB_URL, SB_KEY)

    # Create Supabase Auth users
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

    # Login all to get tokens
    c = httpx.Client(base_url=BASE, timeout=30)
    for key, u in USERS.items():
        try:
            r = c.post("/auth/login", json={"email": u["email"], "password": PWD})
            if r.status_code == 200:
                tokens[key] = r.json()["access_token"]
                print(f"  [OK] Token: {key}")
            else:
                print(f"  [ERR] Login {key}: {r.status_code} - {r.text[:100]}")
        except Exception as e:
            print(f"  [ERR] Login {key}: {e}")
    c.close()

    # Seed DB
    conn = psycopg2.connect(DB)
    conn.autocommit = True
    cur = conn.cursor()

    for label, name in [("a", "TestCo Alpha"), ("b", "TestCo Beta")]:
        cur.execute("SELECT id FROM companies WHERE name=%s", (name,))
        row = cur.fetchone()
        if row:
            co_ids[label] = str(row[0])
        else:
            cid = str(uuid.uuid4())
            cur.execute("INSERT INTO companies (id, name) VALUES (%s,%s) RETURNING id", (cid, name))
            co_ids[label] = str(cur.fetchone()[0])
        print(f"  [OK] Company {label.upper()}: {co_ids[label][:8]}...")

    for key, u in USERS.items():
        co = co_ids["b"] if key == "user_b" else co_ids["a"]
        uid = sb_uids.get(key)
        if not uid:
            continue
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
    print("\n=== Setup complete ===\n")


# -- CLEANUP --
def cleanup():
    print("\n=== CLEANUP ===\n")
    conn = psycopg2.connect(DB)
    conn.autocommit = True
    cur = conn.cursor()
    emails = [u["email"] for u in USERS.values()] + ["hrcreated@aihos.test"]
    for e in emails:
        cur.execute("DELETE FROM users WHERE email=%s", (e,))
    for n in ["TestCo Alpha", "TestCo Beta", "TestCo RBAC"]:
        cur.execute("DELETE FROM companies WHERE name=%s", (n,))
    cur.close()
    conn.close()

    sb = create_client(SB_URL, SB_KEY)
    for uid in sb_uids.values():
        try:
            sb.auth.admin.delete_user(uid)
        except:
            pass
    print("  [OK] Cleanup done\n")


# -- TEST: Health --
def test_health():
    print("\n--- HEALTH CHECK ---")
    c = httpx.Client(base_url=BASE, timeout=30)
    r = c.get("/health")
    log("Health check", "GET /health", "200 + healthy",
        f"{r.status_code} {r.json().get('status')}",
        r.status_code == 200 and r.json()["status"] == "healthy")
    c.close()


# -- TEST: Auth --
def test_auth():
    print("\n--- AUTH TESTS ---")
    c = httpx.Client(base_url=BASE, timeout=30)

    # Valid login
    r = c.post("/auth/login", json={"email": USERS["admin"]["email"], "password": PWD})
    log("Valid login", "POST /auth/login",
        "200 + token", f"{r.status_code}",
        r.status_code == 200 and "access_token" in r.json())

    # Wrong password
    r = c.post("/auth/login", json={"email": USERS["admin"]["email"], "password": "wrong"})
    log("Wrong password rejected", "POST /auth/login (bad pass)",
        "401", f"{r.status_code}", r.status_code == 401)

    # GET /me with valid token
    r = c.get("/me", headers={"Authorization": f"Bearer {tokens['admin']}"})
    log("GET /me (valid token)", "GET /me",
        f"200 + email={USERS['admin']['email']}",
        f"{r.status_code} email={r.json().get('email','?')}",
        r.status_code == 200 and r.json()["email"] == USERS["admin"]["email"])

    # Verify role in response
    log("GET /me returns correct role", "Check role field",
        "admin", r.json().get("role", "?"),
        r.json().get("role") == "admin")

    # Verify company_id in response
    log("GET /me returns company_id", "Check company_id field",
        co_ids["a"], str(r.json().get("company_id", "?")),
        str(r.json().get("company_id")) == co_ids["a"])

    # GET /me without token
    r = c.get("/me")
    log("GET /me (no token)", "GET /me no auth",
        "401 or 403", f"{r.status_code}",
        r.status_code in (401, 403))

    # Tampered token
    t = tokens["admin"]
    r = c.get("/me", headers={"Authorization": f"Bearer {t[:-5]}XXXXX"})
    log("GET /me (tampered token)", "GET /me modified JWT",
        "401", f"{r.status_code}", r.status_code == 401)

    # Garbage token
    r = c.get("/me", headers={"Authorization": "Bearer garbage.token.here"})
    log("GET /me (garbage token)", "GET /me invalid JWT",
        "401", f"{r.status_code}", r.status_code == 401)

    c.close()


# -- TEST: Multi-tenant --
def test_multitenant():
    print("\n--- MULTI-TENANT TESTS ---")
    c = httpx.Client(base_url=BASE, timeout=30)

    # Employee A sees only Company A users
    r = c.get("/users", headers={"Authorization": f"Bearer {tokens['employee']}"})
    if r.status_code == 200:
        users = r.json()
        all_a = all(str(u["company_id"]) == co_ids["a"] for u in users)
        has_b = any(u["email"] == USERS["user_b"]["email"] for u in users)
        log("User A: only Company A users", "GET /users (emp A)",
            "All Company A", f"{len(users)} users, all_A={all_a}",
            all_a and len(users) > 0)
        log("User A: no Company B data", "Check User B absent",
            "User B not visible", f"User B found={has_b}", not has_b)
    else:
        log("User A: list users", "GET /users", "200", f"{r.status_code}", False)

    # User B sees only Company B
    r = c.get("/users", headers={"Authorization": f"Bearer {tokens['user_b']}"})
    if r.status_code == 200:
        users = r.json()
        all_b = all(str(u["company_id"]) == co_ids["b"] for u in users)
        log("User B: only Company B users", "GET /users (user B)",
            "All Company B", f"{len(users)} users, all_B={all_b}",
            all_b and len(users) > 0)
    else:
        log("User B: list users", "GET /users", "200", f"{r.status_code}", False)

    # Employee sees only own company
    r = c.get("/companies", headers={"Authorization": f"Bearer {tokens['employee']}"})
    if r.status_code == 200:
        cos = r.json()
        log("Employee: only own company", "GET /companies (emp)",
            "1 company (A)", f"{len(cos)} companies",
            len(cos) == 1 and str(cos[0]["id"]) == co_ids["a"])

    # Admin sees all companies
    r = c.get("/companies", headers={"Authorization": f"Bearer {tokens['admin']}"})
    if r.status_code == 200:
        cos = r.json()
        log("Admin: all companies visible", "GET /companies (admin)",
            ">=2 companies", f"{len(cos)} companies", len(cos) >= 2)

    # Cross-tenant access blocked
    r = c.get(f"/companies/{co_ids['b']}", headers={"Authorization": f"Bearer {tokens['employee']}"})
    log("Cross-tenant company blocked", "GET /companies/B (emp A)",
        "403", f"{r.status_code}", r.status_code == 403)

    # Admin cross-tenant users
    r = c.get("/users", headers={"Authorization": f"Bearer {tokens['admin']}"})
    if r.status_code == 200:
        users = r.json()
        cos_seen = set(str(u["company_id"]) for u in users)
        log("Admin: cross-tenant users", "GET /users (admin)",
            "Users from >=2 companies", f"{len(cos_seen)} companies seen",
            len(cos_seen) >= 2)

    c.close()


# -- TEST: RBAC --
def test_rbac():
    print("\n--- RBAC TESTS ---")
    c = httpx.Client(base_url=BASE, timeout=30)
    company_body = {"name": "TestCo RBAC"}

    # POST /companies - role tests
    for role, expect in [("hr", 403), ("employee", 403), ("manager", 403)]:
        r = c.post("/companies", json=company_body, headers={"Authorization": f"Bearer {tokens[role]}"})
        log(f"{role.upper()}: cannot create company", f"POST /companies ({role})",
            f"{expect}", f"{r.status_code}", r.status_code == expect)

    # Admin CAN create company
    r = c.post("/companies", json=company_body, headers={"Authorization": f"Bearer {tokens['admin']}"})
    log("ADMIN: can create company", "POST /companies (admin)",
        "201", f"{r.status_code}", r.status_code == 201)
    if r.status_code == 201:
        # Cleanup the created company
        conn = psycopg2.connect(DB); conn.autocommit = True
        cur = conn.cursor()
        cur.execute("DELETE FROM companies WHERE name=%s", ("TestCo RBAC",))
        cur.close(); conn.close()

    # POST /users - role restrictions
    user_body = {"email": "rbac_test@aihos.test", "name": "RBAC Test",
                 "role": "employee", "company_id": co_ids["a"]}
    for role, expect in [("employee", 403), ("manager", 403)]:
        r = c.post("/users", json=user_body, headers={"Authorization": f"Bearer {tokens[role]}"})
        log(f"{role.upper()}: cannot create users", f"POST /users ({role})",
            f"{expect}", f"{r.status_code}", r.status_code == expect)

    # HR CAN create user in own company
    hr_body = {"email": "hrcreated@aihos.test", "name": "HR Created",
               "role": "employee", "company_id": co_ids["a"]}
    r = c.post("/users", json=hr_body, headers={"Authorization": f"Bearer {tokens['hr']}"})
    log("HR: can create user (own co)", "POST /users (hr)",
        "201", f"{r.status_code}", r.status_code == 201)

    if r.status_code == 201:
        d = r.json()
        log("Created user: correct role", "Check role",
            "employee", d.get("role"), d.get("role") == "employee")
        log("Created user: correct company", "Check company_id",
            co_ids["a"], str(d.get("company_id")),
            str(d.get("company_id")) == co_ids["a"])

    # HR cannot create user in OTHER company
    cross_body = {"email": "cross@aihos.test", "name": "Cross",
                  "role": "employee", "company_id": co_ids["b"]}
    r = c.post("/users", json=cross_body, headers={"Authorization": f"Bearer {tokens['hr']}"})
    log("HR: blocked cross-tenant create", "POST /users (hr, other co)",
        "403", f"{r.status_code}", r.status_code == 403)

    c.close()


# -- TEST: Data Validation --
def test_data():
    print("\n--- DATA VALIDATION ---")
    conn = psycopg2.connect(DB)
    cur = conn.cursor()

    # Check users table columns
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")
    cols = [r[0] for r in cur.fetchall()]
    for col in ["id", "email", "role", "company_id", "supabase_uid", "created_at"]:
        log(f"users.{col} exists", "Check column",
            "present", "present" if col in cols else "MISSING", col in cols)

    # Check companies table columns
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='companies' ORDER BY ordinal_position")
    cols = [r[0] for r in cur.fetchall()]
    for col in ["id", "name", "created_at"]:
        log(f"companies.{col} exists", "Check column",
            "present", "present" if col in cols else "MISSING", col in cols)

    # FK constraint
    cur.execute("""SELECT COUNT(*) FROM information_schema.table_constraints
                   WHERE table_name='users' AND constraint_type='FOREIGN KEY'""")
    fk = cur.fetchone()[0]
    log("users FK to companies", "Check FK", ">=1", f"{fk}", fk >= 1)

    # No orphan users
    cur.execute("SELECT COUNT(*) FROM users WHERE company_id IS NULL")
    nulls = cur.fetchone()[0]
    log("No orphan users (null company)", "Check NULL company_id",
        "0", f"{nulls}", nulls == 0)

    cur.close()
    conn.close()


# -- MAIN --
if __name__ == "__main__":
    try:
        setup()
        test_health()
        test_auth()
        test_multitenant()
        test_rbac()
        test_data()
    except Exception as e:
        print(f"\n[FATAL] {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            cleanup()
        except Exception as e:
            print(f"[WARN] Cleanup error: {e}")

    # Summary
    p = sum(1 for r in results if r["status"] == "PASS")
    f = sum(1 for r in results if r["status"] == "FAIL")
    print(f"\n{'='*60}")
    print(f"  FINAL: {p + f} tests | {p} PASSED | {f} FAILED")
    print(f"{'='*60}")
    if f > 0:
        print("\n  FAILURES:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  - {r['name']}")
                print(f"    expected={r['expected']}")
                print(f"    actual={r['actual']}")
    print()
