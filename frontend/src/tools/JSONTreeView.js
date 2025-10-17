import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, Search, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as ReactJSONTree from 'react-json-tree';
import { beautifyJSON } from '@/utils/jsonUtils';

/**
 * JSON Tree View Tool
 * Visualize JSON data in a collapsible tree structure
 * Client-side implementation using react-json-tree
 */
function JSONTreeView({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data?.input || '');
  const [parsedJSON, setParsedJSON] = useState(null);
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPaths, setExpandedPaths] = useState(tab.data?.expanded || []);
  const [expandLevel, setExpandLevel] = useState(tab.data?.expandLevel || 1);
  const [showRawKeys, setShowRawKeys] = useState(tab.data?.showRawKeys || false);

  // Parse JSON when input changes
  useEffect(() => {
    try {
      if (inputJSON.trim()) {
        const parsed = JSON.parse(inputJSON);
        setParsedJSON(parsed);
        setIsValid(true);
        setError(null);
        
        // Update tab data
        const updatedTabs = tabs.map(t => 
          t.tabId === tab.tabId 
            ? { ...t, data: { 
                input: inputJSON,
                expanded: expandedPaths,
                expandLevel,
                showRawKeys
              } }
            : t
        );
        setTabs(updatedTabs);
      } else {
        setParsedJSON(null);
      }
    } catch (err) {
      setParsedJSON(null);
      setIsValid(false);
      setError(err.message);
    }
  }, [inputJSON]);

  // Update tab data when settings change
  useEffect(() => {
    if (inputJSON.trim()) {
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { ...t, data: { 
              input: inputJSON,
              expanded: expandedPaths,
              expandLevel,
              showRawKeys
            } }
          : t
      );
      setTabs(updatedTabs);
    }
  }, [expandLevel, showRawKeys]);

  // Format JSON
  const formatJSON = () => {
    const result = beautifyJSON(inputJSON);
    if (result.success) {
      setInputJSON(result.result);
      setParsedJSON(JSON.parse(result.result));
      setIsValid(true);
      setError(null);
      toast.success('JSON formatted successfully');
    } else {
      setIsValid(false);
      setError(result.error);
      toast.error(`Invalid JSON: ${result.error}`);
    }
  };

  // Copy JSON path
  const copyPath = (path) => {
    const jsonPath = `$${path.map(p => typeof p === 'number' ? `[${p}]` : `.${p}`).join('')}`;
    navigator.clipboard.writeText(jsonPath);
    toast.success(`Copied path: ${jsonPath}`);
  };

  // Theme for JSON Tree based on editor theme
  const getTreeTheme = () => {
    const isDark = editorTheme.includes('dark');
    
    return {
      base00: isDark ? '#1E1E1E' : '#FFFFFF', // background
      base01: isDark ? '#2A2A2A' : '#F5F5F5', // lines
      base02: isDark ? '#3A3A3A' : '#E5E5E5', // alt background
      base03: isDark ? '#4A4A4A' : '#D0D0D0', // comments
      base04: isDark ? '#9A9A9A' : '#A0A0A0', // punctuation
      base05: isDark ? '#D4D4D4' : '#333333', // text
      base06: isDark ? '#E9E9E9' : '#222222', // highlight
      base07: isDark ? '#FFFFFF' : '#000000', // bright text
      base08: isDark ? '#CE9178' : '#C53929', // strings
      base09: isDark ? '#B5CEA8' : '#F78C6C', // numbers
      base0A: isDark ? '#DCDCAA' : '#C792EA', // keys
      base0B: isDark ? '#4EC9B0' : '#82AAFF', // boolean
      base0C: isDark ? '#9CDCFE' : '#89DDFF', // null
      base0D: isDark ? '#569CD6' : '#6182B8', // property
      base0E: isDark ? '#C586C0' : '#C792EA', // keywords
      base0F: isDark ? '#D7BA7D' : '#FF5370', // deprecated
    };
  };

  return (
    <div className="json-tree-tool" data-testid="json-tree-view">
      <div className="flex h-full gap-4">
        {/* Left panel - Input JSON */}
        <div className="w-1/2 flex flex-col">
          <div className="panel-header">
            <h3>Input JSON</h3>
            <Button 
              onClick={formatJSON} 
              size="sm"
              variant="outline"
              disabled={!inputJSON}
              data-testid="format-button"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Beautify
            </Button>
          </div>
          <div className="flex-1 editor-container">
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

        {/* Right panel - Tree View */}
        <div className="w-1/2 flex flex-col">
          <div className="panel-header">
            <h3>Tree View</h3>
            <div className="flex gap-2">
              <select 
                value={expandLevel}
                onChange={(e) => setExpandLevel(Number(e.target.value))}
                className="px-2 py-1 text-sm rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"
              >
                <option value="1">Expand Level 1</option>
                <option value="2">Expand Level 2</option>
                <option value="3">Expand Level 3</option>
                <option value="4">Expand Level 4</option>
                <option value="5">Expand Level 5</option>
                <option value="0">Expand All</option>
              </select>
              <Button
                size="sm"
                variant={showRawKeys ? "default" : "outline"}
                onClick={() => setShowRawKeys(!showRawKeys)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showRawKeys ? 'Hide Raw' : 'Show Raw'}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-[var(--bg-tertiary)] rounded-md">
            {parsedJSON ? (
              <ReactJSONTree.JSONTree
                data={parsedJSON}
                theme={getTreeTheme()}
                invertTheme={false}
                shouldExpandNode={(keyPath) => {
                  // Expand based on level
                  return expandLevel === 0 || keyPath.length <= expandLevel;
                }}
                labelRenderer={([key, type]) => {
                  return (
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => copyPath([key])}
                      title="Click to copy path"
                    >
                      {key}
                    </span>
                  );
                }}
                valueRenderer={(raw, value) => {
                  if (showRawKeys && typeof value === 'string') {
                    return <span>{raw}</span>;
                  }
                  return <span>{raw}</span>;
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">
                {isValid ? 'Enter JSON to visualize' : 'Invalid JSON'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
JSONTreeView.metadata = {
  id: 'json-tree-view',
  name: 'JSON Tree View',
  description: 'Visualize JSON data in a collapsible tree structure',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default JSONTreeView;
