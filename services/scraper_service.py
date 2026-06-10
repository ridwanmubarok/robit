"""
scraper_service.py - Flexible web scraper for ROBIT
Uses httpx + BeautifulSoup for lightweight scraping.
Falls back gracefully on bot-protected pages.
"""
import re
import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
}

REMOVE_TAGS = ['script', 'style', 'nav', 'header', 'footer', 'aside',
               'noscript', 'form', 'iframe', 'svg', 'button', 'meta']

MAX_CONTENT_LENGTH = 12000  # tokens-safe limit for LLM context


async def scrape_url(url: str) -> dict:
    """
    Fetches a URL and extracts clean, readable text.
    Returns a dict with 'success', 'content', 'title', 'url', and optionally 'error'.
    """
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except httpx.TimeoutException:
        return {"success": False, "error": f"Timeout: {url} took too long to respond."}
    except httpx.HTTPStatusError as e:
        return {"success": False, "error": f"HTTP {e.response.status_code}: {url}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

    content_type = resp.headers.get("content-type", "")
    if "text/html" not in content_type and "text/plain" not in content_type:
        return {"success": False, "error": f"Unsupported content-type: {content_type}"}

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove clutter
    for tag in soup.find_all(REMOVE_TAGS):
        tag.decompose()

    title = soup.title.string.strip() if soup.title else url

    # Extract main content — prefer <main>, <article>, <div id="content">
    main = (
        soup.find("main") or
        soup.find("article") or
        soup.find(id=re.compile(r"(content|main|body)", re.I)) or
        soup.find(class_=re.compile(r"(content|main|article|product)", re.I)) or
        soup.body
    )

    if not main:
        return {"success": False, "error": "Could not extract meaningful content from page."}

    # Get raw text lines, strip whitespace and empty lines
    lines = []
    for element in main.find_all(["p", "h1", "h2", "h3", "h4", "li", "td", "th", "span", "div"]):
        text = element.get_text(separator=" ", strip=True)
        if text and len(text) > 10:
            lines.append(text)

    # Deduplicate while preserving order
    seen = set()
    unique_lines = []
    for line in lines:
        normalized = re.sub(r'\s+', ' ', line).strip()
        if normalized not in seen and len(normalized) > 15:
            seen.add(normalized)
            unique_lines.append(normalized)

    content = "\n".join(unique_lines)

    # Truncate if too long
    if len(content) > MAX_CONTENT_LENGTH:
        content = content[:MAX_CONTENT_LENGTH] + "\n\n[...Konten dipotong karena terlalu panjang]"

    if not content.strip():
        return {
            "success": False,
            "error": "Halaman berhasil diakses tetapi tidak ada teks yang bisa diekstrak (mungkin dirender oleh JavaScript)."
        }

    return {
        "success": True,
        "title": title,
        "url": url,
        "content": f"[Judul: {title}]\n[URL: {url}]\n\n{content}"
    }
