#!/bin/bash
echo "Building Python Backend with PyInstaller..."
source venv/bin/activate
pip install pyinstaller

# Detect architecture for Tauri sidecar naming
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    TARGET="x86_64-unknown-linux-gnu"
elif [ "$ARCH" = "aarch64" ]; then
    TARGET="aarch64-unknown-linux-gnu"
else
    TARGET="$ARCH-unknown-linux-gnu"
fi

echo "Target triple for Tauri: $TARGET"

# Find rapidocr package path
RAPIDOCR_PATH=$(python3 -c "import rapidocr_onnxruntime, os; print(os.path.dirname(rapidocr_onnxruntime.__file__))")
echo "rapidocr path: $RAPIDOCR_PATH"

# Build single executable
pyinstaller --noconfirm --onedir --console \
    --name "robit-backend-$TARGET" \
    --add-data "core:core" \
    --add-data "routers:routers" \
    --add-data "services:services" \
    --add-data "use_cases:use_cases" \
    --add-data "$RAPIDOCR_PATH:rapidocr_onnxruntime" \
    --hidden-import "uvicorn" \
    --hidden-import "fastapi" \
    --hidden-import "sqlite3" \
    main.py

echo "Build complete. Executable is in dist/robit-backend-$TARGET"
