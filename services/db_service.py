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
    c.execute('''
        CREATE TABLE IF NOT EXISTS planning_projects (
            id TEXT PRIMARY KEY,
            name TEXT,
            target_dirs TEXT,
            save_dir TEXT,
            filename TEXT,
            tech_stack TEXT,
            messages TEXT,
            updated_at INTEGER
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

def get_planning_projects():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT id, name, target_dirs, save_dir, filename, tech_stack, messages, updated_at FROM planning_projects ORDER BY updated_at DESC')
    rows = c.fetchall()
    conn.close()
    projects = []
    for row in rows:
        projects.append({
            "id": row[0],
            "name": row[1],
            "target_dirs": json.loads(row[2]) if row[2] else [],
            "save_dir": row[3],
            "filename": row[4],
            "tech_stack": row[5],
            "messages": json.loads(row[6]) if row[6] else [],
            "updated_at": row[7]
        })
    return projects

def save_planning_project(project):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO planning_projects (id, name, target_dirs, save_dir, filename, tech_stack, messages, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            target_dirs=excluded.target_dirs,
            save_dir=excluded.save_dir,
            filename=excluded.filename,
            tech_stack=excluded.tech_stack,
            messages=excluded.messages,
            updated_at=excluded.updated_at
    ''', (
        project.get("id"),
        project.get("name"),
        json.dumps(project.get("target_dirs", [])),
        project.get("save_dir", "."),
        project.get("filename", "implementation_plan.md"),
        project.get("tech_stack", ""),
        json.dumps(project.get("messages", [])),
        project.get("updated_at", 0)
    ))
    conn.commit()
    conn.close()

def delete_planning_project(project_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM planning_projects WHERE id = ?', (project_id,))
    conn.commit()
    conn.close()

