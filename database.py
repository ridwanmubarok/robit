import sqlite3
import json
import os

DB_FILE = "robit.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT,
            updated_at INTEGER,
            messages TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    conn.commit()

    # Migrate old JSON history
    c.execute('SELECT count(*) FROM sessions')
    if c.fetchone()[0] == 0:
        if os.path.exists("chat_history.json"):
            try:
                with open("chat_history.json", "r") as f:
                    data = json.load(f)
                    sessions = data.get("sessions", {})
                    for sid, sdata in sessions.items():
                        c.execute('''
                            INSERT INTO sessions (id, title, updated_at, messages)
                            VALUES (?, ?, ?, ?)
                        ''', (sid, sdata.get("title"), sdata.get("updated_at"), json.dumps(sdata.get("messages", []))))
                conn.commit()
                print("[INIT] Migrated chat_history.json to SQLite.")
            except Exception as e:
                print(f"[ERROR] Migration failed: {e}")
    conn.close()

def get_setting(key, default=None):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT value FROM settings WHERE key = ?', (key,))
    res = c.fetchone()
    conn.close()
    return res[0] if res else default

def set_setting(key, value):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
    ''', (key, value))
    conn.commit()
    conn.close()

def get_all_sessions():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT id, title, updated_at, messages FROM sessions')
    rows = c.fetchall()
    conn.close()
    sessions = {}
    for row in rows:
        sessions[row[0]] = {
            "title": row[1],
            "updated_at": row[2],
            "messages": json.loads(row[3])
        }
    return sessions

def save_all_sessions(sessions_dict):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    for sid, sdata in sessions_dict.items():
        c.execute('''
            INSERT INTO sessions (id, title, updated_at, messages)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title,
                updated_at=excluded.updated_at,
                messages=excluded.messages
        ''', (sid, sdata.get("title"), sdata.get("updated_at"), json.dumps(sdata.get("messages", []))))
    
    current_ids = set(sessions_dict.keys())
    c.execute('SELECT id FROM sessions')
    db_ids = set(row[0] for row in c.fetchall())
    to_delete = db_ids - current_ids
    for did in to_delete:
        c.execute('DELETE FROM sessions WHERE id = ?', (did,))
        
    conn.commit()
    conn.close()
