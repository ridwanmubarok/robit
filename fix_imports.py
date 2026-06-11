import re

with open(".github/workflows/release.yml", "r") as f:
    content = f.read()

hidden_imports = r"""            --hidden-import "uvicorn.logging" \
            --hidden-import "uvicorn.loops" \
            --hidden-import "uvicorn.loops.auto" \
            --hidden-import "uvicorn.protocols" \
            --hidden-import "uvicorn.protocols.http" \
            --hidden-import "uvicorn.protocols.http.auto" \
            --hidden-import "uvicorn.protocols.websockets" \
            --hidden-import "uvicorn.protocols.websockets.auto" \
            --hidden-import "uvicorn.lifespan" \
            --hidden-import "uvicorn.lifespan.on" \
            --hidden-import "pydantic" \
            --hidden-import "uvicorn" \
            --hidden-import "fastapi" \
            --hidden-import "sqlite3" \\"""

# Replace the specific hidden imports lines on Linux
content = re.sub(
    r'            --hidden-import "uvicorn" \\\n            --hidden-import "fastapi" \\\n            --hidden-import "sqlite3" \\',
    hidden_imports,
    content
)

# On Windows the continuation is a backtick `
hidden_imports_win = hidden_imports.replace("\\", "`")
content = re.sub(
    r'            --hidden-import "uvicorn" `\n            --hidden-import "fastapi" `\n            --hidden-import "sqlite3" `',
    hidden_imports_win,
    content
)

with open(".github/workflows/release.yml", "w") as f:
    f.write(content)
