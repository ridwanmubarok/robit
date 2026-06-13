import os
import sys
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from core.config import WEB_PORT
from services import db_service, llm_service
from routers import chat_router, rag_router, system_router, setup_router, scraper_router, qa_router

# Force UTF-8 for Windows console output
if sys.platform == "win32":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db_service.init_db()
    llm_service.start_engine()
    asyncio.create_task(llm_service.prewarm_kv_cache())
    print("[SYSTEM] ROBIT Backend initialized successfully.")
    
    yield
    
    # Shutdown
    print("[SYSTEM] Shutting down ROBIT Backend...")
    llm_service.stop_engine()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ROBIT API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat_router.router)
app.include_router(rag_router.router)
app.include_router(system_router.router)
app.include_router(setup_router.router)
app.include_router(scraper_router.router)
app.include_router(qa_router.router)

# Mount Frontend
if getattr(sys, 'frozen', False):
    # Running as PyInstaller bundle
    base_dir = sys._MEIPASS
else:
    # Running as standard Python script
    base_dir = os.path.dirname(__file__)

ui_dist = os.path.join(base_dir, "ui", "dist")
if os.path.exists(ui_dist):
    astro_dist = os.path.join(ui_dist, "_astro")
    if os.path.exists(astro_dist):
        app.mount("/_astro", StaticFiles(directory=astro_dist), name="astro")
    
    # Serve everything else from ui_dist, including index.html
    app.mount("/", StaticFiles(directory=ui_dist, html=True), name="ui")

if __name__ == "__main__":
    import uvicorn
    import websockets # Force import for PyInstaller
    uvicorn.run(app, host="127.0.0.1", port=WEB_PORT, ws="websockets")
