#!/usr/bin/env python3
"""
Launcher script for the DevTools Suite backend.
This script sets up the environment and starts the FastAPI server.
"""
import os
import sys
import uvicorn
from pathlib import Path

def main():
    # Set desktop mode environment
    os.environ['APP_MODE'] = 'desktop'
    os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///./devtools.db'
    os.environ['CORS_ORIGINS'] = '*'
    
    # Get the directory where this script is located
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        base_dir = Path(sys._MEIPASS)
    else:
        # Running as script
        base_dir = Path(__file__).parent
    
    # Change to the base directory
    os.chdir(base_dir)
    
    print("🖥️  DevTools Suite Backend Starting...")
    print(f"📁 Working directory: {os.getcwd()}")
    print(f"🗄️  Database: SQLite (desktop mode)")
    print(f"🌐 Server: http://127.0.0.1:8001")
    
    # Import and start the server
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
