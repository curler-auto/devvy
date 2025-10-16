#!/usr/bin/env python3
"""
Temporary License Activator API
Standalone FastAPI server for license activation during development
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import sqlite3
from datetime import datetime
import uvicorn
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="License Activator API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DB_PATH = "devtools.db"

def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create license table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS licenses (
            machine_id TEXT PRIMARY KEY,
            machine_name TEXT,
            activation_key TEXT,
            tool_config TEXT,
            activated_at TEXT
        )
    """)
    
    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {DB_PATH}")

# Models
class LicenseActivation(BaseModel):
    activationKey: str
    machineId: str
    machineName: str

class LicenseConfig(BaseModel):
    toolConfig: dict
    machineId: str
    activationKey: str
    activatedAt: str

@app.on_event("startup")
async def startup_event():
    init_db()
    logger.info("License Activator API started on http://127.0.0.1:8001")

@app.get("/")
async def root():
    return {
        "service": "License Activator API",
        "status": "running",
        "endpoints": [
            "/api/license/activate",
            "/api/license/config",
        ]
    }

@app.post("/api/license/activate")
async def activate_license(activation: LicenseActivation):
    """
    Activate license with key
    Test keys:
    - PRO-TEST-KEY: All premium tools
    - PREMIUM-TEST-KEY: Selected premium tools
    - FREE-TEST-KEY: Free tools only
    """
    try:
        key = activation.activationKey.strip()
        logger.info(f"Activation request from {activation.machineName} ({activation.machineId[:8]}...)")
        
        # Validate key and determine license type
        if key.startswith("PRO-"):
            tool_config = {
                "version": "1.0.0",
                "isActivated": True,
                "licenseType": "pro",
                "activatedTools": ["all"],
                "tools": []
            }
            message = "🎉 Pro license activated! All premium tools unlocked."
            logger.info(f"✅ PRO license activated for {activation.machineName}")
            
        elif key.startswith("PREMIUM-"):
            tool_config = {
                "version": "1.0.0",
                "isActivated": True,
                "licenseType": "premium",
                "activatedTools": [
                    "rest-api-tester",
                    "grpc-tester",
                    "ui-recorder",
                    "diff-checker",
                    "sql-formatter",
                    "image-optimizer"
                ],
                "tools": []
            }
            message = "✨ Premium license activated! Selected premium tools unlocked."
            logger.info(f"✅ PREMIUM license activated for {activation.machineName}")
            
        elif key.startswith("FREE-"):
            tool_config = {
                "version": "1.0.0",
                "isActivated": False,
                "licenseType": "free",
                "activatedTools": [],
                "tools": []
            }
            message = "ℹ️ Free license - only free tools available."
            logger.info(f"ℹ️ FREE license for {activation.machineName}")
            
        else:
            logger.warning(f"❌ Invalid key attempted: {key[:10]}...")
            return {
                "success": False,
                "message": "Invalid activation key. Please check and try again.\n\nTest keys:\n• PRO-TEST-KEY\n• PREMIUM-TEST-KEY"
            }
        
        # Save to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO licenses 
            (machine_id, machine_name, activation_key, tool_config, activated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            activation.machineId,
            activation.machineName,
            activation.activationKey,
            json.dumps(tool_config),
            datetime.utcnow().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "toolConfig": tool_config,
            "message": message
        }
        
    except Exception as e:
        logger.error(f"❌ Activation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/license/config")
async def save_license_config(config: LicenseConfig):
    """Save license configuration"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO licenses 
            (machine_id, machine_name, activation_key, tool_config, activated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            config.machineId,
            "",
            config.activationKey,
            json.dumps(config.toolConfig),
            config.activatedAt
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Config saved for machine {config.machineId[:8]}...")
        return {"success": True, "message": "License configuration saved"}
        
    except Exception as e:
        logger.error(f"❌ Save error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/license/config")
async def get_license_config(machineId: str):
    """Get license configuration for a machine"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT tool_config, activated_at 
            FROM licenses 
            WHERE machine_id = ?
        """, (machineId,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            tool_config = json.loads(result[0])
            logger.info(f"✅ License found for machine {machineId[:8]}... ({tool_config.get('licenseType', 'unknown')})")
            return {
                "success": True,
                "toolConfig": tool_config,
                "activatedAt": result[1]
            }
        else:
            logger.info(f"ℹ️ No license found for machine {machineId[:8]}...")
            return {
                "success": False,
                "message": "No license found for this machine"
            }
            
    except Exception as e:
        logger.error(f"❌ Get config error: {str(e)}")
        return {
            "success": False,
            "message": "No license found"
        }

@app.delete("/api/license/config")
async def deactivate_license(machineId: str):
    """Deactivate license for a machine"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM licenses WHERE machine_id = ?", (machineId,))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ License deactivated for machine {machineId[:8]}...")
        return {"success": True, "message": "License deactivated"}
        
    except Exception as e:
        logger.error(f"❌ Deactivate error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("=" * 60)
    print("🔑 License Activator API")
    print("=" * 60)
    print("Starting server on http://127.0.0.1:8001")
    print("\nTest Keys:")
    print("  • PRO-TEST-KEY          → All premium tools")
    print("  • PREMIUM-TEST-KEY      → Selected premium tools")
    print("  • FREE-TEST-KEY         → Free tools only")
    print("\nPress Ctrl+C to stop")
    print("=" * 60)
    
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
