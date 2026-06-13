import os
import json
import base64
import asyncio
import subprocess
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional
from services import llm_service, db_service

router = APIRouter()

class GenerateRequest(BaseModel):
    prompt: str
    messages: Optional[list] = None
    target_url: Optional[str] = None
    project_id: Optional[str] = None
    persist_session: Optional[bool] = True

class QAProject(BaseModel):
    id: str
    name: str
    target_url: str
    persist_session: Optional[int] = 1
    storage_state: Optional[str] = None
    updated_at: Optional[int] = 0

class QAScenario(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = ""
    status: Optional[str] = "idle"
    messages: Optional[list] = []
    script_code: Optional[str] = ""
    updated_at: Optional[int] = 0

@router.get("/api/qa/projects")
async def get_projects():
    return db_service.get_qa_projects()

@router.post("/api/qa/projects")
async def save_project(project: QAProject):
    db_service.save_qa_project(project.dict())
    return {"status": "ok"}

@router.delete("/api/qa/projects/{project_id}")
async def delete_project(project_id: str):
    db_service.delete_qa_project(project_id)
    return {"status": "ok"}

@router.delete("/api/qa/projects/{project_id}/state")
async def clear_project_state(project_id: str):
    db_service.clear_project_state(project_id)
    return {"status": "ok"}

@router.get("/api/qa/projects/{project_id}/scenarios")
async def get_scenarios(project_id: str):
    return db_service.get_qa_scenarios(project_id)

async def extract_dom(url: str, state_content: str = None) -> str:
    print(f"Extracting DOM for {url}...", flush=True)
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True)
            if state_content:
                with open("temp_extract_state.json", "w") as f:
                    f.write(state_content)
                context = await browser.new_context(storage_state="temp_extract_state.json")
                os.remove("temp_extract_state.json")
            else:
                context = await browser.new_context()
            
            page = await context.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(1500)
            
            elements = await page.evaluate('''() => {
                const els = Array.from(document.querySelectorAll('button, input, a, select, textarea'));
                return els.map(e => {
                    const tag = e.tagName.toLowerCase();
                    const id = e.id ? ` id="${e.id}"` : '';
                    const name = e.name ? ` name="${e.name}"` : '';
                    let cls = '';
                    if (e.className && typeof e.className === 'string') {
                        cls = ` class="${e.className}"`;
                    }
                    const type = e.type ? ` type="${e.type}"` : '';
                    const text = (e.innerText || e.value || '').trim().replace(/\\n/g, ' ').substring(0, 50);
                    return `<${tag}${id}${name}${cls}${type}>${text}</${tag}>`;
                }).join('\\n');
            }''')
            
            await browser.close()
            return elements
    except Exception as e:
        print(f"Error extracting DOM: {e}")
        return ""

@router.post("/api/qa/scenarios")
async def save_scenario(scenario: QAScenario):
    db_service.save_qa_scenario(scenario.dict())
    return {"status": "ok"}

@router.delete("/api/qa/scenarios/{scenario_id}")
async def delete_scenario(scenario_id: str):
    db_service.delete_qa_scenario(scenario_id)
    return {"status": "ok"}

@router.post("/api/qa/generate")
async def generate_qa_script(req: GenerateRequest):
    start_url = req.target_url if req.target_url else "https://google.com"
    
    # 1. Extract current DOM to eliminate guessing
    state_content = None
    if req.project_id and req.persist_session:
        state_content = db_service.get_project_state(req.project_id)
        
    extracted_dom = await extract_dom(start_url, state_content)
    dom_context = f"\n\nHere are the interactive elements currently on the page:\n{extracted_dom}\n\nUse these exact attributes to write accurate Playwright locators." if extracted_dom else ""

    system_prompt = f"""You are an expert QA Automation engineer. Write a Python script using Playwright's sync API.
The script must accomplish the user's task. {dom_context}

CRITICAL RULES:
1. Use the sync API:
from playwright.sync_api import sync_playwright

2. Initialize browser exactly like this:
import os
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=False, slow_mo=500)
    state_file = 'temp_qa_state.json'
    context = browser.new_context(storage_state=state_file if os.path.exists(state_file) else None)
    page = context.new_page()
    # ALWAYS use domcontentloaded to avoid 30s timeout on slow external scripts
    page.goto('{start_url}', timeout=60000, wait_until='domcontentloaded')
    page.add_init_script('''
    const box = document.createElement('div');
    box.style.position = 'absolute';
    box.style.width = '20px';
    box.style.height = '20px';
    box.style.background = 'rgba(255,0,0,0.5)';
    box.style.borderRadius = '10px';
    box.style.pointerEvents = 'none';
    box.style.zIndex = '10000';
    document.body.appendChild(box);
    document.addEventListener('mousemove', e => {{
        box.style.left = e.pageX - 10 + 'px';
        box.style.top = e.pageY - 10 + 'px';
    }});
    ''')
    page.goto('{start_url}')

3. Use SMART LOCATORS. Since you don't know the exact HTML structure, you MUST use robust fallback selectors using commas, or Playwright's semantic locators:
   - For text inputs (email/username): `page.locator('input[name="email"], input[name="username"], input[name="identifier"], input[id*="user"], input[type="email"], input[type="text"]').first.fill('...')`
   - For passwords: `page.locator('input[type="password"], input[name="password"]').first.fill('...')`
   - For submit buttons: `page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Masuk"), button:has-text("Sign In"), input[type="submit"]').first.click()`

4. NEVER use `wait_for_selector(...).first`. `wait_for_selector` returns an ElementHandle which does not have a `.first` attribute. ALWAYS use `page.locator(...)` which automatically waits.

5. After EVERY major action (click, type, navigate, wait), add this exact code:
    page.screenshot(path="qa_preview.png")
    print("---SCREENSHOT_UPDATED---", flush=True)

6. Print meaningful logs using:
    print("LOG: Action performed...", flush=True)

7. Save state and close the browser at the end:
    page.wait_for_timeout(5000) # ALWAYS wait for network requests (like login) to complete before saving state!
    page.screenshot(path="qa_preview.png")
    print("---SCREENSHOT_UPDATED---", flush=True)
    context.storage_state(path=state_file)
    context.close()
    browser.close()

8. Do NOT include any markdown formatting (like ```python) or explanation, output ONLY the raw Python code.
"""
    
    # Use the existing LLM service to generate code
    messages = [{"role": "system", "content": system_prompt}]
    
    if req.messages:
        for m in req.messages:
            messages.append({"role": m["role"], "content": m["content"]})
    else:
        messages.append({"role": "user", "content": req.prompt})
    
    payload = {
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 2048,
        "stream": True,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0,
        "repeat_penalty": 1.05,
        "stop": [
            "<|im_end|>", "<|eot_id|>", "</s>", "<|endoftext|>", 
            "<|end_of_text|>", "User:", "\nuser", "\nYou", "\n<|user|>", 
            "user:", "assistant:", "System:", "system:", "Assistant:"
        ]
    }
    
    generated_code = ""
    async for chunk in llm_service.stream_llm_response(payload):
        if chunk.startswith("data: "):
            data_str = chunk.replace("data: ", "").strip()
            if data_str == "[DONE]":
                break
            try:
                data_obj = json.loads(data_str)
                if data_obj.get("choices") and data_obj["choices"][0].get("delta", {}).get("content"):
                    generated_code += data_obj["choices"][0]["delta"]["content"]
            except:
                pass
                
    # Clean up markdown if the LLM still added it
    if generated_code.startswith("```python"):
        generated_code = generated_code[9:]
    if generated_code.startswith("```"):
        generated_code = generated_code[3:]
    if generated_code.endswith("```"):
        generated_code = generated_code[:-3]
        
    return {"code": generated_code.strip()}

@router.websocket("/api/qa/ws")
async def qa_websocket(websocket: WebSocket):
    await websocket.accept()
    
    import os
    if os.getenv("ENV", "development").lower() == "production":
        await websocket.send_json({"type": "log", "message": "[Error] QA Automation is disabled in production."})
        await websocket.send_json({"type": "done"})
        await websocket.close()
        return

    try:
        data = await websocket.receive_text()
        req = json.loads(data)
        script_code = req.get("code", "")
        # Hot-patch AI hallucination where it chains .first on wait_for_selector
        script_code = script_code.replace("wait_for_selector", "locator")
        project_id = req.get("project_id", "")
        
        script_path = "temp_qa_script.py"
        screenshot_path = "qa_preview.png"
        state_path = "temp_qa_state.json"
        
        # Load state from DB
        if project_id:
            state_data = db_service.get_project_state(project_id)
            if state_data:
                with open(state_path, "w") as f:
                    f.write(state_data)
        
        with open(script_path, "w") as f:
            f.write(script_code)
            
        process = await asyncio.create_subprocess_exec(
            "python", script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )
        
        await websocket.send_json({"type": "log", "message": "Starting execution..."})
        
        while True:
            line = await process.stdout.readline()
            if not line:
                break
                
            decoded_line = line.decode('utf-8').strip()
            
            if decoded_line == "---SCREENSHOT_UPDATED---":
                if os.path.exists(screenshot_path):
                    with open(screenshot_path, "rb") as img_file:
                        b64_img = base64.b64encode(img_file.read()).decode('utf-8')
                        await websocket.send_json({"type": "screenshot", "data": f"data:image/png;base64,{b64_img}"})
            elif decoded_line.startswith("LOG:"):
                await websocket.send_json({"type": "log", "message": decoded_line[4:].strip()})
            elif decoded_line:
                await websocket.send_json({"type": "log", "message": decoded_line})
                
        await process.wait()
        await websocket.send_json({"type": "log", "message": f"Execution finished with code {process.returncode}"})
        await websocket.send_json({"type": "done"})
        
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "log", "message": f"Error: {str(e)}"})
        await websocket.send_json({"type": "done"})
    finally:
        # Cleanup and Save State
        if os.path.exists("temp_qa_script.py"):
            os.remove("temp_qa_script.py")
        if os.path.exists("qa_preview.png"):
            os.remove("qa_preview.png")
            
        try:
            if project_id and os.path.exists("temp_qa_state.json"):
                with open("temp_qa_state.json", "r") as f:
                    state_content = f.read()
                db_service.update_project_state(project_id, state_content)
                os.remove("temp_qa_state.json")
        except:
            pass
