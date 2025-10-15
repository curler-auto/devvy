#!/usr/bin/env python3
"""
Desktop launcher for DevTools Suite - Simplified version without authentication
"""
import os
import sys
import uvicorn
from pathlib import Path

def main():
    print("🖥️  DevTools Suite Desktop Starting...")
    print("📁 Working directory:", os.getcwd())
    print("🗄️  Database: SQLite (desktop mode)")
    print("🌐 Server: http://127.0.0.1:8001")
    print("🔑 License: Basic (no authentication required)")
    
    # Import and start the simplified desktop server
    from server_desktop import app
    
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
