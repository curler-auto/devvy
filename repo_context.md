"# Repository Context - DevTools Suite

## Project Overview

**DevTools Suite** is an all-in-one developer productivity platform similar to Postman, featuring multiple tools for JSON manipulation, API testing, gRPC testing, UI automation recording, and more. The application supports dual deployment modes:
- **Web App** (MongoDB, multi-user)
- **Desktop App** (SQLite, single-user Electron-ready)

---

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: 
  - Web Mode: MongoDB (Motor - async driver)
  - Desktop Mode: SQLite (SQLAlchemy + aiosqlite)
- **Authentication**: JWT (JSON Web Tokens)
- **API Protocols**: REST, gRPC
- **Key Libraries**:
  - `fastapi` - Web framework
  - `motor` - MongoDB async driver
  - `sqlalchemy` - SQL ORM
  - `aiosqlite` - Async SQLite
  - `passlib` - Password hashing
  - `python-jose` - JWT tokens
  - `grpcio` - gRPC support

### Frontend
- **Framework**: React 18.2.0
- **UI Library**: Shadcn UI + Tailwind CSS
- **Code Editor**: Monaco Editor
- **State Management**: React Context API
- **Routing**: Client-side routing
- **HTTP Client**: Axios
- **Toast Notifications**: Sonner
- **Icons**: Lucide React

---

## Project Structure

```
/app/
├── backend/                    # FastAPI Backend
│   ├── database/               # Database Abstraction Layer
│   │   ├── __init__.py         # Factory pattern
│   │   ├── base.py             # Abstract interface
│   │   ├── mongodb.py          # MongoDB implementation
│   │   ├── sqlite.py           # SQLite implementation
│   │   ├── models_sqlite.py    # SQLAlchemy models
│   │   └── README.md
│   ├── auth.py                 # Auth logic, JWT, Pydantic models
│   ├── db_service.py           # Database service layer
│   ├── server.py               # Main FastAPI app & routes
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Environment variables
│   └── MIGRATION_EXAMPLE.md    # DB migration examples
│
├── frontend/                   # React Frontend
│   ├── public/
│   │   ├── index.html
│   │   ├── demo-page.html      # UI Recorder demo page 1
│   │   ├── demo-page2.html     # UI Recorder demo page 2
│   │   └── recorder.html       # UI Recorder iframe page
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Shadcn UI components
│   │   │   ├── AdminPanel.js   # Admin tool config UI
│   │   │   ├── AuthScreen.js   # Login/Register UI
│   │   │   ├── CollectionsPanel.js  # Collections sidebar
│   │   │   ├── GrpcTester.js   # gRPC testing tool
│   │   │   ├── LicenseStatus.js
│   │   │   ├── RestApiTester.js  # REST API testing tool
│   │   │   ├── SaveToCollectionDialog.js
│   │   │   ├── UiRecorder.js   # UI Automation Recorder
│   │   │   └── UpgradeDialog.js
│   │   ├── hooks/
│   │   │   └── use-toast.js
│   │   ├── App.js              # Main app component
│   │   ├── App.css             # Global styles
│   │   ├── AuthContext.js      # Auth context provider
│   │   ├── index.js            # Entry point
│   │   └── index.css
│   ├── package.json            # Node dependencies
│   ├── tailwind.config.js      # Tailwind config
│   └── .env                    # Frontend env vars
│
├── DUAL_MODE_GUIDE.md          # Dual mode architecture guide
├── ELECTRON_CONVERSION_GUIDE.md # Electron conversion guide
└── test_result.md              # Testing protocol & results
```

---

## Core Features

### 1. Authentication & Authorization
- **JWT-based auth** with Bearer tokens
- **User roles**: `user`, `admin`
- **License types**: `free`, `premium`
- **Organization support**: Multi-license for enterprises
- Password hashing with bcrypt

### 2. Tools Available

| Tool ID | Name | Category | Status | Premium |
|---------|------|----------|--------|---------|
| `json-beautifier` | JSON Beautifier | JSON | ✅ Working | No |
| `json-validator` | JSON Validator | JSON | 🚧 Placeholder | No |
| `api-tester` | REST API Tester | API | ✅ Working | No |
| `grpc-tester` | gRPC Tester | API | ✅ Working | No |
| `ui-recorder` | UI Automation Recorder | Automation | ✅ Working | No |

### 3. Collections & Organization
- **Collections**: Group related work items
- **Folders**: Nested folder structure (unlimited depth)
- **Saved Items**: Save tool states/configurations
- **Export/Import**: Share collections as JSON files

### 4. UI Features
- **Two-pane sidebar**: Categories → Tools → Content
- **Multi-tab interface**: Open multiple tools simultaneously
- **Tab operations**: Rename, duplicate, close, close others
- **Favorites**: Star frequently used tools
- **Search**: Filter tools by name/description within categories
- **Dark theme**: Professional UI with Monaco Editor

---

## Database Architecture

### Web Mode (MongoDB)
```
Collections:
- users              # User accounts
- organizations      # Organizations for enterprise licenses
- tool_configs       # Tool premium/free configuration
- collections        # User collections
- folders            # Nested folder structure
- saved_items        # Saved tool states
- favorites          # User favorites
```

### Desktop Mode (SQLite)
```
Tables (via SQLAlchemy):
- users              # Same structure as MongoDB
- organizations      # Same structure
- tool_configs       # Same structure
- collections        # Same structure
- folders            # Same structure
- saved_items        # Same structure
- favorites          # Same structure
```

### Switching Modes
```bash
# In /app/backend/.env
APP_MODE=web          # Uses MongoDB
APP_MODE=desktop      # Uses SQLite
```

---

## Key Backend Files

### `/app/backend/server.py`
Main FastAPI application with all API routes:

**Auth Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

**Tool Endpoints:**
- `GET /api/tools/config` - Get tool configurations
- `POST /api/admin/configure-tool` - Admin: configure tool premium status

**JSON Tool:**
- `POST /api/beautify` - Beautify JSON

**Collection Endpoints:**
- `GET /api/collections/list` - List user collections
- `POST /api/collections/create` - Create collection
- `DELETE /api/collections/{id}` - Delete collection

**Folder Endpoints:**
- `GET /api/folders/{collection_id}` - Get folders in collection
- `POST /api/folders/create` - Create folder
- `PUT /api/folders/{folder_id}` - Update folder (rename)
- `DELETE /api/folders/{folder_id}` - Delete folder (recursive)

**Saved Items:**
- `GET /api/saved-items/{collection_id}` - Get saved items
- `POST /api/saved-items/save` - Save tool state
- `GET /api/saved-items/{item_id}` - Get specific item

**Favorites:**
- `POST /api/favorites/add` - Add favorite
- `POST /api/favorites/remove` - Remove favorite
- `GET /api/favorites/list` - List favorites

**gRPC Proxy:**
- `POST /api/grpc/call` - Proxy gRPC calls

**UI Recorder:**
- `POST /api/recorder/session` - Create recording session
- `POST /api/recorder/events/{session_id}` - Receive events
- `POST /api/recorder/generate/{session_id}` - Generate code

### `/app/backend/auth.py`
Authentication logic and Pydantic models:
- Password hashing/verification
- JWT token creation/validation
- User/Organization models
- Tool configuration models

### `/app/backend/database/`
Database abstraction layer:
- `base.py` - Abstract interface (30+ methods)
- `mongodb.py` - MongoDB implementation
- `sqlite.py` - SQLite implementation
- `models_sqlite.py` - SQLAlchemy ORM models

### `/app/backend/db_service.py`
High-level database service:
```python
from db_service import get_db

db = await get_db()  # Returns MongoDB or SQLite based on APP_MODE
user = await db.get_user_by_email(email)
```

---

## Key Frontend Files

### `/app/frontend/src/App.js`
Main application component (922 lines):
- **Navigation**: Two-pane sidebar (categories/tools/collections)
- **Tab Management**: Multi-tab interface with context menus
- **Tool Rendering**: Renders different tools based on tab ID
- **Authentication**: Integrated with AuthContext
- **License Checks**: Validates premium tool access

**Key State:**
```javascript
const [tabs, setTabs] = useState([])
const [activeTab, setActiveTab] = useState(null)
const [activePane, setActivePane] = useState('categories')
const [selectedCategory, setSelectedCategory] = useState(null)
```

**Tool Categories:**
```javascript
const CATEGORIES = [
  { id: 'json', name: 'JSON', icon: FileJson },
  { id: 'api', name: 'API', icon: Globe },
  { id: 'automation', name: 'Automation', icon: Globe },
  { id: 'xml', name: 'XML', icon: Code },
  { id: 'excel', name: 'Excel', icon: FileSpreadsheet },
]
```

### `/app/frontend/src/AuthContext.js`
React Context for authentication:
- Manages user state
- Stores JWT token in localStorage
- Provides login/logout/register functions
- Used throughout app for auth checks

### `/app/frontend/src/components/RestApiTester.js`
Postman-like REST API testing tool:
- HTTP method selector (GET/POST/PUT/DELETE/etc.)
- URL builder with query params
- Headers management (key-value pairs)
- Auth types: Bearer Token, Basic Auth, API Key
- Body editor: JSON, form-data, raw text
- Response viewer with status, timing, headers

### `/app/frontend/src/components/GrpcTester.js`
gRPC testing tool:
- Proto file upload
- Service/method selection
- Request message editor (JSON format)
- Metadata support
- Response viewer

### `/app/frontend/src/components/UiRecorder.js`
UI Automation Recorder:
- Opens recorder page in new window
- Captures clicks, inputs, navigation
- Generates Playwright code (Python/JS/TS)
- Copy/download generated code
- Works with pages that allow iframe embedding

### `/app/frontend/src/components/CollectionsPanel.js`
Collections sidebar component:
- Displays user collections
- Nested folder structure (recursive)
- Context menus: Rename, Delete, Add Subfolder
- Export/Import collections
- Drag-and-drop support (future)

---

## Authentication Flow

### Registration:
```
1. User fills registration form
2. POST /api/auth/register {email, password, organization_id?}
3. Backend creates user with hashed password
4. Returns JWT token
5. Frontend stores token in localStorage
6. User is logged in
```

### Login:
```
1. User fills login form
2. POST /api/auth/login {email, password}
3. Backend verifies credentials
4. Returns JWT token
5. Frontend stores token in localStorage
6. AuthContext updates user state
```

### Protected Routes:
```python
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.get_user_by_id(payload['id'])
    return user
```

### License Validation:
```javascript
// In frontend
const isToolPremium = toolConfigs.find(t => t.tool_id === toolId)?.is_premium
if (isToolPremium && user.license_type === 'free') {
  // Show upgrade dialog
}
```

---

## Environment Variables

### Backend (`.env`)
```bash
# Application mode
APP_MODE=web              # 'web' or 'desktop'

# MongoDB (web mode)
MONGO_URL=mongodb://localhost:27017
DB_NAME=devtools

# SQLite (desktop mode)
DATABASE_URL=sqlite+aiosqlite:///./devtools.db

# CORS
CORS_ORIGINS=*
```

### Frontend (`.env`)
```bash
REACT_APP_BACKEND_URL=https://apidev-hub.preview.emergentagent.com
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=true
ENABLE_HEALTH_CHECK=false
```

---

## Key Design Patterns

### 1. Database Abstraction (Strategy Pattern)
```python
# Factory returns correct implementation
db = get_database()  # Returns MongoDBDatabase or SQLiteDatabase

# Both implement same interface
user = await db.get_user_by_email(email)
```

### 2. Context API for State
```javascript
// AuthContext provides user state globally
const { user, token, login, logout } = useAuth()
```

### 3. Component Composition
```javascript
// App.js composes multiple panels
<LeftNavigation />
<ContentPane />
<CollectionsPanel />
<MainWorkspace />
```

### 4. Tab State Management
Each tab has:
```javascript
{
  id: 'unique-id',           // Tool or saved item ID
  name: 'Tab Name',
  type: 'tool',              // 'tool' or 'saved-item'
  data: {},                  // Tool-specific state
  customName: 'Custom Name'  // User can rename
}
```

---

## Important Notes

### 1. MongoDB ObjectID Issue
**❌ Don't use MongoDB ObjectID** - it's not JSON serializable
**✅ Use UUID strings** for all IDs:
```python
import uuid
id = str(uuid.uuid4())
```

### 2. DateTime Handling
Always use timezone-aware datetimes:
```python
from datetime import datetime, timezone
created_at = datetime.now(timezone.utc)
```

### 3. CORS Configuration
Backend is configured to accept requests from frontend URL.
All API routes MUST be prefixed with `/api`.

### 4. Service Restart
```bash
# Restart all services
sudo supervisorctl restart all

# Restart specific service
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### 5. Hot Reload
- Frontend: Hot reload enabled (React Fast Refresh)
- Backend: Hot reload enabled (uvicorn --reload)
- Only restart when: Installing dependencies, changing .env

---

## Testing

### Backend Testing
```bash
cd /app/backend
pytest tests/
```

### Frontend Testing
Use the testing agent:
```python
# Via deep_testing_backend_v2 or auto_frontend_testing_agent
```

### Manual Testing
1. Login as admin: admin@devtools.com / admin123
2. Test each tool
3. Test collections/folders
4. Test export/import

---

## Common Tasks

### Add a New Tool

**1. Add to TOOLS array** (`App.js`):
```javascript
{ 
  id: 'my-tool', 
  name: 'My Tool', 
  category: 'json',
  icon: FileJson,
  description: 'My tool description'
}
```

**2. Create component** (`/frontend/src/components/MyTool.js`):
```javascript
export default function MyTool({ tab, tabs, setTabs }) {
  return <div>My Tool UI</div>
}
```

**3. Add to App.js rendering**:
```javascript
{tab.id === 'my-tool' && (
  <MyTool tab={tab} tabs={tabs} setTabs={setTabs} />
)}
```

**4. Add to backend tool config**:
```python
{\"tool_id\": \"my-tool\", \"tool_name\": \"My Tool\", \"is_premium\": False}
```

### Add Database Operation

**1. Add to base.py**:
```python
@abstractmethod
async def my_operation(self, param: str) -> Dict[str, Any]:
    pass
```

**2. Implement in mongodb.py**:
```python
async def my_operation(self, param: str) -> Dict[str, Any]:
    return await self.db.collection.find_one({\"field\": param})
```

**3. Implement in sqlite.py**:
```python
async def my_operation(self, param: str) -> Dict[str, Any]:
    async with self.SessionLocal() as session:
        result = await session.execute(
            select(Model).where(Model.field == param)
        )
        return self._model_to_dict(result.scalar_one_or_none())
```

---

## Deployment Modes

### Current: Web App (Cloud)
- MongoDB hosted remotely
- Multi-user support
- Deployed on cloud platform
- Frontend served via CDN

### Future: Desktop App (Electron)
- SQLite local database
- Single-user mode
- Packaged as .exe/.dmg/.appimage
- Backend runs as subprocess
- No internet required

---

## Next Steps

### Recommended:
1. Test dual-mode switching (web ↔ desktop)
2. Gradually migrate endpoints to use db_service
3. Add more tools (XML, Excel, etc.)
4. Implement data export/import
5. Create Electron wrapper

### Optional Enhancements:
- Real-time collaboration (WebSockets)
- Cloud sync for desktop mode
- Plugin system for custom tools
- Theme customization
- Keyboard shortcuts

---

## Support & Documentation

- **Architecture Guide**: `/app/DUAL_MODE_GUIDE.md`
- **Migration Examples**: `/app/backend/MIGRATION_EXAMPLE.md`
- **Database API**: `/app/backend/database/README.md`
- **Electron Guide**: `/app/ELECTRON_CONVERSION_GUIDE.md`
- **Testing Protocol**: `/app/test_result.md`

---

## Contact & Issues

For bugs or feature requests, update the test_result.md file and communicate with the testing agent or support channels.

---

**Last Updated**: Current session
**Version**: 1.0 (Dual-mode architecture)
**Status**: Production-ready for web, Electron-ready for desktop
"