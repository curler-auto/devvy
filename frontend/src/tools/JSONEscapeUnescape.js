import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * JSON Escape/Unescape Tool
 * Escape and unescape JSON strings for embedding in code
 * Client-side implementation
 */
function JSONEscapeUnescape({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data?.inputJSON || '');
  const [outputJSON, setOutputJSON] = useState(tab.data?.outputJSON || '');
  const [mode, setMode] = useState(tab.data?.mode || 'escape'); // 'escape' or 'unescape'
  const [copied, setCopied] = useState(false);

  // Update tab data
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { inputJSON, outputJSON, mode } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputJSON, outputJSON, mode]);

  // Process JSON
  const processJSON = () => {
    try {
      if (!inputJSON.trim()) {
        toast.error('Please enter some text');
        return;
      }

      let result;
      
      if (mode === 'escape') {
        // Escape JSON string
        result = JSON.stringify(inputJSON);
        // Remove the outer quotes added by JSON.stringify
        result = result.slice(1, -1);
      } else {
        // Unescape JSON string
        // Add quotes and parse to unescape
        result = JSON.parse('"' + inputJSON + '"');
      }
      
      setOutputJSON(result);
      toast.success(`JSON ${mode}d successfully`);
    } catch (err) {
      console.error('Processing error:', err);
      toast.error(`${mode === 'escape' ? 'Escape' : 'Unescape'} error: ${err.message}`);
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputJSON);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Swap input and output
  const swapContent = () => {
    const temp = inputJSON;
    setInputJSON(outputJSON);
    setOutputJSON(temp);
    toast.success('Content swapped');
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          <h2>JSON Escape/Unescape</h2>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm text-[var(--text-secondary)]">
            Escape JSON for embedding in code or unescape escaped JSON
          </span>
        </div>
      </div>

      <div className="json-tool">
        {/* Left Column - Input */}
        <div>
          <div className="panel-header">
            <h3>Input</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Mode:</label>
              <select 
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              >
                <option value="escape">Escape</option>
                <option value="unescape">Unescape</option>
              </select>
              <Button 
                onClick={processJSON} 
                size="sm"
              >
                {mode === 'escape' ? 'Escape' : 'Unescape'}
              </Button>
              <Button 
                onClick={swapContent} 
                size="sm"
                variant="outline"
                disabled={!outputJSON}
              >
                ⇄ Swap
              </Button>
            </div>
          </div>
          <div className="editor-container flex-1">
            <Editor
              height="100%"
              defaultLanguage="text"
              theme={editorTheme}
              value={inputJSON}
              onChange={(value) => setInputJSON(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>

      </div>

      {/* Right Column - Output */}
      <div>
          <div className="panel-header">
            <h3>Output</h3>
            <Button 
              onClick={copyToClipboard} 
              size="sm"
              variant="outline"
              disabled={!outputJSON}
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-2" /> Copied</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Copy</>
              )}
            </Button>
          </div>
          <div className="editor-container flex-1">
            <Editor
              height="100%"
              defaultLanguage="text"
              theme={editorTheme}
              value={outputJSON}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                readOnly: true,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
JSONEscapeUnescape.metadata = {
  id: 'json-escape-unescape',
  name: 'JSON Escape/Unescape',
  description: 'Escape and unescape JSON strings for embedding in code',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default JSONEscapeUnescape;
