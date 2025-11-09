# DevTools Suite - Developer Onboarding Guide

Welcome to the DevTools Suite! This guide will help you understand the technical architecture, design patterns, and folder structure of our developer productivity platform.

---

## 📋 Table of Contents

1. [Product Overview](#product-overview)
2. [Technical Stack](#technical-stack)
3. [Architecture Overview](#architecture-overview)
4. [Folder Structure](#folder-structure)
5. [Frontend Design](#frontend-design)
6. [Backend Design](#backend-design)
7. [Database Schema](#database-schema)
8. [Key Components](#key-components)
9. [Data Flow](#data-flow)
10. [Development Workflow](#development-workflow)

---

## 🎯 Product Overview

**DevTools Suite** is a comprehensive desktop application that provides 70+ developer tools in a single, unified interface. Think of it as a Swiss Army knife for developers.

### Core Capabilities
- **JSON/YAML/XML/TOML** manipulation and conversion
- **API Testing** (REST, GraphQL, gRPC)
- **Data Generation** (Faker, Random data, Test datasets)
- **Security Tools** (JWT, Hash, SSL, SSH, TOTP)
- **DevOps Tools** (Docker, Kafka, S3, Filebeat)
- **Excel/Spreadsheet** editing (SheetVue)
- **Code Tools** (Compare, Execute, Format)
- **Collections System** for saving and organizing work

### Key Features
- ✅ **Offline-first**: Works without internet
- ✅ **Tab-based UI**: Multi-tool workflow
- ✅ **Auto-save**: Never lose your work
- ✅ **Collections**: Save and organize tool states
- ✅ **Theming**: Multiple color schemes
- ✅ **License System**: Basic (free) + Pro (paid)

---

## 🛠 Technical Stack

### Frontend
```
React 18.x          - UI framework
Tailwind CSS        - Styling
shadcn/ui           - Component library
Lucide React        - Icons
Monaco Editor       - Code editor
Axios               - HTTP client
Sonner              - Toast notifications
Luckysheet          - Spreadsheet component
```

### Backend
```
Python 3.x          - Runtime
FastAPI             - Web framework
SQLite              - Database
Pydantic            - Data validation
Uvicorn             - ASGI server
Passlib             - Password hashing
```

### Build & Packaging
```
Tauri               - Desktop app wrapper
CRACO               - React config override
PyInstaller         - Python bundling
```

---

## 🏗 Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Desktop Application                   │
│                      (Tauri Shell)                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐              ┌──────────────────┐  │
│  │   Frontend     │◄────HTTP────►│    Backend       │  │
│  │   (React)      │   localhost  │   (FastAPI)      │  │
│  │   Port: 3000   │    :8001     │   Port: 8001     │  │
│  └────────────────┘              └──────────────────┘  │
│         │                                  │            │
│         │                                  │            │
│         ▼                                  ▼            │
│  ┌────────────────┐              ┌──────────────────┐  │
│  │  Tool Registry │              │  SQLite Database │  │
│  │  70+ Tools     │              │  Local Storage   │  │
│  └────────────────┘              └──────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Design Patterns

1. **Component-Based Architecture**: Each tool is a self-contained React component
2. **Registry Pattern**: Central tool registry for dynamic loading
3. **Tab Management**: Multi-instance tool support with state isolation
4. **Auto-save Pattern**: Debounced state persistence
5. **License-based Feature Gating**: Tools locked/unlocked based on license tier

---

## 📁 Folder Structure

### Root Directory
```
devvy/
├── frontend/              # React application
├── backend/               # FastAPI server
├── tests/                 # Test files
├── assets/                # Static assets
├── *.md                   # Documentation files
└── README.md              # Main readme
```

### Frontend Structure (`/frontend`)
```
frontend/
├── public/
│   ├── index.html         # HTML entry point
│   ├── toolconfig.json    # Tool metadata & licensing
│   ├── demo-page.html     # Demo pages
│   └── icon-512.png       # App icon
│
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── ToolWrapper.js         # Tool renderer
│   │   ├── ToolHeader.js          # Tool header with favorites
│   │   ├── CollectionsPanel.js    # Collections sidebar
│   │   ├── SaveToCollectionDialog.js  # Save dialog
│   │   ├── SettingsModal.js       # Settings UI
│   │   ├── ActivationDialog.js    # License activation
│   │   ├── RestApiTester.js       # REST API tool
│   │   ├── GrpcTester.js          # gRPC tool
│   │   └── UiRecorder.js          # UI recorder
│   │
│   ├── tools/             # All tool components (70+ files)
│   │   ├── index.js       # Tool registry
│   │   ├── JSONBeautifier.js
│   │   ├── SheetVue.js
│   │   ├── HashGenerator.js
│   │   └── ... (67 more tools)
│   │
│   ├── services/          # Business logic services
│   │   ├── licenseService.js      # License management
│   │   └── upgradeService.js      # Update checker
│   │
│   ├── hooks/             # Custom React hooks
│   │   └── useLocalStorage.js
│   │
│   ├── lib/               # Utilities
│   │   └── utils.js
│   │
│   ├── App.js             # Main application component
│   ├── App.css            # Global styles
│   ├── index.js           # React entry point
│   ├── index.css          # Base styles
│   ├── themes.js          # Theme definitions
│   └── AuthContextDesktop.js  # Auth context (desktop mode)
│
├── src-tauri/             # Tauri desktop wrapper
│   ├── src/
│   │   └── main.rs        # Rust entry point
│   ├── icons/             # App icons
│   ├── capabilities/      # Tauri permissions
│   └── tauri.conf.json    # Tauri config
│
├── plugins/               # Tauri plugins
│   ├── health-check/
│   └── visual-edits/
│
├── package.json           # NPM dependencies
├── craco.config.js        # React config override
└── tailwind.config.js     # Tailwind configuration
```

### Backend Structure (`/backend`)
```
backend/
├── database/              # Database modules
│   ├── __init__.py
│   ├── base.py            # Base database class
│   ├── mongodb.py         # MongoDB implementation
│   ├── sqlite.py          # SQLite implementation
│   └── README.md
│
├── build/                 # PyInstaller build output
│   ├── desktop/
│   └── launcher/
│
├── server_desktop.py      # Desktop FastAPI server (main)
├── server.py              # Cloud FastAPI server (legacy)
├── auth.py                # Pydantic models
├── launcher_desktop.py    # Desktop app launcher
├── db_service.py          # Database service
├── requirements.txt       # Python dependencies
├── devtools_desktop.db    # SQLite database (gitignored)
├── .env.desktop           # Environment variables
└── *.spec                 # PyInstaller specs
```

---

## 🎨 Frontend Design

### Component Hierarchy

```
App.js (Main Container)
│
├── Sidebar (Left Panel)
│   ├── Categories List
│   ├── Tools List
│   ├── Favorites
│   └── Collections Panel
│
├── Tab Bar (Top)
│   ├── Tab 1 (Tool Instance)
│   ├── Tab 2 (Tool Instance)
│   └── Tab N (Tool Instance)
│
├── Tool Area (Center)
│   └── ToolWrapper
│       └── Dynamic Tool Component
│           ├── ToolHeader (with favorites)
│           └── Tool-specific UI
│
└── Modals/Dialogs
    ├── Settings Modal
    ├── Activation Dialog
    └── Save to Collection Dialog
```

### State Management

**Local State (useState)**
- Active tab
- Selected category
- Search query
- UI toggles (sidebar, modals)

**Persistent State (localStorage)**
- Tabs (with tool states)
- Favorites
- Theme preference
- License activation

**Server State (API)**
- Collections
- Folders
- Saved items
- License validation

### Tab System

Each tab contains:
```javascript
{
  id: "unique-uuid",
  toolId: "json-beautifier",
  name: "JSON Beautifier",
  icon: "FileJson",
  state: {
    // Tool-specific state
    input: "...",
    output: "...",
    settings: {...}
  }
}
```

### Tool Component Structure

Every tool follows this pattern:

```javascript
function MyTool({ toolId, tab, tabs, setTabs, editorTheme }) {
  // 1. Local state
  const [input, setInput] = useState(tab.state?.input || '');
  const [output, setOutput] = useState(tab.state?.output || '');
  
  // 2. Auto-save to tab state
  useEffect(() => {
    const timer = setTimeout(() => {
      updateTabState(tab.id, { input, output });
    }, 500);
    return () => clearTimeout(timer);
  }, [input, output]);
  
  // 3. Tool logic
  const processData = () => {
    // Transform input to output
  };
  
  // 4. Render UI
  return (
    <div className="tool-container">
      <ToolHeader toolId={toolId} />
      {/* Tool-specific UI */}
    </div>
  );
}
```

### Styling System

**Tailwind Classes**: Primary styling method
```jsx
<div className="flex items-center gap-2 p-4 bg-primary text-white">
```

**CSS Variables**: Theme support
```css
:root {
  --bg-primary: #0f0f0f;
  --text-primary: #e5e5e5;
  --border-color: #2a2a2a;
}
```

**App.css**: Global styles and overrides

---

## ⚙️ Backend Design

### API Architecture

**FastAPI Server** (`server_desktop.py`)
- RESTful endpoints
- CORS enabled for localhost
- No authentication (desktop mode)
- SQLite database

### Endpoint Categories

1. **License Management**
   - `GET /api/license/status` - Check license
   - `POST /api/license/activate` - Activate license
   - `GET /api/license/config` - Get tool config

2. **Collections**
   - `POST /api/collections/create` - Create collection
   - `GET /api/collections/list` - List collections
   - `PUT /api/collections/{id}` - Update collection
   - `DELETE /api/collections/{id}` - Delete collection

3. **Folders**
   - `POST /api/folders/create` - Create folder
   - `GET /api/folders/list/{collection_id}` - List folders
   - `PUT /api/folders/{id}` - Update folder
   - `DELETE /api/folders/{id}` - Delete folder

4. **Saved Items**
   - `POST /api/saved-items/create` - Save tool state
   - `GET /api/saved-items/list/{collection_id}` - List items
   - `PUT /api/saved-items/{id}` - Update item
   - `DELETE /api/saved-items/{id}` - Delete item

5. **Favorites**
   - `GET /api/favorites` - Get favorites
   - `POST /api/favorites/toggle` - Toggle favorite

6. **Utilities**
   - `GET /api/health` - Health check
   - `GET /api/upgrade/check` - Check for updates

### Pydantic Models (`auth.py`)

```python
class CollectionCreate(BaseModel):
    name: str
    description: str = ""

class FolderCreate(BaseModel):
    collection_id: str
    parent_folder_id: Optional[str] = None
    name: str

class SavedItemCreate(BaseModel):
    name: str
    tool_id: str
    tool_data: dict
    collection_id: str
    folder_id: Optional[str] = None
```

### Database Service Pattern

```python
def init_database():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Create tables
    cursor.execute("CREATE TABLE IF NOT EXISTS ...")
    conn.commit()
    conn.close()

@app.on_event("startup")
async def startup():
    init_database()
```

---

## 🗄 Database Schema

### SQLite Tables

**1. app_license**
```sql
CREATE TABLE app_license (
    id INTEGER PRIMARY KEY,
    license_type TEXT DEFAULT 'basic',  -- 'basic' or 'pro'
    activation_key TEXT,
    is_activated BOOLEAN DEFAULT 0,
    activated_at TEXT,
    machine_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**2. collections**
```sql
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**3. folders**
```sql
CREATE TABLE folders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    collection_id TEXT,
    parent_folder_id TEXT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collections (id)
);
```

**4. saved_items**
```sql
CREATE TABLE saved_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    folder_id TEXT,
    name TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    data JSON NOT NULL,  -- Tool state as JSON
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collections (id)
);
```

**5. favorites**
```sql
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tool_id)
);
```

---

## 🔑 Key Components

### 1. Tool Registry (`frontend/src/tools/index.js`)

Central registry that maps tool IDs to components:

```javascript
export const TOOL_COMPONENTS = {
  'json-beautifier': JSONBeautifier,
  'yaml-formatter': YAMLFormatter,
  'sheet-vue': SheetVue,
  // ... 67 more tools
};

export const getToolComponent = (toolId) => {
  return TOOL_COMPONENTS[toolId] || null;
};
```

### 2. Tool Config (`frontend/public/toolconfig.json`)

Metadata for all tools:

```json
{
  "categories": [
    {
      "id": "json-tools",
      "name": "JSON Tools",
      "icon": "Braces",
      "tools": [
        {
          "id": "json-beautifier",
          "name": "JSON Beautifier",
          "description": "Format and beautify JSON",
          "icon": "Braces",
          "isPremium": false
        }
      ]
    }
  ]
}
```

### 3. ToolWrapper (`frontend/src/components/ToolWrapper.js`)

Dynamic tool loader:

```javascript
function ToolWrapper({ toolId, tab, tabs, setTabs, editorTheme }) {
  const ToolComponent = getToolComponent(toolId);
  
  if (!ToolComponent) {
    return <ToolNotFound />;
  }
  
  return <ToolComponent {...props} />;
}
```

### 4. ToolHeader (`frontend/src/components/ToolHeader.js`)

Reusable header with favorites:

```javascript
function ToolHeader({ toolId }) {
  const [isFavorite, setIsFavorite] = useState(false);
  
  const toggleFavorite = async () => {
    await axios.post(`${API}/favorites/toggle`, { tool_id: toolId });
    setIsFavorite(!isFavorite);
  };
  
  return (
    <div className="tool-header">
      <h2>{toolName}</h2>
      <button onClick={toggleFavorite}>
        <Star fill={isFavorite ? "gold" : "none"} />
      </button>
    </div>
  );
}
```

### 5. Collections System

**CollectionsPanel.js**: Sidebar for browsing saved work
**SaveToCollectionDialog.js**: Modal for saving tool states

Flow:
1. User presses Ctrl+S in a tool
2. SaveToCollectionDialog opens
3. User selects collection/folder
4. Tool state saved to database
5. Can reload later from Collections panel

---

## 🔄 Data Flow

### Opening a Tool

```
1. User clicks tool in sidebar
   ↓
2. App.js creates new tab
   ↓
3. Tab added to tabs array
   ↓
4. ToolWrapper receives toolId
   ↓
5. Tool component loaded from registry
   ↓
6. Tool renders with empty/saved state
```

### Auto-save Flow

```
1. User types in tool
   ↓
2. State updates (input, output, etc.)
   ↓
3. useEffect triggers (debounced 500ms)
   ↓
4. updateTabState() called
   ↓
5. Tab state updated in tabs array
   ↓
6. localStorage.setItem('tabs', JSON.stringify(tabs))
```

### Save to Collection Flow

```
1. User presses Ctrl+S
   ↓
2. SaveToCollectionDialog opens
   ↓
3. User selects collection/folder
   ↓
4. POST /api/saved-items/create
   ↓
5. Backend saves to SQLite
   ↓
6. Success toast shown
```

### Load from Collection Flow

```
1. User clicks saved item in Collections panel
   ↓
2. GET /api/saved-items/{id}
   ↓
3. Backend returns tool_data
   ↓
4. New tab created with toolId
   ↓
5. Tab state populated with saved data
   ↓
6. Tool renders with loaded state
```

---

## 💻 Development Workflow

### Setup

```bash
# Clone repository
git clone <repo-url>
cd devvy

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install

# Start development
# Terminal 1: Backend
cd backend
python3 server_desktop.py

# Terminal 2: Frontend
cd frontend
npm start
```

### Environment Variables

**Backend** (`.env.desktop`):
```
DATABASE_URL=sqlite:///devtools_desktop.db
LICENSE_API_URL=https://license-api.example.com
```

**Frontend** (`.env`):
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Build Process

**Frontend**:
```bash
npm run build  # Creates /build directory
```

**Backend**:
```bash
pyinstaller server_desktop.spec  # Creates /dist/server_desktop
```

**Desktop App** (Tauri):
```bash
cd frontend
npm run tauri build  # Creates .dmg/.exe/.AppImage
```

---

## 🎓 Learning Path

### Week 1: Frontend Basics
- [ ] Understand React component structure
- [ ] Explore App.js and tab management
- [ ] Study one simple tool (e.g., JSONBeautifier)
- [ ] Learn ToolWrapper and registry pattern

### Week 2: Tool Development
- [ ] Create a simple tool (see TOOL_DEVELOPMENT_GUIDE.md)
- [ ] Understand state management
- [ ] Implement auto-save
- [ ] Add to tool registry

### Week 3: Backend & Database
- [ ] Study FastAPI endpoints
- [ ] Understand SQLite schema
- [ ] Test API with Postman/curl
- [ ] Create a new endpoint

### Week 4: Advanced Features
- [ ] Collections system
- [ ] License management
- [ ] Theming system
- [ ] Build & deployment

---

## 📚 Additional Resources

- **Tool Development Guide**: See `TOOL_DEVELOPMENT_GUIDE.md`
- **Product Features**: See `PRODUCT_FEATURES_GUIDE.md`
- **API Documentation**: Run backend and visit `http://localhost:8001/docs`
- **Component Library**: [shadcn/ui docs](https://ui.shadcn.com)
- **FastAPI Docs**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)

---

## 🤝 Getting Help

1. **Code Comments**: Most files have detailed comments
2. **Console Logs**: Check browser console and backend logs
3. **API Docs**: Visit `/docs` endpoint when backend is running
4. **Ask Questions**: Don't hesitate to ask the team!

---

**Welcome aboard! Happy coding! 🚀**
