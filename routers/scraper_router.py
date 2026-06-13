"""
scraper_router.py - API endpoint for web scraping
POST /api/scrape { url: "https://..." }
"""
from fastapi import APIRouter, Request
from services.scraper_service import scrape_url

router = APIRouter()

@router.post("/api/scrape")
async def scrape_endpoint(request: Request):
    body = await request.json()
    url = body.get("url", "").strip()
    query = body.get("query", "").strip()

    if not url:
        return {"success": False, "error": "No URL provided."}

    result = await scrape_url(url, query)
    return result
