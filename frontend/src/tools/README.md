# Tools Directory

This directory contains all tool components for Devvy Studio. Each tool is a self-contained React component with its own logic and UI.

## 📁 Structure

```
tools/
├── index.js              # Tool registry (central hub)
├── README.md            # This file
├── JSONBeautifier.js    # Example: Backend-dependent tool
├── Base64Encoder.js     # Example: Client-side tool
└── [YourTool].js        # Add more tools here
```

## 🎯 Tool Types

### 1. Backend-Dependent Tools
Tools that require API calls to the backend server.

**Examples:**
- JSON Beautifier (validation & formatting)
- REST API Tester (HTTP requests)
- gRPC Tester (gRPC calls)
- Image Optimizer (server-side processing)

**Template:**
```javascript
import React, { useState } from 'react';
import axios from 'axios';

function YourTool({ tab, tabs, setTabs, editorTheme }) {
  // Your tool logic with API calls
  const handleAction = async () => {
    const response = await axios.post('/api/your-endpoint', data);
    // Handle response
  };

  return (
    // Your UI
  );
}

YourTool.metadata = {
  id: 'your-tool',
  name: 'Your Tool',
  description: 'Tool description',
  category: 'category',
  requiresBackend: true,
  backendEndpoints: ['/api/your-endpoint'],
};

export default YourTool;
```

### 2. Client-Side Tools
Tools that work entirely in the browser without backend calls.

**Examples:**
- Base64 Encoder/Decoder
- URL Encoder/Decoder
- UUID Generator
- Color Picker
- Regex Tester

**Template:**
```javascript
import React, { useState } from 'react';

function YourTool({ tab, tabs, setTabs }) {
  // Your tool logic (client-side only)
  const handleAction = () => {
    // Pure JavaScript logic
  };

  return (
    // Your UI
  );
}

YourTool.metadata = {
  id: 'your-tool',
  name: 'Your Tool',
  description: 'Tool description',
  category: 'utilities',
  requiresBackend: false, // Client-side only
};

export default YourTool;
```

## 🚀 Adding a New Tool

### Step 1: Create Tool Component

Create a new file in `tools/` directory:

```javascript
// tools/MyNewTool.js
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function MyNewTool({ tab, tabs, setTabs, editorTheme }) {
  const [data, setData] = useState(tab.data || {});

  const handleAction = () => {
    // Your logic here
    toast.success('Action completed!');
  };

  return (
    <div className="p-8">
      <h2>My New Tool</h2>
      <Button onClick={handleAction}>Do Something</Button>
    </div>
  );
}

MyNewTool.metadata = {
  id: 'my-new-tool',
  name: 'My New Tool',
  description: 'Does something cool',
  category: 'utilities',
  requiresBackend: false,
};

export default MyNewTool;
```

### Step 2: Register in Tool Registry

Add to `tools/index.js`:

```javascript
import MyNewTool from './MyNewTool';

export const TOOL_COMPONENTS = {
  'json-beautifier': JSONBeautifier,
  'my-new-tool': MyNewTool, // Add here
  // ... other tools
};
```

### Step 3: Add to Tool Config

Update `public/toolconfig.json`:

```json
{
  "tools": [
    {
      "id": "my-new-tool",
      "name": "My New Tool",
      "description": "Does something cool",
      "icon": "Wrench",
      "category": "utilities",
      "tier": "free",
      "enabled": true
    }
  ]
}
```

### Step 4: Test

1. Restart the app
2. Find your tool in the sidebar
3. Click to open
4. Tool should load automatically!

## 📝 Tool Component Props

All tools receive these props:

```javascript
{
  tab: {
    tabId: string,      // Unique tab identifier
    id: string,         // Tool ID
    name: string,       // Tool name
    icon: Component,    // Tool icon
    data: object,       // Persistent tab data
  },
  tabs: Array,          // All open tabs
  setTabs: Function,    // Update tabs state
  editorTheme: string,  // Current Monaco editor theme ('vs' or 'vs-dark')
}
```

## 💾 Persisting Tab Data

To save data in the tab:

```javascript
const updateTabData = (newData) => {
  const updatedTabs = tabs.map(t =>
    t.tabId === tab.tabId
      ? { ...t, data: { ...t.data, ...newData } }
      : t
  );
  setTabs(updatedTabs);
};

// Usage
updateTabData({ input: 'hello', output: 'world' });
```

## 🎨 UI Guidelines

### Use Shadcn Components
```javascript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
```

### Use Monaco Editor for Code
```javascript
import Editor from '@monaco-editor/react';

<Editor
  height="100%"
  defaultLanguage="json"
  theme={editorTheme}
  value={code}
  onChange={setCode}
  options={{
    minimap: { enabled: false },
    fontSize: 14,
  }}
/>
```

### Use Toast for Notifications
```javascript
import { toast } from 'sonner';

toast.success('Success message');
toast.error('Error message');
toast.info('Info message');
```

## 📊 Tool Categories

Available categories:
- `json` - JSON tools
- `api` - API testing tools
- `automation` - Automation tools
- `encoding` - Encoding/decoding tools
- `formatting` - Code formatters
- `utilities` - General utilities
- `testing` - Testing tools
- `conversion` - Conversion tools

## 🔍 Tool Metadata

Each tool should export metadata:

```javascript
ToolComponent.metadata = {
  id: 'tool-id',              // Unique identifier (kebab-case)
  name: 'Tool Name',          // Display name
  description: 'Description', // Short description
  category: 'category',       // Tool category
  requiresBackend: false,     // true if needs API
  backendEndpoints: [],       // Array of API endpoints used
};
```

## 🎯 Best Practices

1. **Keep tools focused** - One tool, one purpose
2. **Handle errors gracefully** - Always show user-friendly messages
3. **Persist important data** - Save user input in tab.data
4. **Use loading states** - Show spinners for async operations
5. **Responsive design** - Tools should work on all screen sizes
6. **Accessibility** - Use semantic HTML and ARIA labels
7. **Performance** - Debounce expensive operations
8. **Testing** - Add data-testid attributes for testing

## 📚 Examples

### Backend Tool Example
See `JSONBeautifier.js` for a complete example of a tool that uses the backend API.

### Client-Side Tool Example
See `Base64Encoder.js` for a complete example of a pure client-side tool.

## 🐛 Troubleshooting

### Tool not showing up?
1. Check if registered in `tools/index.js`
2. Check if enabled in `toolconfig.json`
3. Check browser console for errors

### Tool not loading?
1. Check component export (default export required)
2. Check metadata is attached to component
3. Check for JavaScript errors in component

### Backend API not working?
1. Check backend server is running
2. Check API endpoint in tool matches backend
3. Check CORS settings
4. Check network tab in browser DevTools

## 🚀 Scaling to 100-500 Tools

This architecture supports:
- ✅ Lazy loading (add React.lazy if needed)
- ✅ Code splitting per tool
- ✅ Independent development
- ✅ Easy testing
- ✅ Clear separation of concerns
- ✅ Minimal App.js changes

Each tool is completely independent and can be developed, tested, and deployed separately!
