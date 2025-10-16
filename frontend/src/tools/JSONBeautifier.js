import React, { useState } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * JSON Beautifier Tool
 * Formats and validates JSON with syntax highlighting
 * Backend-dependent: Uses API for validation and formatting
 */
function JSONBeautifier({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data.input || '');
  const [outputJSON, setOutputJSON] = useState(tab.data.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Client-side JSON beautification (primary method for normal-sized JSON)
  const beautifyJSONClientSide = () => {
    try {
      // Try to parse the JSON to validate it
      const parsedJSON = JSON.parse(inputJSON);
      
      // Format with 2 spaces indentation
      const beautified = JSON.stringify(parsedJSON, null, 2);
      
      setOutputJSON(beautified);
      setIsValid(true);
      setError(null);
      
      // Update tab data
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { ...t, data: { input: inputJSON, output: beautified } }
          : t
      );
      setTabs(updatedTabs);
      
      toast.success('JSON beautified successfully!');
      return true;
    } catch (err) {
      // JSON parsing error
      setIsValid(false);
      setError(err.message);
      
      // Still show the input in output with error
      setOutputJSON(inputJSON);
      
      toast.error(`Invalid JSON: ${err.message}`);
      return false;
    }
  };

  // Check if JSON is large (over 100KB)
  const isLargeJSON = () => {
    return inputJSON.length > 100000; // 100KB threshold
  };
  
  const beautifyJSON = async () => {
    // For normal-sized JSON, use client-side beautification first
    if (!isLargeJSON()) {
      try {
        // Try client-side first (faster for most JSON)
        const success = beautifyJSONClientSide();
        if (success) return; // If successful, we're done
        
        // If client-side failed, try server-side as fallback
        toast.info('Trying server-side beautification...');
      } catch (err) {
        console.error('Client-side beautification error:', err);
        toast.error('Client-side beautification failed');
      }
    } else {
      // For large JSON, prefer server-side processing
      toast.info('Large JSON detected, using server-side processing');
    }
    
    // Try server-side beautification
    try {
      const response = await axios.post(`${API}/beautify`, {
        json_string: inputJSON,
        indent: 2
      }, { timeout: 5000 }); // Longer timeout for large JSON

      setOutputJSON(response.data.beautified);
      setIsValid(response.data.valid);
      setError(response.data.error);

      // Update tab data
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { ...t, data: { input: inputJSON, output: response.data.beautified } }
          : t
      );
      setTabs(updatedTabs);

      if (response.data.valid) {
        toast.success('JSON beautified successfully!');
      } else {
        toast.error(`Invalid JSON: ${response.data.error}`);
      }
    } catch (err) {
      console.error('Server-side beautification error:', err);
      
      // If we get here and haven't tried client-side yet (for large JSON)
      if (isLargeJSON()) {
        toast.info('Falling back to client-side processing');
        beautifyJSONClientSide();
      } else {
        toast.error('JSON beautification failed');
      }
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputJSON);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="json-tool" data-testid="json-beautifier">
      <div className="json-panel">
        <div className="panel-header">
          <h3>Input JSON</h3>
          <Button 
            onClick={beautifyJSON} 
            size="sm"
            data-testid="beautify-button"
          >
            <Code className="w-4 h-4 mr-2" />
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
            disabled={!outputJSON}
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
            defaultLanguage="json"
            theme={editorTheme}
            value={outputJSON}
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
JSONBeautifier.metadata = {
  id: 'json-beautifier',
  name: 'JSON Beautifier',
  description: 'Format and validate JSON',
  category: 'json',
  requiresBackend: true,
  backendEndpoints: ['/api/beautify'],
};

export default JSONBeautifier;
