import sqlite3
import json
import os

from pathlib import Path

ROBIT_DIR = os.path.join(str(Path.home()), ".robit")
os.makedirs(ROBIT_DIR, exist_ok=True)
DB_FILE = os.path.join(ROBIT_DIR, "robit.db")

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
    c.execute('''
        CREATE TABLE IF NOT EXISTS qa_projects (
            id TEXT PRIMARY KEY,
            name TEXT,
            target_url TEXT,
            persist_session INTEGER DEFAULT 1,
            storage_state TEXT,
            updated_at INTEGER
        )
    ''')
    
    try:
        c.execute('ALTER TABLE qa_projects ADD COLUMN persist_session INTEGER DEFAULT 1')
    except sqlite3.OperationalError:
        pass
    try:
        c.execute('ALTER TABLE qa_projects ADD COLUMN storage_state TEXT')
    except sqlite3.OperationalError:
        pass
    c.execute('''
        CREATE TABLE IF NOT EXISTS qa_scenarios (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            name TEXT,
            description TEXT,
            status TEXT,
            messages TEXT,
            script_code TEXT,
            updated_at INTEGER
        )
    ''')
    
    # Run migrations for description and status if they don't exist
    try:
        c.execute('ALTER TABLE qa_scenarios ADD COLUMN description TEXT DEFAULT ""')
    except sqlite3.OperationalError:
        pass # Column already exists
    try:
        c.execute('ALTER TABLE qa_scenarios ADD COLUMN status TEXT DEFAULT "idle"')
    except sqlite3.OperationalError:
        pass # Column already exists

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


def get_qa_projects():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT id, name, target_url, persist_session, storage_state, updated_at FROM qa_projects ORDER BY updated_at DESC')
    rows = c.fetchall()
    conn.close()
    projects = []
    for row in rows:
        projects.append({
            "id": row[0],
            "name": row[1],
            "target_url": row[2],
            "persist_session": row[3],
            "storage_state": row[4],
            "updated_at": row[5]
        })
    return projects

def save_qa_project(project):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO qa_projects (id, name, target_url, persist_session, storage_state, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            target_url=excluded.target_url,
            persist_session=excluded.persist_session,
            storage_state=excluded.storage_state,
            updated_at=excluded.updated_at
    ''', (
        project.get("id"),
        project.get("name"),
        project.get("target_url"),
        project.get("persist_session", 1),
        project.get("storage_state", None),
        project.get("updated_at", 0)
    ))
    conn.commit()
    conn.close()

def clear_project_state(project_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('UPDATE qa_projects SET storage_state = NULL WHERE id = ?', (project_id,))
    conn.commit()
    conn.close()

def get_project_state(project_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT storage_state FROM qa_projects WHERE id = ?', (project_id,))
    row = c.fetchone()
    conn.close()
    if row and row[0]:
        return row[0]
    return None

def update_project_state(project_id, state_str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('UPDATE qa_projects SET storage_state = ? WHERE id = ?', (state_str, project_id))
    conn.commit()
    conn.close()

def delete_qa_project(project_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM qa_projects WHERE id = ?', (project_id,))
    c.execute('DELETE FROM qa_scenarios WHERE project_id = ?', (project_id,))
    conn.commit()
    conn.close()

def get_qa_scenarios(project_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT id, project_id, name, description, status, messages, script_code, updated_at FROM qa_scenarios WHERE project_id = ? ORDER BY updated_at DESC', (project_id,))
    rows = c.fetchall()
    conn.close()
    scenarios = []
    for row in rows:
        scenarios.append({
            "id": row[0],
            "project_id": row[1],
            "name": row[2],
            "description": row[3],
            "status": row[4],
            "messages": json.loads(row[5]) if row[5] else [],
            "script_code": row[6],
            "updated_at": row[7]
        })
    return scenarios

def save_qa_scenario(scenario):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO qa_scenarios (id, project_id, name, description, status, messages, script_code, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            description=excluded.description,
            status=excluded.status,
            messages=excluded.messages,
            script_code=excluded.script_code,
            updated_at=excluded.updated_at
    ''', (
        scenario.get("id"),
        scenario.get("project_id"),
        scenario.get("name"),
        scenario.get("description", ""),
        scenario.get("status", "idle"),
        json.dumps(scenario.get("messages", [])),
        scenario.get("script_code", ""),
        scenario.get("updated_at", 0)
    ))
    conn.commit()
    conn.close()

def delete_qa_scenario(scenario_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM qa_scenarios WHERE id = ?', (scenario_id,))
    conn.commit()
    conn.close()

def delete_setting(key):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM settings WHERE key = ?", (key,))
    conn.commit()
    conn.close()
