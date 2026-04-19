#!/bin/bash
clear
echo "=========================================="
echo "   ROBIT Local AI Research Suite"
echo "   Rogatekno Labs - Starting up..."
echo "=========================================="

# Check for Python
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Python3 not found. Please install Python 3.10+."
    exit 1
fi

# Auto-initialize .env if missing
if [ ! -f .env ]; then
    echo "[INIT] Creating .env from template..."
    cp .env.example .env
fi

# Install/Verify dependencies
echo "[1/2] Checking and installing dependencies..."
python3 -m pip install -r requirements.txt --quiet

# Start server
echo "[2/2] Launching ROBIT..."
python3 robit.py serve
