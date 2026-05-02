import psycopg2

DB = "postgresql://postgres:Pranav%4012102004@db.sdajiogciztggncebswx.supabase.co:5432/postgres"

def check_tables():
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables: {tables}")
    
    if "ai_scores" in tables:
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='ai_scores'")
        cols = cur.fetchall()
        print("ai_scores columns:")
        for c in cols:
            print(f"  - {c[0]}: {c[1]}")
    else:
        print("ai_scores table MISSING")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_tables()
