# Tool Development Guide - Build a Tool in 30 Minutes

A step-by-step guide to building and integrating a new tool into DevTools Suite.

---

## 📋 Quick Start Checklist

- [ ] Create tool component file
- [ ] Register in tool registry
- [ ] Add to toolconfig.json
- [ ] Test the tool
- [ ] Commit and push

**Time Required:** 30 minutes

---

## 🎯 Tool Development Process

### Step 1: Plan Your Tool (5 minutes)

**Questions to Answer:**
1. What does the tool do?
2. What inputs does it need?
3. What outputs does it produce?
4. Is it Basic or Pro tier?
5. Which category does it belong to?

**Example: URL Encoder/Decoder**
```
Purpose: Encode/decode URLs
Input: Text string
Output: Encoded/decoded string
Tier: Basic (free)
Category: String Tools
```

### Step 2: Create Tool Component (15 minutes)

**Location:** `/frontend/src/tools/YourTool.js`

**Template:**

```javascript
import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ToolHeader from '@/components/ToolHeader';

function URLEncoder({ toolId, tab, tabs, setTabs, editorTheme }) {
  // 1. State Management
  const [input, setInput] = useState(tab.state?.input || '');
  const [output, setOutput] = useState(tab.state?.output || '');
  const [mode, setMode] = useState(tab.state?.mode || 'encode');
  const [copied, setCopied] = useState(false);

  // 2. Auto-save to tab state
  useEffect(() => {
    const timer = setTimeout(() => {
      updateTabState(tab.id, { input, output, mode });
    }, 500);
    return () => clearTimeout(timer);
  }, [input, output, mode]);

  // 3. Helper function to update tab state
  const updateTabState = (tabId, newState) => {
    setTabs(tabs.map(t => 
      t.id === tabId 
        ? { ...t, state: { ...t.state, ...newState } }
        : t
    ));
  };

  // 4. Core Logic
  const processURL = () => {
    try {
      if (mode === 'encode') {
        setOutput(encodeURIComponent(input));
      } else {
        setOutput(decodeURIComponent(input));
      }
      toast.success(`URL ${mode}d successfully!`);
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // 5. Copy to Clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // 6. Render UI
  return (
    <div className="flex flex-col h-full">
      {/* Tool Header with Favorites */}
      <ToolHeader toolId={toolId} />

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              onClick={() => setMode('encode')}
              variant={mode === 'encode' ? 'default' : 'outline'}
            >
              Encode
            </Button>
            <Button
              onClick={() => setMode('decode')}
              variant={mode === 'decode' ? 'default' : 'outline'}
            >
              Decode
            </Button>
          </div>

          {/* Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Input URL
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-32 p-3 rounded-lg border bg-secondary"
              placeholder="Enter URL to encode/decode..."
            />
          </div>

          {/* Process Button */}
          <Button onClick={processURL} className="w-full">
            {mode === 'encode' ? 'Encode' : 'Decode'} URL
          </Button>

          {/* Output */}
          {output && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Output</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <textarea
                value={output}
                readOnly
                className="w-full h-32 p-3 rounded-lg border bg-secondary"
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default URLEncoder;
```

### Step 3: Register Tool (3 minutes)

**File:** `/frontend/src/tools/index.js`

**Add Import:**
```javascript
import URLEncoder from './URLEncoder';
```

**Add to Registry:**
```javascript
export const TOOL_COMPONENTS = {
  // ... existing tools
  'url-encoder': URLEncoder,
};
```

### Step 4: Add to Config (5 minutes)

**File:** `/frontend/public/toolconfig.json`

**Find or Create Category:**
```json
{
  "id": "string-tools",
  "name": "String Tools",
  "icon": "Type",
  "tools": [
    // ... existing tools
  ]
}
```

**Add Tool Entry:**
```json
{
  "id": "url-encoder",
  "name": "URL Encoder/Decoder",
  "description": "Encode and decode URLs",
  "icon": "Link",
  "isPremium": false
}
```

### Step 5: Test Tool (2 minutes)

1. Start frontend: `npm start`
2. Find tool in sidebar under "String Tools"
3. Click to open
4. Test encoding/decoding
5. Test auto-save (refresh page)
6. Test favorites (star icon)
7. Test save to collection (Ctrl+S)

---

## 🎨 UI Patterns

### Pattern 1: Simple Input/Output

```javascript
<div className="space-y-4">
  <textarea
    value={input}
    onChange={(e) => setInput(e.target.value)}
    placeholder="Input..."
  />
  <Button onClick={process}>Process</Button>
  <textarea value={output} readOnly />
</div>
```

### Pattern 2: Monaco Editor

```javascript
import Editor from '@monaco-editor/react';

<Editor
  height="400px"
  language="json"
  theme={editorTheme}
  value={input}
  onChange={setInput}
  options={{
    minimap: { enabled: false },
    fontSize: 14,
  }}
/>
```

### Pattern 3: Tabs/Modes

```javascript
const [mode, setMode] = useState('format');

<div className="flex gap-2">
  <Button
    onClick={() => setMode('format')}
    variant={mode === 'format' ? 'default' : 'outline'}
  >
    Format
  </Button>
  <Button
    onClick={() => setMode('minify')}
    variant={mode === 'minify' ? 'default' : 'outline'}
  >
    Minify
  </Button>
</div>
```

### Pattern 4: File Upload

```javascript
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    setInput(event.target.result);
  };
  reader.readAsText(file);
};

<input
  type="file"
  accept=".json,.txt"
  onChange={handleFileUpload}
/>
```

### Pattern 5: Copy Button

```javascript
const [copied, setCopied] = useState(false);

const copyToClipboard = () => {
  navigator.clipboard.writeText(output);
  setCopied(true);
  toast.success('Copied!');
  setTimeout(() => setCopied(false), 2000);
};

<Button onClick={copyToClipboard}>
  {copied ? <Check /> : <Copy />}
  {copied ? 'Copied!' : 'Copy'}
</Button>
```

---

## 🧩 Common Components

### ToolHeader

```javascript
import ToolHeader from '@/components/ToolHeader';

<ToolHeader toolId={toolId} />
```

**Features:**
- Tool name
- Favorite button
- Save button
- Auto-wired

### Button

```javascript
import { Button } from '@/components/ui/button';

<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Toast Notifications

```javascript
import { toast } from 'sonner';

toast.success('Success message');
toast.error('Error message');
toast.info('Info message');
toast.warning('Warning message');
```

### Icons

```javascript
import { Copy, Check, Download, Upload } from 'lucide-react';

<Copy className="w-4 h-4" />
```

---

## 🔧 Advanced Features

### Backend API Integration

**Frontend:**
```javascript
import axios from 'axios';

const API = 'http://localhost:8001/api';

const callBackend = async () => {
  try {
    const response = await axios.post(`${API}/your-endpoint`, {
      data: input
    });
    setOutput(response.data.result);
  } catch (error) {
    toast.error(error.message);
  }
};
```

**Backend** (`server_desktop.py`):
```python
@app.post("/api/your-endpoint")
async def your_endpoint(data: dict):
    result = process_data(data)
    return {"result": result}
```

### State Persistence

```javascript
// Auto-save pattern
useEffect(() => {
  const timer = setTimeout(() => {
    updateTabState(tab.id, {
      input,
      output,
      settings,
      // ... any state you want to persist
    });
  }, 500); // Debounce 500ms
  return () => clearTimeout(timer);
}, [input, output, settings]);
```

### Error Handling

```javascript
try {
  const result = processData(input);
  setOutput(result);
  toast.success('Success!');
} catch (error) {
  console.error('Error:', error);
  toast.error(`Error: ${error.message}`);
  setOutput('');
}
```

---

## 📝 Best Practices

### 1. State Management

✅ **Do:**
```javascript
const [input, setInput] = useState(tab.state?.input || '');
```

❌ **Don't:**
```javascript
const [input, setInput] = useState(''); // Loses state on tab switch
```

### 2. Auto-save

✅ **Do:**
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    updateTabState(tab.id, { input, output });
  }, 500);
  return () => clearTimeout(timer);
}, [input, output]);
```

❌ **Don't:**
```javascript
// No auto-save - user loses work
```

### 3. Error Messages

✅ **Do:**
```javascript
toast.error('Invalid JSON at line 5: Expected ","');
```

❌ **Don't:**
```javascript
toast.error('Error'); // Too vague
```

### 4. Loading States

✅ **Do:**
```javascript
const [loading, setLoading] = useState(false);

const process = async () => {
  setLoading(true);
  try {
    await heavyOperation();
  } finally {
    setLoading(false);
  }
};

<Button disabled={loading}>
  {loading ? 'Processing...' : 'Process'}
</Button>
```

### 5. Responsive Design

✅ **Do:**
```javascript
<div className="max-w-4xl mx-auto p-6">
  {/* Content */}
</div>
```

---

## 🚀 30-Minute Challenge

### Build a "Text Case Converter"

**Requirements:**
- Input: Text string
- Modes: UPPERCASE, lowercase, Title Case, camelCase
- Output: Converted text
- Copy button
- Auto-save

**Steps:**

1. **Create file** (5 min)
   ```
   /frontend/src/tools/TextCaseConverter.js
   ```

2. **Write code** (15 min)
   - Use template above
   - Add 4 mode buttons
   - Implement conversion logic
   - Add copy button

3. **Register** (3 min)
   - Add to `tools/index.js`
   - Add to `toolconfig.json`

4. **Test** (5 min)
   - Test all modes
   - Test auto-save
   - Test copy

5. **Polish** (2 min)
   - Add tooltips
   - Improve styling

**Bonus:**
- Add character count
- Add word count
- Add download button

---

## 🎓 Learning Path

### Beginner Tools (Start Here)

1. **Text Reverser** - Reverse a string
2. **Character Counter** - Count chars/words
3. **Case Converter** - Change text case
4. **Lorem Ipsum Generator** - Generate placeholder text

### Intermediate Tools

1. **CSV to JSON** - Parse and convert
2. **Color Converter** - HEX/RGB/HSL
3. **Image Resizer** - Resize images
4. **Password Strength Checker** - Validate passwords

### Advanced Tools

1. **Diff Viewer** - Compare two texts
2. **Syntax Highlighter** - Highlight code
3. **Chart Generator** - Create charts
4. **API Client** - Make HTTP requests

---

## 🤝 Pair Programming with AI

### Prompt Template

```
I want to build a [TOOL_NAME] tool for DevTools Suite.

Purpose: [What it does]
Input: [What user provides]
Output: [What tool produces]
Category: [Which category]

Please help me:
1. Create the React component
2. Implement the core logic
3. Add it to the tool registry
4. Update toolconfig.json

Use the existing patterns from other tools in the codebase.
```

### Example Session

**You:** "Build a Markdown to HTML converter"

**AI:** *Generates component with Monaco editor, conversion logic, preview pane*

**You:** "Add syntax highlighting to the preview"

**AI:** *Adds highlight.js integration*

**You:** "Add download HTML button"

**AI:** *Implements download functionality*

**Total Time:** 15-20 minutes

---

## 📚 Resources

- **Component Library:** [shadcn/ui](https://ui.shadcn.com)
- **Icons:** [Lucide React](https://lucide.dev)
- **Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Tailwind:** [Tailwind CSS](https://tailwindcss.com)

---

**Happy Tool Building! 🛠️**
