#!/bin/bash
set -e

echo "==============================================="
echo "   ROBIT Local Release Builder (Linux/Unix)"
echo "==============================================="

# 1. Pastikan virtual environment aktif
if [ ! -d "venv" ]; then
    echo "[!] Virtual environment 'venv' tidak ditemukan. Pastikan Anda berada di root project dan sudah menginstall venv."
    exit 1
fi

echo "[1/4] Mengaktifkan virtual environment & install dependencies..."
source venv/bin/activate
pip install -r requirements.txt
pip install pyinstaller

# 2. Build Python Backend menggunakan PyInstaller
echo "[2/4] Build Python backend menggunakan PyInstaller..."
RAPIDOCR_PATH=$(python3 -c "import rapidocr_onnxruntime, os; print(os.path.dirname(rapidocr_onnxruntime.__file__))")

pyinstaller --noconfirm --onefile --console \
  --name "robit-backend-x86_64-unknown-linux-gnu" \
  --add-data "core:core" \
  --add-data "routers:routers" \
  --add-data "services:services" \
  --add-data "use_cases:use_cases" \
  --add-data "$RAPIDOCR_PATH:rapidocr_onnxruntime" \
  --collect-all "rapidocr_onnxruntime" \
  --hidden-import "pyclipper" \
  --hidden-import "shapely" \
  --hidden-import "cv2" \
  --hidden-import "onnxruntime" \
  --hidden-import "yaml" \
  --hidden-import "uvicorn.logging" \
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
  --hidden-import "sqlite3" \
  --hidden-import "turbovec" \
  --hidden-import "sentence_transformers" \
  main.py

# 3. Pindahkan hasil build backend ke folder tauri
echo "[3/4] Menyiapkan backend untuk Tauri..."
mkdir -p ui/src-tauri/bin
cp dist/robit-backend-x86_64-unknown-linux-gnu ui/src-tauri/bin/
chmod +x ui/src-tauri/bin/robit-backend-x86_64-unknown-linux-gnu

# 4. Build Frontend & Tauri App
echo "[4/4] Membangun antarmuka desktop (Tauri)..."
cd ui
npm install
npm run tauri build

echo "==============================================="
echo "   Build Selesai!"
echo "   File eksekusi (.AppImage / .deb) bisa ditemukan di:"
echo "   ui/src-tauri/target/release/bundle/"
echo "==============================================="
