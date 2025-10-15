# 🖥️ Electron Desktop App Conversion Guide

## Overview
Convert web app → Standalone Electron desktop app with activation key licensing

---

## 📋 Architecture Changes

### Current (Web App)
```
Browser → React Frontend → FastAPI Backend → MongoDB
         ↓
    User Authentication (JWT)
    Organization Licenses (Free/Premium)
    Multi-tenant (multiple users)
```

### Target (Electron App)
```
Electron Window → React Frontend → Local Backend → SQLite/MongoDB Local
                ↓
           Activation Key Only
           Single User (local machine)
           No authentication required
```

---

## 🔧 Required Conversions

### 1. **Remove User Authentication System**

**Files to Modify/Remove:**
- ❌ Remove: `/backend/auth.py` (User, UserCreate, UserLogin, Token models)
- ❌ Remove: `/frontend/src/AuthContext.js`
- ❌ Remove: `/frontend/src/components/AuthScreen.js`
- ❌ Remove: All JWT token logic

**Keep Only:**
- ✅ Activation key validation
- ✅ License tier checking (activated vs non-activated)

---

### 2. **Simplified Licensing Model**

**Database Schema Changes:**

**Before (Web App):**
```javascript
// Multiple collections
users { email, password_hash, organization_id }
organizations { license_tier, max_licenses }
collections { user_id, name }
folders { user_id, collection_id }
saved_items { user_id, tool_id }
```

**After (Electron App):**
```javascript
// Single machine, no users
app_license {
  activation_key: "XXXXX-XXXXX-XXXXX",
  is_activated: true/false,
  activated_at: "2025-10-15",
  tier: "free" / "premium",
  machine_id: "unique-machine-identifier"
}

collections { name, description }  // No user_id
folders { collection_id, name }    // No user_id
saved_items { tool_id, data }      // No user_id
tool_configs { tool_id, is_premium }
```

---

### 3. **Electron App Structure**

```
electron-devtools/
├── electron/
│   ├── main.js              ← Electron main process
│   ├── preload.js           ← Security bridge
│   └── backend-launcher.js  ← Start FastAPI server
├── frontend/                ← Your React app (minimal changes)
├── backend/                 ← Your FastAPI (simplified)
├── database/
│   └── local.db            ← SQLite database (or embedded MongoDB)
├── package.json            ← Electron packaging config
└── electron-builder.yml    ← Build configuration
```

---

## 🚀 Implementation Steps

### Step 1: Install Electron Dependencies

```bash
cd frontend
npm install electron electron-builder concurrently --save-dev
npm install electron-is-dev
```

### Step 2: Create Electron Main Process

**File: `/electron/main.js`**
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

// Start FastAPI backend
function startBackend() {
  const backendPath = path.join(__dirname, '../backend');
  backendProcess = spawn('python', ['-m', 'uvicorn', 'server:app', '--port', '8001'], {
    cwd: backendPath,
    shell: true
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });
}

function createWindow() {
  // Start backend first
  startBackend();

  // Create browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load React app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../frontend/build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // Kill backend process
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

---

### Step 3: Simplify Backend (Remove Auth)

**File: `/backend/server_electron.py`** (create new simplified version)

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone
import hashlib
import platform

app = FastAPI()

# Local MongoDB or SQLite
DATABASE_PATH = "./database/local.db"
mongo_client = AsyncIOMotorClient(f"mongodb://localhost:27017")
db = mongo_client.devtools_local

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== LICENSE MODELS ==========

class AppLicense(BaseModel):
    activation_key: str
    is_activated: bool
    tier: str  # "free" or "premium"
    machine_id: str
    activated_at: str

class ActivationRequest(BaseModel):
    activation_key: str


# ========== ACTIVATION ROUTES ==========

def get_machine_id():
    """Generate unique machine identifier"""
    machine_info = f"{platform.node()}-{platform.machine()}-{platform.processor()}"
    return hashlib.sha256(machine_info.encode()).hexdigest()[:16]

def validate_activation_key(key: str) -> bool:
    """
    Validate activation key format and against server
    Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
    """
    # Basic format check
    parts = key.split('-')
    if len(parts) != 5 or not all(len(p) == 5 for p in parts):
        return False
    
    # TODO: Call your license server API to validate
    # For now, accept any properly formatted key
    return True

@app.get("/api/license/status")
async def get_license_status():
    """Get current activation status"""
    license_doc = await db.app_license.find_one({}, {"_id": 0})
    
    if not license_doc:
        # No license stored, return free tier
        return {
            "is_activated": False,
            "tier": "free",
            "machine_id": get_machine_id()
        }
    
    return license_doc

@app.post("/api/license/activate")
async def activate_license(request: ActivationRequest):
    """Activate app with key"""
    
    # Validate key format and with server
    if not validate_activation_key(request.activation_key):
        raise HTTPException(status_code=400, detail="Invalid activation key")
    
    machine_id = get_machine_id()
    
    # Store activation
    license_doc = {
        "activation_key": request.activation_key,
        "is_activated": True,
        "tier": "premium",
        "machine_id": machine_id,
        "activated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update or insert
    await db.app_license.delete_many({})  # Only one license per machine
    await db.app_license.insert_one(license_doc)
    
    return {
        "success": True,
        "message": "App activated successfully!",
        "tier": "premium"
    }

@app.post("/api/license/deactivate")
async def deactivate_license():
    """Deactivate and return to free tier"""
    await db.app_license.delete_many({})
    return {"success": True, "message": "License deactivated"}


# ========== TOOL CONFIG (No user_id) ==========

@app.get("/api/tools/config")
async def get_tools_config():
    """Get tool configurations (no auth needed)"""
    configs = await db.tool_configs.find({}, {"_id": 0}).to_list(100)
    
    if not configs:
        # Default config
        default_tools = [
            {"tool_id": "json-beautifier", "tool_name": "JSON Beautifier", "is_premium": False},
            {"tool_id": "json-validator", "tool_name": "JSON Validator", "is_premium": False},
            {"tool_id": "api-tester", "tool_name": "API Tester", "is_premium": True},
        ]
        await db.tool_configs.insert_many(default_tools)
        configs = default_tools
    
    return {"tools": configs}

@app.get("/api/tools/check-access/{tool_id}")
async def check_tool_access(tool_id: str):
    """Check if user can access tool based on license"""
    # Get tool config
    tool_config = await db.tool_configs.find_one({"tool_id": tool_id}, {"_id": 0})
    
    if not tool_config or not tool_config.get('is_premium', False):
        return {"has_access": True, "is_premium_tool": False}
    
    # Check license
    license_doc = await db.app_license.find_one({}, {"_id": 0})
    is_activated = license_doc and license_doc.get('is_activated', False)
    
    return {
        "has_access": is_activated,
        "is_premium_tool": True,
        "tier": license_doc.get('tier', 'free') if license_doc else 'free'
    }


# ========== COLLECTIONS (No user_id) ==========

@app.post("/api/collections/create")
async def create_collection(data: dict):
    collection = {
        "id": str(uuid.uuid4()),
        "name": data['name'],
        "description": data.get('description', ''),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.collections.insert_one(collection)
    return collection

@app.get("/api/collections/list")
async def list_collections():
    collections = await db.collections.find({}, {"_id": 0}).to_list(1000)
    return {"collections": collections}

# ... Similar simplification for folders and saved_items
# Remove all user_id checks and filters

```

---

### Step 4: Frontend Changes (Minimal)

**Remove Authentication:**

**File: `/frontend/src/App.js`**

```javascript
// Remove AuthProvider wrapper
// Remove login/logout logic
// Remove user state

// Add license checking
const [licenseStatus, setLicenseStatus] = useState({ is_activated: false });

useEffect(() => {
  checkLicenseStatus();
}, []);

const checkLicenseStatus = async () => {
  const response = await axios.get(`${API}/license/status`);
  setLicenseStatus(response.data);
};
```

**Add Activation UI:**

**File: `/frontend/src/components/ActivationDialog.js`**

```javascript
export default function ActivationDialog({ open, onClose }) {
  const [activationKey, setActivationKey] = useState('');
  
  const handleActivate = async () => {
    try {
      await axios.post(`${API}/license/activate`, {
        activation_key: activationKey
      });
      toast.success('App activated successfully!');
      onClose();
      window.location.reload();
    } catch (error) {
      toast.error('Invalid activation key');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate Premium Features</DialogTitle>
        </DialogHeader>
        <div>
          <Input
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
          />
          <Button onClick={handleActivate}>Activate</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Step 5: Package Configuration

**File: `/package.json`** (in root)

```json
{
  "name": "devtools-suite",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"cd frontend && npm start\" \"electron .\"",
    "electron:build": "cd frontend && npm run build && electron-builder",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  },
  "build": {
    "appId": "com.devtools.suite",
    "productName": "DevTools Suite",
    "files": [
      "electron/**/*",
      "frontend/build/**/*",
      "backend/**/*"
    ],
    "extraResources": [
      {
        "from": "backend",
        "to": "backend"
      }
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  }
}
```

---

## 🔐 Activation Key System

### Server-Side Validation (Optional Cloud Service)

**Create License Server API:**

```python
# license-server.py (separate service)
from fastapi import FastAPI, HTTPException
import hmac
import hashlib

app = FastAPI()

SECRET_KEY = "your-secret-key"

def generate_activation_key(license_id: str) -> str:
    """Generate activation key from license ID"""
    signature = hmac.new(
        SECRET_KEY.encode(),
        license_id.encode(),
        hashlib.sha256
    ).hexdigest()[:20]
    
    # Format as XXXXX-XXXXX-XXXXX-XXXXX
    formatted = '-'.join([signature[i:i+5].upper() for i in range(0, 20, 5)])
    return formatted

@app.post("/validate-key")
async def validate_key(activation_key: str, machine_id: str):
    """Validate activation key and machine binding"""
    # Check in database
    # Verify not used on too many machines
    # Return validation result
    pass
```

---

## 📦 Building & Distribution

### Development Mode:
```bash
npm run electron:dev
```

### Build for Production:

**Windows:**
```bash
npm run dist -- --win
```

**macOS:**
```bash
npm run dist -- --mac
```

**Linux:**
```bash
npm run dist -- --linux
```

**Output:**
- Windows: `.exe` installer in `dist/`
- macOS: `.dmg` in `dist/`
- Linux: `.AppImage` in `dist/`

---

## 🎯 Feature Comparison

| Feature | Web App | Electron App |
|---------|---------|--------------|
| **Authentication** | Email/Password | None (local only) |
| **License Model** | Per-user subscriptions | Activation key |
| **Data Storage** | Cloud MongoDB | Local SQLite/MongoDB |
| **Multi-user** | Yes | No (single machine) |
| **Internet Required** | Always | Only for activation |
| **Updates** | Auto (refresh page) | Manual or auto-updater |
| **Activation** | Per account | Per machine |

---

## ✅ Conversion Checklist

### Phase 1: Backend Simplification
- [ ] Remove auth.py and user models
- [ ] Remove JWT token logic
- [ ] Simplify all routes (remove user_id filters)
- [ ] Add activation key validation
- [ ] Add license status endpoint
- [ ] Test backend with curl

### Phase 2: Frontend Simplification
- [ ] Remove AuthContext and AuthScreen
- [ ] Remove login/logout logic
- [ ] Add ActivationDialog component
- [ ] Add "Activate" button in menu
- [ ] Show license status in UI
- [ ] Test all features without auth

### Phase 3: Electron Integration
- [ ] Install Electron dependencies
- [ ] Create main.js and preload.js
- [ ] Configure backend launcher
- [ ] Test in development mode
- [ ] Fix any path issues

### Phase 4: Database
- [ ] Switch to SQLite or local MongoDB
- [ ] Test collections CRUD
- [ ] Test folders and saved items
- [ ] Verify data persistence

### Phase 5: Build & Package
- [ ] Configure electron-builder
- [ ] Add app icons
- [ ] Test Windows build
- [ ] Test macOS build (if on Mac)
- [ ] Test Linux build (if needed)

### Phase 6: Activation System
- [ ] Implement key generation
- [ ] Create license validation server
- [ ] Test activation flow
- [ ] Test offline usage after activation

---

## 💡 Pro Tips

1. **Use SQLite** instead of MongoDB for simpler deployment
2. **Bundle Python** with PyInstaller for standalone backend
3. **Code signing** for macOS and Windows (prevents security warnings)
4. **Auto-updater** using electron-updater for seamless updates
5. **Activation server** can be simple Flask/FastAPI service
6. **Machine binding** using hardware ID prevents key sharing

---

## 🔒 Activation Key Format

**Recommended Format:**
```
XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
```

**Generation Algorithm:**
```python
import hmac, hashlib, uuid

def generate_key():
    license_id = str(uuid.uuid4())
    signature = hmac.new(
        SECRET.encode(),
        license_id.encode(),
        hashlib.sha256
    ).hexdigest()[:25]
    
    # Format
    key = '-'.join([signature[i:i+5].upper() for i in range(0, 25, 5)])
    return key, license_id
```

---

## 📞 Support

When users activate:
1. They enter activation key
2. App validates format locally
3. App calls your license server API
4. Server checks key validity
5. Server records machine_id binding
6. App stores activation locally
7. Premium features unlocked

**End of Guide** - Your app is ready for Electron conversion!
