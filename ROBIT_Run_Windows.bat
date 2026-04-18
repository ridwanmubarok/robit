@echo off
title ROBIT AI - Rogatekno Labs
echo ==========================================
echo    ROBIT Local AI Research Suite
echo    Rogatekno Labs - Starting up...
echo ==========================================

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. 
    echo Please install Python 3.10+ from python.org and add it to PATH.
    pause
    exit /b
)

:: Auto-initialize .env if missing
if not exist .env (
    echo [INIT] Creating .env from template...
    copy .env.example .env
)

:: Install/Verify dependencies
echo [1/2] Checking and installing dependencies...
python -m pip install -r requirements.txt --quiet

:: Start server
echo [2/2] Launching ROBIT...
python robit.py serve

pause
