#!/usr/bin/env python3
"""
Desktop launcher for DevTools Suite - Uses unified server.py in desktop mode
"""
import os
import sys
import uvicorn
from pathlib import Path

def main():
    # Set desktop mode environment BEFORE importing server
    os.environ['APP_MODE'] = 'desktop'
    os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///./devtools_desktop.db'
    os.environ['CORS_ORIGINS'] = '*'
    
    print("🖥️  DevTools Suite Desktop Starting...")
    print("📁 Working directory:", os.getcwd())
    print("🗄️  Database: SQLite (desktop mode)")
    print("🌐 Server: http://127.0.0.1:8001")
    print("🔑 Authentication: Disabled (desktop mode)")
    
    # Import and start the unified server in desktop mode
    from server import app
    
    # Start uvicorn server
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8001,
        log_level="info",
        access_log=False
    )

if __name__ == "__main__":
    main()
