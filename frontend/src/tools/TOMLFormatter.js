import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import TOML from 'toml';

/**
 * TOML Formatter Tool
 * Formats and validates TOML with syntax highlighting
 * Client-side implementation using TOML.js
 */
function TOMLFormatter({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputTOML, setInputTOML] = useState(tab.data?.input || '');
  const [outputTOML, setOutputTOML] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Format TOML (client-side)
  const formatTOML = () => {
    try {
      // First parse TOML to validate it
      const parsedTOML = TOML.parse(inputTOML);
      
      // Since TOML.js doesn't have a built-in stringify function with formatting,
      // we'll implement a simple formatter
      const formattedTOML = formatTOMLObject(parsedTOML);
      
      setOutputTOML(formattedTOML);
      setIsValid(true);
      setError(null);
      
      // Update tab data
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { ...t, data: { input: inputTOML, output: formattedTOML } }
          : t
      );
      setTabs(updatedTabs);
      
      toast.success('TOML formatted successfully!');
      return true;
    } catch (err) {
      console.error('TOML formatting error:', err);
      setIsValid(false);
      setError(err.message);
      setOutputTOML(''); // Clear output on error
      
      toast.error(`Invalid TOML: ${err.message}`);
      return false;
    }
  };

  // Custom TOML formatter
  const formatTOMLObject = (obj, prefix = '') => {
    let result = '';
    const tables = {};
    
    // First process simple key-value pairs
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // This is a table, process later
        tables[key] = value;
      } else {
        // Simple key-value pair
        result += `${key} = ${formatTOMLValue(value)}\n`;
      }
    });
    
    // Add a newline if we have both simple pairs and tables
    if (result && Object.keys(tables).length > 0) {
      result += '\n';
    }
    
    // Now process tables
    Object.entries(tables).forEach(([key, value]) => {
      const tablePath = prefix ? `${prefix}.${key}` : key;
      result += `[${tablePath}]\n`;
      
      // Process table contents
      Object.entries(value).forEach(([subKey, subValue]) => {
        if (typeof subValue === 'object' && subValue !== null && !Array.isArray(subValue)) {
          // Nested table, recurse
          result += '\n' + formatTOMLObject(subValue, tablePath + '.' + subKey);
        } else {
          // Simple key-value pair in table
          result += `${subKey} = ${formatTOMLValue(subValue)}\n`;
        }
      });
      
      result += '\n';
    });
    
    return result;
  };
  
  // Format TOML values properly
  const formatTOMLValue = (value) => {
    if (typeof value === 'string') {
      return `"${value.replace(/"/g, '\\"')}"`;
    } else if (Array.isArray(value)) {
      return `[${value.map(formatTOMLValue).join(', ')}]`;
    } else if (typeof value === 'object' && value !== null) {
      // Inline table
      return `{ ${Object.entries(value).map(([k, v]) => `${k} = ${formatTOMLValue(v)}`).join(', ')} }`;
    } else {
      return String(value);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputTOML);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="toml-tool" data-testid="toml-formatter">
      <div className="json-panel">
        <div className="panel-header">
          <h3>Input TOML</h3>
          <Button 
            onClick={formatTOML} 
            size="sm"
            data-testid="format-button"
          >
            <Code className="w-4 h-4 mr-2" />
            Format
          </Button>
        </div>
        <div className="editor-container">
          <Editor
            height="100%"
            defaultLanguage="toml"
            theme={editorTheme}
            value={inputTOML}
            onChange={(value) => setInputTOML(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>
      </div>

      <div className="json-panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <h3>Output</h3>
            {!isValid && error && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </span>
            )}
          </div>
          <Button 
            onClick={copyToClipboard}
            size="sm"
            variant="outline"
            disabled={!outputTOML}
            data-testid="copy-button"
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
            defaultLanguage="toml"
            theme={editorTheme}
            value={outputTOML}
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
  );
}

// Tool metadata
TOMLFormatter.metadata = {
  id: 'toml-formatter',
  name: 'TOML Formatter',
  description: 'Format and validate TOML',
  category: 'formatters',
  requiresBackend: false, // Client-side implementation
};

export default TOMLFormatter;
