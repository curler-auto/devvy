import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { unflatten } from 'flat';

/**
 * Unflatten JSON Tool
 * Convert flat JSON objects with path-based keys to nested structures
 * Client-side implementation using flat.js
 */
function UnflattenJSON({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data?.input || '');
  const [unflattenedJSON, setUnflattenedJSON] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [delimiter, setDelimiter] = useState(tab.data?.delimiter || '.');
  const [overwrite, setOverwrite] = useState(tab.data?.overwrite || false);
  const [object, setObject] = useState(tab.data?.object || true);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputJSON,
            output: unflattenedJSON,
            delimiter,
            overwrite,
            object
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputJSON, unflattenedJSON, delimiter, overwrite, object]);

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

  // Unflatten JSON
  const unflattenJSON = () => {
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
        overwrite,
        object
      };
      
      // Unflatten JSON
      const unflattened = unflatten(parsed, options);
      
      // Format result
      const formattedResult = JSON.stringify(unflattened, null, 2);
      setUnflattenedJSON(formattedResult);
      
      toast.success('JSON unflattened successfully');
    } catch (err) {
      console.error('Unflatten error:', err);
      toast.error(`Unflatten error: ${err.message}`);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(unflattenedJSON);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="unflatten-json-tool" data-testid="unflatten-json">
      <div className="flex flex-col h-full">
        {/* Input JSON */}
        <div className="flex-1 json-panel mb-4">
          <div className="panel-header">
            <h3>Input Flat JSON</h3>
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

        {/* Unflatten Controls */}
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
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                />
                <span className="text-sm">Overwrite</span>
              </label>
              <span className="text-xs text-[var(--text-tertiary)]">(Overwrite existing keys)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={object}
                  onChange={(e) => setObject(e.target.checked)}
                />
                <span className="text-sm">Object Mode</span>
              </label>
              <span className="text-xs text-[var(--text-tertiary)]">(Create objects for nested keys)</span>
            </div>
            
            <Button 
              onClick={unflattenJSON} 
              size="sm"
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              Unflatten JSON
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-[var(--text-tertiary)]">
            <p>
              <strong>Delimiter:</strong> Character that separates nested keys (e.g., "person.address.city")
            </p>
            <p>
              <strong>Overwrite:</strong> If enabled, will overwrite existing keys when there's a conflict
            </p>
            <p>
              <strong>Object Mode:</strong> If enabled, creates objects for nested keys; otherwise creates arrays for numeric keys
            </p>
          </div>
        </div>

        {/* Unflattened Result */}
        <div className="flex-1">
          <div className="panel-header">
            <h3>Unflattened JSON</h3>
            <Button 
              onClick={copyToClipboard} 
              size="sm"
              variant="outline"
              disabled={!unflattenedJSON}
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
              value={unflattenedJSON}
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
UnflattenJSON.metadata = {
  id: 'unflatten-json',
  name: 'Unflatten JSON',
  description: 'Convert flat JSON objects with path-based keys to nested structures',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default UnflattenJSON;
