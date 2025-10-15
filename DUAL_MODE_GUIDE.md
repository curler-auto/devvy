# Dual Mode Architecture Guide

This application supports two deployment modes:
1. **Web App Mode** - Uses MongoDB (multi-user, cloud deployment)
2. **Desktop App Mode** - Uses SQLite (single-user, Electron app)

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  FastAPI Server                  │
│                   (server.py)                    │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│              Database Abstraction                │
│               (DatabaseBase)                     │
└─────────┬──────────────────────┬─────────────────┘
          │                      │
          ▼                      ▼
┌──────────────────┐    ┌──────────────────┐
│  MongoDBDatabase │    │  SQLiteDatabase  │
│   (Web Mode)     │    │ (Desktop Mode)   │
└──────────────────┘    └──────────────────┘
```

## Configuration

### Web Mode (Default)

**Environment Variables:**
```bash
APP_MODE=web
MONGO_URL=mongodb://localhost:27017
DB_NAME=devtools
```

**Run:**
```bash
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Desktop Mode (Electron)

**Environment Variables:**
```bash
APP_MODE=desktop
DATABASE_URL=sqlite+aiosqlite:///./devtools.db
```

**Run:**
```bash
cd /app/backend
uvicorn server:app --host 127.0.0.1 --port 8001
```

## Key Files

### Database Abstraction Layer
- `/app/backend/database/base.py` - Abstract interface
- `/app/backend/database/mongodb.py` - MongoDB implementation
- `/app/backend/database/sqlite.py` - SQLite implementation
- `/app/backend/database/models_sqlite.py` - SQLAlchemy models
- `/app/backend/database/__init__.py` - Factory pattern

### Service Layer
- `/app/backend/db_service.py` - High-level database service

## Using the Database in Code

### Current server.py (MongoDB direct access):
```python
# OLD WAY (still works in web mode)
user = await db.users.find_one({"email": email})
```

### New abstracted way (works in both modes):
```python
from db_service import get_db

# Get database instance
db = await get_db()

# Use abstraction methods
user = await db.get_user_by_email(email)
```

## Migration Steps

### 1. Keep Web Mode Working (No Changes Needed)
The current code will continue to work in web mode with `APP_MODE=web`.

### 2. To Use Abstraction Layer
Update server.py routes to use `db_service.get_db()` instead of direct MongoDB calls.

Example:
```python
# Before (MongoDB only):
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    ...

# After (Both modes):
from db_service import get_db

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    db = await get_db()
    user = await db.get_user_by_email(user_data.email)
    ...
```

## Electron App Integration

### In Electron main.js:
```javascript
const { app } = require('electron');
const path = require('path');

// Set database location in user data directory
const dbPath = path.join(app.getPath('userData'), 'devtools.db');
process.env.APP_MODE = 'desktop';
process.env.DATABASE_URL = `sqlite+aiosqlite:///${dbPath}`;

// Start FastAPI backend as subprocess
const backend = spawn('python', ['-m', 'uvicorn', 'server:app', '--port', '8001']);
```

## Data Migration (MongoDB → SQLite)

### Export from MongoDB:
```python
import asyncio
from database.mongodb import MongoDBDatabase
import json

async def export():
    db = MongoDBDatabase('mongodb://localhost:27017', 'devtools')
    await db.connect()
    
    data = {
        'users': await db.db.users.find({}, {"_id": 0}).to_list(None),
        'collections': await db.db.collections.find({}, {"_id": 0}).to_list(None),
        # ... export all collections
    }
    
    with open('export.json', 'w') as f:
        json.dump(data, f)

asyncio.run(export())
```

### Import to SQLite:
```python
import asyncio
from database.sqlite import SQLiteDatabase
import json

async def import_data():
    db = SQLiteDatabase('sqlite+aiosqlite:///./devtools.db')
    await db.connect()
    
    with open('export.json', 'r') as f:
        data = json.load(f)
    
    for user in data['users']:
        await db.create_user(user)
    
    for collection in data['collections']:
        await db.create_collection(collection['user_id'], collection)

asyncio.run(import_data())
```

## Testing

### Test Web Mode:
```bash
export APP_MODE=web
pytest tests/
```

### Test Desktop Mode:
```bash
export APP_MODE=desktop
pytest tests/
```

## Benefits

✅ **Web Mode**:
- Multi-user support
- Cloud deployment
- Scalable
- Real-time sync

✅ **Desktop Mode**:
- No server dependency
- Single-user optimized
- Offline capable
- Data privacy
- Fast startup

## Future Enhancements

1. **Sync Feature**: Desktop → Cloud sync option
2. **Multi-profile**: Multiple SQLite databases for different users
3. **Export/Import**: Easy data portability between modes
4. **Hybrid Mode**: Local SQLite with cloud backup
