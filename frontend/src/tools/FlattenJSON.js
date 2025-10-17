import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { flatten, unflatten } from 'flat';

/**
 * Flatten JSON Tool
 * Convert nested JSON objects to flat structures with path-based keys
 * Client-side implementation using flat.js
 */
function FlattenJSON({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data?.input || '');
  const [flattenedJSON, setFlattenedJSON] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [delimiter, setDelimiter] = useState(tab.data?.delimiter || '.');
  const [maxDepth, setMaxDepth] = useState(tab.data?.maxDepth || 0);
  const [safe, setSafe] = useState(tab.data?.safe || true);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputJSON,
            output: flattenedJSON,
            delimiter,
            maxDepth,
            safe
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputJSON, flattenedJSON, delimiter, maxDepth, safe]);

  // Format JSON
  const formatJSON = () => {
    try {
      if (!inputJSON.trim()) {
        toast.error('Please enter JSON first');
        return;
      }
      
      // Parse and stringify to format
      const parsed = JSON.parse(inputJSON);
      const formatted = JSON.stringify(parsed, null, 2);
      
      setInputJSON(formatted);
      setIsValid(true);
      setError(null);
      
      toast.success('JSON formatted successfully');
    } catch (err) {
      console.error('JSON formatting error:', err);
      setIsValid(false);
      setError(err.message);
      
      toast.error(`Invalid JSON: ${err.message}`);
    }
  };

  // Flatten JSON
  const flattenJSON = () => {
    try {
      if (!inputJSON.trim()) {
        toast.error('Please enter JSON first');
        return;
      }
      
      // Parse input JSON
      const parsed = JSON.parse(inputJSON);
      
      // Configure options
      const options = {
        delimiter,
        safe,
      };
      
      // Add maxDepth if specified
      if (maxDepth > 0) {
        options.maxDepth = maxDepth;
      }
      
      // Flatten JSON
      const flattened = flatten(parsed, options);
      
      // Format result
      const formattedResult = JSON.stringify(flattened, null, 2);
      setFlattenedJSON(formattedResult);
      
      toast.success('JSON flattened successfully');
    } catch (err) {
      console.error('Flatten error:', err);
      toast.error(`Flatten error: ${err.message}`);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(flattenedJSON);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="flatten-json-tool" data-testid="flatten-json">
      <div className="flex flex-col h-full">
        {/* Input JSON */}
        <div className="flex-1 json-panel mb-4">
          <div className="panel-header">
            <h3>Input JSON</h3>
            <Button 
              onClick={formatJSON} 
              size="sm"
            >
              <Code className="w-4 h-4 mr-2" />
              Format
            </Button>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={editorTheme}
              value={inputJSON}
              onChange={(value) => setInputJSON(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
            {!isValid && error && (
              <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                <AlertCircle className="w-3 h-3 inline-block mr-1" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Flatten Controls */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Delimiter:</label>
              <input
                type="text"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="w-16 px-2 py-1 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                placeholder="."
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Max Depth:</label>
              <input
                type="number"
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value) || 0)}
                min="0"
                className="w-16 px-2 py-1 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                placeholder="0"
              />
              <span className="text-xs text-[var(--text-tertiary)]">(0 = unlimited)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={safe}
                  onChange={(e) => setSafe(e.target.checked)}
                />
                <span className="text-sm">Safe Mode</span>
              </label>
              <span className="text-xs text-[var(--text-tertiary)]">(Handles arrays safely)</span>
            </div>
            
            <Button 
              onClick={flattenJSON} 
              size="sm"
            >
              <ArrowDown className="w-4 h-4 mr-2" />
              Flatten JSON
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-[var(--text-tertiary)]">
            <p>
              <strong>Delimiter:</strong> Character to separate nested keys (e.g., "person.address.city")
            </p>
            <p>
              <strong>Max Depth:</strong> Maximum depth to flatten (0 = unlimited)
            </p>
            <p>
              <strong>Safe Mode:</strong> Preserves arrays and doesn't create numeric keys for array indices
            </p>
          </div>
        </div>

        {/* Flattened Result */}
        <div className="flex-1">
          <div className="panel-header">
            <h3>Flattened JSON</h3>
            <Button 
              onClick={copyToClipboard} 
              size="sm"
              variant="outline"
              disabled={!flattenedJSON}
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-2" /> Copied</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Copy</>
              )}
            </Button>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={editorTheme}
              value={flattenedJSON}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
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
FlattenJSON.metadata = {
  id: 'flatten-json',
  name: 'Flatten JSON',
  description: 'Convert nested JSON objects to flat structures with path-based keys',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default FlattenJSON;
