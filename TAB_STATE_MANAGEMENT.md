# Tab State Management & Collections Storage

## Overview

Devvy Studio uses a **generic tab-based architecture** where each tool maintains its own state independently through a `data` object. This allows different tools with different UIs and options to coexist seamlessly.

---

## Tab Structure

Each tab is an object with the following structure:

```javascript
{
  tabId: `${tool.id}-${Date.now()}`,  // Unique identifier for this tab instance
  id: "json-beautifier",               // Tool ID
  name: "JSON Beautifier",             // Tool name
  category: "formatters",              // Tool category
  enabled: true,                       // Tool availability
  tier: "free",                        // License tier (free/premium)
  icon: FileJson,                      // Icon component
  customName: null,                    // User-defined name (optional)
  data: {},                            // Tool-specific state (THIS IS KEY!)
  savedItemId: null                    // Reference to saved collection item (if opened from collection)
}
```

---

## How Tab State Works

### 1. **Tab Creation** (`App.js:301-320`)

When a tool is opened, a new tab is created:

```javascript
const openTool = (tool) => {
  const newTab = {
    tabId: `${tool.id}-${Date.now()}`,
    ...tool,
    customName: null,
    data: {}  // Empty data object - tool will populate this
  };
  setTabs([...tabs, newTab]);
  setActiveTab(newTab.tabId);
};
```

### 2. **Tool Component Receives Tab** (`ToolWrapper.js:30-38`)

The tool component receives the entire tab object and the `setTabs` function:

```javascript
<ToolComponent
  tab={tab}           // Current tab with data
  tabs={tabs}         // All tabs
  setTabs={setTabs}   // Function to update tabs
  editorTheme={editorTheme}
/>
```

### 3. **Tool Manages Its Own State**

Each tool component is responsible for:
- Reading from `tab.data`
- Updating `tab.data` through `setTabs`

**Example from JSONCompare.js:**

```javascript
function JSONCompare({ tab, tabs, setTabs, editorTheme }) {
  // Initialize state from tab.data
  const [leftJSON, setLeftJSON] = useState(tab.data?.left || '');
  const [rightJSON, setRightJSON] = useState(tab.data?.right || '');
  const [diffView, setDiffView] = useState(tab.data?.diffView || '');
  const [compareMode, setCompareMode] = useState(tab.data?.compareMode || 'split');

  // When state changes, update tab.data
  const compareJSON = () => {
    // ... validation logic ...
    
    // Update tab data
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { 
            ...t, 
            data: { 
              left: formattedLeft, 
              right: formattedRight, 
              diffView: 'visible', 
              compareMode 
            } 
          }
        : t
    );
    setTabs(updatedTabs);
  };
}
```

### 4. **Generic Pattern for All Tools**

Every tool follows this pattern:

```javascript
function MyTool({ tab, tabs, setTabs, editorTheme }) {
  // 1. Initialize local state from tab.data
  const [input, setInput] = useState(tab.data?.input || '');
  const [output, setOutput] = useState(tab.data?.output || '');
  const [settings, setSettings] = useState(tab.data?.settings || {});

  // 2. Update tab.data when state changes
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { input, output, settings } }
        : t
    );
    setTabs(updatedTabs);
  }, [input, output, settings]);

  // 3. Tool-specific UI and logic
  return (
    <div>
      {/* Tool UI */}
    </div>
  );
}
```

---

## Collections Storage

### Database Schema

Collections are stored in the database with the following structure:

**SavedItem Model** (`backend/auth.py:105-121`):

```python
class SavedItem(BaseModel):
    id: str                          # Unique ID
    name: str                        # User-defined name
    description: str                 # Optional description
    tool_id: str                     # Which tool this belongs to
    tool_data: dict                  # THE ENTIRE tab.data OBJECT
    collection_id: str               # Parent collection
    folder_id: Optional[str]         # Optional folder organization
    user_id: str                     # Owner
    created_at: datetime             # Timestamp
```

### Saving to Collection

**Frontend** (`SaveToCollectionDialog.js:96-122`):

```javascript
const handleSave = async () => {
  await axios.post(`${API}/saved-items/create`, {
    name: itemName,
    description: '',
    tool_id: tab.id,              // e.g., "json-compare"
    tool_data: tab.data || {},    // ENTIRE state saved here
    collection_id: selectedCollection,
    folder_id: selectedFolder || null
  });
};
```

**Backend** (`server.py:417-426`):

```python
@api_router.post("/saved-items/create")
async def create_saved_item(item_data: SavedItemCreate, current_user: dict):
    saved_item = SavedItem(**item_data.model_dump(), user_id=current_user['id'])
    doc = saved_item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.saved_items.insert_one(doc)  # Saved to MongoDB/SQLite
    return saved_item
```

### Loading from Collection

**Frontend** (`App.js:409-425`):

```javascript
const openSavedItem = async (savedItem) => {
  const tool = tools.find(t => t.id === savedItem.tool_id);
  
  const newTab = {
    tabId: `saved-${savedItem.id}-${Date.now()}`,
    ...tool,
    customName: savedItem.name,
    data: savedItem.tool_data || {},  // Restore saved state
    savedItemId: savedItem.id
  };
  
  setTabs([...tabs, newTab]);
  setActiveTab(newTab.tabId);
};
```

---

## Key Benefits of This Architecture

### 1. **Tool Independence**
- Each tool defines its own data structure
- No coupling between tools
- Easy to add new tools without modifying core app

### 2. **Flexible State Management**
- Tools can store anything in `tab.data`:
  - Simple strings: `{ input: "...", output: "..." }`
  - Complex objects: `{ settings: {...}, history: [...], cache: {...} }`
  - Arrays: `{ queries: [...], results: [...] }`

### 3. **Persistence**
- Tab state survives:
  - Tab switching
  - Saving to collections
  - Loading from collections
  - Tab duplication

### 4. **Multiple Instances**
- Same tool can have multiple tabs open
- Each maintains independent state
- Identified by unique `tabId`

---

## Example: Different Tools, Different Data

### JSON Compare Tool
```javascript
tab.data = {
  left: "{ \"name\": \"John\" }",
  right: "{ \"name\": \"Jane\" }",
  diffView: "visible",
  compareMode: "split"
}
```

### JSON Path Finder Tool
```javascript
tab.data = {
  input: "{ \"users\": [...] }",
  path: "$.users[*].name",
  results: [...],
  history: [...]
}
```

### Faker Tool
```javascript
tab.data = {
  fields: [
    { name: "firstName", type: "person.firstName" },
    { name: "email", type: "internet.email" }
  ],
  count: 10,
  output: "...",
  format: "json"
}
```

### SQL Formatter Tool
```javascript
tab.data = {
  input: "SELECT * FROM users WHERE...",
  output: "SELECT\n  *\nFROM\n  users\nWHERE...",
  language: "postgresql",
  indentSize: 2
}
```

---

## Tab Lifecycle

```
1. User clicks tool
   ↓
2. openTool() creates tab with empty data: {}
   ↓
3. Tool component initializes from tab.data
   ↓
4. User interacts with tool
   ↓
5. Tool updates tab.data via setTabs()
   ↓
6. User saves to collection
   ↓
7. tab.data stored in database as tool_data
   ↓
8. User opens from collection
   ↓
9. tab.data restored from tool_data
   ↓
10. Tool component initializes with saved state
```

---

## Best Practices for Tool Developers

### 1. **Always Initialize from tab.data**
```javascript
const [myState, setMyState] = useState(tab.data?.myState || defaultValue);
```

### 2. **Update tab.data When State Changes**
```javascript
useEffect(() => {
  const updatedTabs = tabs.map(t => 
    t.tabId === tab.tabId 
      ? { ...t, data: { ...t.data, myState } }
      : t
  );
  setTabs(updatedTabs);
}, [myState]);
```

### 3. **Store Only Serializable Data**
- ✅ Strings, numbers, booleans
- ✅ Plain objects and arrays
- ✅ JSON-compatible data
- ❌ Functions
- ❌ Class instances
- ❌ DOM elements

### 4. **Use Meaningful Keys**
```javascript
// Good
data: { 
  inputJSON: "...", 
  outputJSON: "...", 
  validationErrors: [...] 
}

// Bad
data: { 
  a: "...", 
  b: "...", 
  c: [...] 
}
```

---

## Summary

The tab state management system is **generic and flexible**:

- **Each tab** has a `data` object that can store anything
- **Each tool** decides what to store in `data`
- **Collections** save the entire `data` object to the database
- **No central state management** needed - each tool is self-contained
- **Scales easily** - adding new tools doesn't affect existing ones

This architecture allows Devvy Studio to support dozens of different tools with completely different UIs and data requirements, all using the same underlying tab system.
