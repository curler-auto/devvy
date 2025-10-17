import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { JSONPath } from 'jsonpath-plus';
import { beautifyJSON } from '@/utils/jsonUtils';

/**
 * JSON Path Finder Tool
 * Allows users to find and extract JSON paths
 * Client-side implementation
 */
function JSONPathFinder({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data?.input || '');
  const [jsonPath, setJsonPath] = useState(tab.data?.path || '$..');
  const [pathResult, setPathResult] = useState(tab.data?.result || '');
  const [hoveredPath, setHoveredPath] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [parsedJSON, setParsedJSON] = useState(null);
  
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Parse JSON when input changes
  useEffect(() => {
    try {
      if (inputJSON.trim()) {
        const parsed = JSON.parse(inputJSON);
        setParsedJSON(parsed);
        setIsValid(true);
        setError(null);
      } else {
        setParsedJSON(null);
      }
    } catch (err) {
      setParsedJSON(null);
      setIsValid(false);
      setError(err.message);
    }
  }, [inputJSON]);

  // Set up editor for path hovering
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Add hover provider for JSON paths
    monaco.languages.registerHoverProvider('json', {
      provideHover: (model, position) => {
        if (!parsedJSON) return;
        
        // Get current line and column
        const lineContent = model.getLineContent(position.lineNumber);
        const wordAtPosition = model.getWordAtPosition(position);
        
        if (!wordAtPosition) return;
        
        // Build path based on position
        try {
          // Get line and column info
          const lineNumber = position.lineNumber;
          const column = position.column;
          
          // Find the path to the hovered item
          const path = findJSONPathAtPosition(parsedJSON, lineNumber, column, model);
          
          if (path) {
            setHoveredPath(path);
            return {
              contents: [
                { value: `**JSON Path:** \`${path}\`` }
              ]
            };
          }
        } catch (err) {
          console.error('Error determining JSON path:', err);
        }
      }
    });
  };

  // Find JSON path at cursor position (simplified implementation)
  const findJSONPathAtPosition = (json, lineNumber, column, model) => {
    // This is a simplified implementation
    // For a real implementation, we would need to parse the JSON and track positions
    // of each node during parsing, which is complex
    
    // For now, we'll use a simpler approach based on the text content
    const lineContent = model.getLineContent(lineNumber).trim();
    const keyMatch = lineContent.match(/"([^"]+)":/);
    
    if (keyMatch) {
      const key = keyMatch[1];
      return `$.${key}`;
    }
    
    return null;
  };

  // Execute JSONPath query
  const executeJSONPath = () => {
    try {
      if (!parsedJSON) {
        toast.error('Please enter valid JSON first');
        return;
      }
      
      // Execute JSONPath query
      const result = JSONPath({ path: jsonPath, json: parsedJSON });
      
      // Format result
      const formattedResult = JSON.stringify(result, null, 2);
      setPathResult(formattedResult);
      
      // Update tab data
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { ...t, data: { input: inputJSON, path: jsonPath, result: formattedResult } }
          : t
      );
      setTabs(updatedTabs);
      
      toast.success('JSONPath query executed successfully');
    } catch (err) {
      setPathResult('');
      toast.error(`JSONPath error: ${err.message}`);
    }
  };

  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  const beautifyInput = () => {
    const result = beautifyJSON(inputJSON);
    if (result.success) {
      setInputJSON(result.result);
      toast.success('JSON beautified!');
    } else {
      toast.error(result.error);
    }
  };

  const beautifyOutput = () => {
    const result = beautifyJSON(pathResult);
    if (result.success) {
      setPathResult(result.result);
      toast.success('Result beautified!');
    } else {
      toast.error(result.error);
    }
  };

  const copyHoveredPath = () => {
    if (hoveredPath) {
      copyToClipboard(hoveredPath);
    } else {
      toast.error('No path currently hovered');
    }
  };

  return (
    <div className="jsonpath-tool" data-testid="json-path-finder">
      <div className="flex flex-col h-full">
        {/* Input JSON */}
        <div className="flex-1 json-panel mb-4">
          <div className="panel-header">
            <h3>Input JSON</h3>
            <Button 
              onClick={beautifyInput} 
              size="sm"
              variant="outline"
              disabled={!inputJSON}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Beautify
            </Button>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={editorTheme}
              value={inputJSON}
              onChange={(value) => setInputJSON(value || '')}
              onMount={handleEditorDidMount}
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

        {/* JSONPath Query */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium">JSONPath Query:</label>
            <div className="flex-1 relative">
              <input
                type="text"
                value={jsonPath}
                onChange={(e) => setJsonPath(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                placeholder="$.."
              />
            </div>
            <Button 
              onClick={executeJSONPath} 
              size="sm"
            >
              <Search className="w-4 h-4 mr-2" />
              Execute
            </Button>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Examples: <code>$..</code> (all paths), <code>$.store.book[*].author</code> (all authors), <code>$..book[?(@.price{'>'} 10)]</code> (books with price {'>'} 10)
          </p>
        </div>

        {/* Result */}
        <div className="flex-1 json-panel">
          <div className="panel-header">
            <h3>Result</h3>
            <div className="flex gap-2">
              <Button 
                onClick={beautifyOutput} 
                size="sm"
                variant="outline"
                disabled={!pathResult}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Beautify
              </Button>
              <Button 
                onClick={copyToClipboard} 
                size="sm"
                variant="outline"
                disabled={!pathResult}
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-2" /> Copied</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copy</>
                )}
              </Button>
            </div>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={editorTheme}
              value={pathResult}
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
JSONPathFinder.metadata = {
  id: 'json-path-finder',
  name: 'JSON Path Finder',
  description: 'Find and extract JSON paths from JSON documents',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default JSONPathFinder;
