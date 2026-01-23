"""
Simplified Desktop-only FastAPI server for DevTools Suite
- No authentication required
- Basic/Pro license system
- SQLite database only
- All tools available based on license
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import platform
from auth import SavedItemCreate

# Initialize FastAPI app
app = FastAPI(title="DevTools Suite Desktop", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DB_PATH = "devtools_desktop.db"

def init_database():
    """Initialize SQLite database with required tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # License table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS app_license (
            id INTEGER PRIMARY KEY,
            license_type TEXT DEFAULT 'basic',
            activation_key TEXT,
            is_activated BOOLEAN DEFAULT 0,
            activated_at TEXT,
            machine_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Tool configurations
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tool_configs (
            id INTEGER PRIMARY KEY,
            tool_id TEXT UNIQUE,
            tool_name TEXT,
            is_premium BOOLEAN DEFAULT 0,
            description TEXT
        )
    """)
    
    # Collections (no user_id needed)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Folders
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            collection_id TEXT,
            parent_folder_id TEXT,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (collection_id) REFERENCES collections (id)
        )
    """)
    
    # Saved items
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_items (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            collection_id TEXT,
            folder_id TEXT,
            tool_id TEXT,
            name TEXT NOT NULL,
            data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (collection_id) REFERENCES collections (id)
        )
    """)
    
    # Favorites
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY,
            tool_id TEXT UNIQUE
        )
    """)
    
    # Insert default license if none exists
    cursor.execute("SELECT COUNT(*) FROM app_license")
    if cursor.fetchone()[0] == 0:
        machine_id = get_machine_id()
        cursor.execute("""
            INSERT INTO app_license (license_type, machine_id, created_at)
            VALUES ('basic', ?, ?)
        """, (machine_id, datetime.now(timezone.utc).isoformat()))
    
    # Insert default tool configurations
    cursor.execute("SELECT COUNT(*) FROM tool_configs")
    if cursor.fetchone()[0] == 0:
        default_tools = [
            ("json-beautifier", "JSON Beautifier", False, "Format and beautify JSON data"),
            ("json-validator", "JSON Validator", False, "Validate JSON structure"),
            ("api-tester", "REST API Tester", False, "Test REST API endpoints"),
            ("grpc-tester", "gRPC Tester", True, "Test gRPC services"),
            ("ui-recorder", "UI Automation Recorder", True, "Record browser interactions"),
        ]
        cursor.executemany("""
            INSERT INTO tool_configs (tool_id, tool_name, is_premium, description)
            VALUES (?, ?, ?, ?)
        """, default_tools)

    # Migration: Add user_id to saved_items if missing
    try:
        cursor.execute("SELECT user_id FROM saved_items LIMIT 1")
    except sqlite3.OperationalError:
        # Column missing, add it
        cursor.execute("ALTER TABLE saved_items ADD COLUMN user_id TEXT")
        cursor.execute("UPDATE saved_items SET user_id = 'desktop_user'")
        conn.commit()
    
    conn.commit()
    conn.close()

def get_machine_id():
    """Generate unique machine identifier"""
    machine_info = f"{platform.node()}-{platform.machine()}-{platform.processor()}"
    return hashlib.sha256(machine_info.encode()).hexdigest()[:16]

# Initialize database on startup
init_database()

# Pydantic models
class LicenseStatus(BaseModel):
    license_type: str
    is_activated: bool
    machine_id: str
    activation_key: Optional[str] = None

class ActivationRequest(BaseModel):
    activation_key: str

class ToolConfig(BaseModel):
    tool_id: str
    tool_name: str
    is_premium: bool
    description: str

class Collection(BaseModel):
    id: str
    name: str
    description: str = ""
    created_at: str

class CollectionCreate(BaseModel):
    name: str
    description: str = ""

class FolderCreate(BaseModel):
    collection_id: str
    name: str
    parent_folder_id: Optional[str] = None

class FolderUpdate(BaseModel):
    name: str
    collection_id: str
    parent_folder_id: Optional[str] = None

class JSONBeautifyRequest(BaseModel):
    json_string: str
    indent: int = 2

class JSONBeautifyResponse(BaseModel):
    beautified: str
    valid: bool
    error: Optional[str] = None

class SavedItemBulkCreate(BaseModel):
    items: List[SavedItemCreate]

# License endpoints
@app.get("/api/license/status", response_model=LicenseStatus)
async def get_license_status():
    """Get current license status"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT license_type, is_activated, machine_id, activation_key FROM app_license LIMIT 1")
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return LicenseStatus(
            license_type=result[0],
            is_activated=bool(result[1]),
            machine_id=result[2],
            activation_key=result[3]
        )
    else:
        machine_id = get_machine_id()
        return LicenseStatus(
            license_type="basic",
            is_activated=False,
            machine_id=machine_id
        )

@app.post("/api/license/activate")
async def activate_license(request: ActivationRequest):
    """Activate pro license with activation key"""
    # Simple validation - in production, validate against your license server
    if len(request.activation_key.replace("-", "")) < 20:
        raise HTTPException(status_code=400, detail="Invalid activation key format")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Update license
    cursor.execute("""
        UPDATE app_license 
        SET license_type = 'pro', 
            is_activated = 1, 
            activation_key = ?,
            activated_at = ?
        WHERE id = (SELECT id FROM app_license LIMIT 1)
    """, (request.activation_key, datetime.now(timezone.utc).isoformat()))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "License activated successfully!", "license_type": "pro"}

@app.post("/api/license/deactivate")
async def deactivate_license():
    """Deactivate and return to basic license"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE app_license 
        SET license_type = 'basic', 
            is_activated = 0, 
            activation_key = NULL,
            activated_at = NULL
    """)
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "License deactivated", "license_type": "basic"}

# Tool configuration endpoints
@app.get("/api/tools/config")
async def get_tools_config():
    """Get all tool configurations"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT tool_id, tool_name, is_premium, description FROM tool_configs")
    tools = []
    for row in cursor.fetchall():
        tools.append({
            "tool_id": row[0],
            "tool_name": row[1],
            "is_premium": bool(row[2]),
            "description": row[3]
        })
    
    conn.close()
    return {"tools": tools}

@app.get("/api/tools/access/{tool_id}")
async def check_tool_access(tool_id: str):
    """Check if tool is accessible based on current license"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get tool info
    cursor.execute("SELECT is_premium FROM tool_configs WHERE tool_id = ?", (tool_id,))
    tool_result = cursor.fetchone()
    
    if not tool_result:
        conn.close()
        raise HTTPException(status_code=404, detail="Tool not found")
    
    is_premium_tool = bool(tool_result[0])
    
    # Get license info
    cursor.execute("SELECT license_type, is_activated FROM app_license LIMIT 1")
    license_result = cursor.fetchone()
    conn.close()
    
    if not is_premium_tool:
        return {"has_access": True, "is_premium_tool": False, "license_type": "basic"}
    
    # Premium tool - check license
    if license_result and (license_result[0] == "pro" or license_result[1]):
        return {"has_access": True, "is_premium_tool": True, "license_type": license_result[0]}
    else:
        return {"has_access": False, "is_premium_tool": True, "license_type": "basic"}

# JSON Tools
@app.post("/api/beautify", response_model=JSONBeautifyResponse)
async def beautify_json(request: JSONBeautifyRequest):
    """Beautify JSON string"""
    try:
        parsed = json.loads(request.json_string)
        beautified = json.dumps(parsed, indent=request.indent, ensure_ascii=False)
        return JSONBeautifyResponse(beautified=beautified, valid=True)
    except json.JSONDecodeError as e:
        return JSONBeautifyResponse(
            beautified=request.json_string,
            valid=False,
            error=str(e)
        )

# Collections endpoints (simplified - no user authentication)
@app.get("/api/collections/list")
async def list_collections():
    """List all collections"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, description, created_at FROM collections ORDER BY created_at DESC")
    collections = []
    for row in cursor.fetchall():
        collections.append({
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "created_at": row[3]
        })
    
    conn.close()
    return {"collections": collections}

@app.post("/api/collections/create")
async def create_collection(collection: CollectionCreate):
    """Create a new collection"""
    collection_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO collections (id, name, description, created_at)
        VALUES (?, ?, ?, ?)
    """, (collection_id, collection.name, collection.description, created_at))
    
    conn.commit()
    conn.close()
    
    return {
        "id": collection_id,
        "name": collection.name,
        "description": collection.description,
        "created_at": created_at
    }

@app.delete("/api/collections/{collection_id}")
async def delete_collection(collection_id: str):
    """Delete a collection and all its contents"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Delete saved items
    cursor.execute("DELETE FROM saved_items WHERE collection_id = ?", (collection_id,))
    # Delete folders
    cursor.execute("DELETE FROM folders WHERE collection_id = ?", (collection_id,))
    # Delete collection
    cursor.execute("DELETE FROM collections WHERE id = ?", (collection_id,))
    
    conn.commit()
    conn.close()
    
    return {"success": True}

# Folder endpoints
@app.get("/api/folders/list/{collection_id}")
async def list_folders(collection_id: str):
    """List all folders in a collection"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, collection_id, parent_folder_id, name, created_at
        FROM folders
        WHERE collection_id = ?
        ORDER BY created_at
    """, (collection_id,))
    
    folders = []
    for row in cursor.fetchall():
        folders.append({
            "id": row[0],
            "collection_id": row[1],
            "parent_folder_id": row[2],
            "name": row[3],
            "created_at": row[4]
        })
    
    conn.close()
    return {"folders": folders}

@app.post("/api/folders/create")
async def create_folder(folder: FolderCreate):
    """Create a new folder"""
    folder_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    user_id = "desktop_user"  # Desktop mode uses default user
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO folders (id, user_id, collection_id, parent_folder_id, name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (folder_id, user_id, folder.collection_id, folder.parent_folder_id, folder.name, created_at))
    
    conn.commit()
    conn.close()
    
    return {
        "id": folder_id,
        "collection_id": folder.collection_id,
        "parent_folder_id": folder.parent_folder_id,
        "name": folder.name,
        "created_at": created_at
    }

@app.put("/api/folders/{folder_id}")
async def update_folder(folder_id: str, folder: FolderUpdate):
    """Update a folder"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE folders
        SET name = ?, parent_folder_id = ?
        WHERE id = ?
    """, (folder.name, folder.parent_folder_id, folder_id))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "id": folder_id}

@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: str):
    """Delete a folder and all its contents"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Delete saved items in this folder
    cursor.execute("DELETE FROM saved_items WHERE folder_id = ?", (folder_id,))
    
    # Delete subfolders recursively (get all subfolders first)
    cursor.execute("SELECT id FROM folders WHERE parent_folder_id = ?", (folder_id,))
    subfolders = [row[0] for row in cursor.fetchall()]
    
    for subfolder_id in subfolders:
        # Delete saved items in subfolders
        cursor.execute("DELETE FROM saved_items WHERE folder_id = ?", (subfolder_id,))
    
    # Delete all subfolders
    cursor.execute("DELETE FROM folders WHERE parent_folder_id = ?", (folder_id,))
    
    # Delete the folder itself
    cursor.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
    
    conn.commit()
    conn.close()
    
    return {"success": True}

# Saved Items endpoints
@app.post("/api/saved-items/create")
async def create_saved_item(item: SavedItemCreate):
    """Save a tool state to a collection"""
    item_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    user_id = "desktop_user"  # Desktop mode uses default user
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO saved_items (id, user_id, collection_id, folder_id, name, tool_id, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (item_id, user_id, item.collection_id, item.folder_id, item.name, item.tool_id, json.dumps(item.tool_data), created_at))
    
    conn.commit()
    conn.close()
    
    return {
        "id": item_id,
        "user_id": user_id,
        "collection_id": item.collection_id,
        "folder_id": item.folder_id,
        "name": item.name,
        "tool_id": item.tool_id,
        "tool_data": item.tool_data,
        "created_at": created_at
    }

@app.post("/api/saved-items/create-bulk")
async def create_saved_items_bulk(bulk_data: SavedItemBulkCreate):
    """Bulk create saved items"""
    items = bulk_data.items
    created_items = []

    created_at = datetime.now(timezone.utc).isoformat()
    user_id = "desktop_user"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    insert_data = []

    for item in items:
        item_id = str(uuid.uuid4())
        insert_data.append((
            item_id,
            user_id,
            item.collection_id,
            item.folder_id,
            item.name,
            item.tool_id,
            json.dumps(item.tool_data),
            created_at
        ))

        created_items.append({
            "id": item_id,
            "user_id": user_id,
            "collection_id": item.collection_id,
            "folder_id": item.folder_id,
            "name": item.name,
            "tool_id": item.tool_id,
            "tool_data": item.tool_data,
            "created_at": created_at
        })

    cursor.executemany("""
        INSERT INTO saved_items (id, user_id, collection_id, folder_id, name, tool_id, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, insert_data)

    conn.commit()
    conn.close()

    return {"items": created_items, "count": len(created_items)}

@app.get("/api/saved-items/list/{collection_id}")
async def list_saved_items(collection_id: str, folder_id: Optional[str] = None):
    """List saved items in a collection/folder"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if folder_id:
        cursor.execute("""
            SELECT id, user_id, collection_id, folder_id, name, tool_id, data, created_at
            FROM saved_items
            WHERE collection_id = ? AND folder_id = ?
            ORDER BY created_at DESC
        """, (collection_id, folder_id))
    else:
        cursor.execute("""
            SELECT id, user_id, collection_id, folder_id, name, tool_id, data, created_at
            FROM saved_items
            WHERE collection_id = ? AND folder_id IS NULL
            ORDER BY created_at DESC
        """, (collection_id,))
    
    items = []
    for row in cursor.fetchall():
        items.append({
            "id": row[0],
            "user_id": row[1],
            "collection_id": row[2],
            "folder_id": row[3],
            "name": row[4],
            "tool_id": row[5],
            "tool_data": json.loads(row[6]) if row[6] else {},
            "created_at": row[7]
        })
    
    conn.close()
    return {"items": items}

@app.put("/api/saved-items/{item_id}")
async def update_saved_item(item_id: str, item: SavedItemCreate):
    """Update a saved item"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE saved_items
        SET name = ?, data = ?, collection_id = ?, folder_id = ?
        WHERE id = ?
    """, (item.name, json.dumps(item.tool_data), item.collection_id, item.folder_id, item_id))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "id": item_id}

@app.delete("/api/saved-items/{item_id}")
async def delete_saved_item(item_id: str):
    """Delete a saved item"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM saved_items WHERE id = ?", (item_id,))
    
    conn.commit()
    conn.close()
    
    return {"success": True}

# Favorites endpoints
@app.get("/api/favorites/list")
async def list_favorites():
    """List favorite tools"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Desktop mode uses default user_id
    cursor.execute("SELECT tool_id FROM favorites WHERE user_id = ?", ("desktop_user",))
    favorites = [row[0] for row in cursor.fetchall()]
    
    conn.close()
    return {"favorites": favorites}

class FavoriteRequest(BaseModel):
    tool_id: str

@app.post("/api/favorites/add")
async def add_favorite(request: FavoriteRequest):
    """Add tool to favorites"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Desktop mode uses default user_id
    cursor.execute("INSERT OR IGNORE INTO favorites (user_id, tool_id) VALUES (?, ?)", ("desktop_user", request.tool_id))
    conn.commit()
    conn.close()
    
    return {"success": True}

@app.post("/api/favorites/remove")
async def remove_favorite(request: FavoriteRequest):
    """Remove tool from favorites"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Desktop mode uses default user_id
    cursor.execute("DELETE FROM favorites WHERE user_id = ? AND tool_id = ?", ("desktop_user", request.tool_id))
    conn.commit()
    conn.close()
    
    return {"success": True}

# Health check
@app.get("/")
async def root():
    return {"message": "DevTools Suite Desktop API", "version": "1.0.0", "mode": "desktop"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
