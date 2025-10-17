import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, Layers, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { beautifyJSON } from '@/utils/jsonUtils';

/**
 * JSON Aggregator Tool
 * Combine multiple JSON objects into arrays or merge objects
 * Client-side implementation
 */
function JSONAggregator({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [jsonInputs, setJsonInputs] = useState(tab.data?.inputs || [{ id: 1, content: '', isValid: true, error: null }]);
  const [aggregatedJSON, setAggregatedJSON] = useState(tab.data?.output || '');
  const [aggregationType, setAggregationType] = useState(tab.data?.type || 'array');
  const [copied, setCopied] = useState(false);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            inputs: jsonInputs,
            output: aggregatedJSON,
            type: aggregationType
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [jsonInputs, aggregatedJSON, aggregationType]);

  // Add a new JSON input
  const addJsonInput = () => {
    const newId = Math.max(0, ...jsonInputs.map(input => input.id)) + 1;
    setJsonInputs([...jsonInputs, { id: newId, content: '', isValid: true, error: null }]);
  };

  // Remove a JSON input
  const removeJsonInput = (id) => {
    if (jsonInputs.length <= 1) {
      toast.error('Cannot remove the last input');
      return;
    }
    
    setJsonInputs(jsonInputs.filter(input => input.id !== id));
  };

  // Update JSON input content
  const updateJsonInput = (id, content) => {
    setJsonInputs(jsonInputs.map(input => {
      if (input.id === id) {
        // Validate JSON
        let isValid = true;
        let error = null;
        
        try {
          if (content.trim()) {
            JSON.parse(content);
          }
        } catch (err) {
          isValid = false;
          error = err.message;
        }
        
        return { ...input, content, isValid, error };
      }
      return input;
    }));
  };

  // Format a single JSON input
  const formatJsonInput = (id) => {
    const input = jsonInputs.find(input => input.id === id);
    if (!input) return;
    
    try {
      if (!input.content.trim()) {
        toast.error('Please enter JSON first');
        return;
      }
      
      const parsed = JSON.parse(input.content);
      const formatted = JSON.stringify(parsed, null, 2);
      
      updateJsonInput(id, formatted);
      toast.success('JSON formatted successfully');
    } catch (err) {
      toast.error(`Invalid JSON: ${err.message}`);
    }
  };

  // Aggregate JSON inputs
  const aggregateJSON = () => {
    try {
      // Check if all inputs are valid
      const invalidInputs = jsonInputs.filter(input => !input.isValid && input.content.trim());
      if (invalidInputs.length > 0) {
        toast.error('Please fix invalid JSON inputs before aggregating');
        return;
      }
      
      // Parse all inputs
      const parsedInputs = jsonInputs
        .filter(input => input.content.trim()) // Skip empty inputs
        .map(input => JSON.parse(input.content));
      
      if (parsedInputs.length === 0) {
        toast.error('Please enter at least one valid JSON input');
        return;
      }
      
      let result;
      
      if (aggregationType === 'array') {
        // Combine into array
        result = parsedInputs;
      } else if (aggregationType === 'merge') {
        // Merge objects
        result = parsedInputs.reduce((merged, current) => {
          if (typeof current !== 'object' || Array.isArray(current)) {
            throw new Error('Can only merge objects, not arrays or primitives');
          }
          return { ...merged, ...current };
        }, {});
      } else if (aggregationType === 'deep-merge') {
        // Deep merge objects
        result = deepMerge({}, ...parsedInputs);
      }
      
      // Format result
      const formattedResult = JSON.stringify(result, null, 2);
      setAggregatedJSON(formattedResult);
      
      toast.success('JSON aggregated successfully');
    } catch (err) {
      console.error('Aggregation error:', err);
      toast.error(`Aggregation error: ${err.message}`);
    }
  };

  // Deep merge objects
  const deepMerge = (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      });
    }
    
    return deepMerge(target, ...sources);
  };
  
  const isObject = (item) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(aggregatedJSON);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="json-aggregator-tool" data-testid="json-aggregator">
      <div className="flex flex-col h-full">
        {/* Inputs */}
        <div className="flex-1 mb-4 overflow-auto">
          <div className="panel-header mb-2">
            <h3>JSON Inputs</h3>
            <Button 
              onClick={addJsonInput} 
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Input
            </Button>
          </div>
          
          <div className="space-y-4">
            {jsonInputs.map((input, index) => (
              <div key={input.id} className="border border-[var(--border-primary)] rounded-md">
                <div className="panel-header">
                  <h4>Input {index + 1}</h4>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => formatJsonInput(input.id)} 
                      size="sm"
                      variant="outline"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      Format
                    </Button>
                    <Button 
                      onClick={() => removeJsonInput(input.id)} 
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="relative h-[200px]">
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme={editorTheme}
                    value={input.content}
                    onChange={(value) => updateJsonInput(input.id, value || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                    }}
                  />
                  {!input.isValid && input.error && (
                    <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                      <AlertCircle className="w-3 h-3 inline-block mr-1" />
                      {input.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aggregation Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Aggregation Type:</label>
            <select 
              value={aggregationType}
              onChange={(e) => setAggregationType(e.target.value)}
              className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            >
              <option value="array">Combine as Array</option>
              <option value="merge">Merge Objects (shallow)</option>
              <option value="deep-merge">Deep Merge Objects</option>
            </select>
          </div>
          
          <Button 
            onClick={aggregateJSON} 
            size="sm"
            className="px-8"
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            Aggregate
          </Button>
        </div>

        {/* Result */}
        <div className="flex-1">
          <div className="panel-header">
            <h3>Aggregated Result</h3>
            <Button 
              onClick={copyToClipboard} 
              size="sm"
              variant="outline"
              disabled={!aggregatedJSON}
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-2" /> Copied</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Copy</>
              )}
            </Button>
          </div>
          <div className="editor-container h-[300px]">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={editorTheme}
              value={aggregatedJSON}
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
JSONAggregator.metadata = {
  id: 'json-aggregator',
  name: 'JSON Aggregator',
  description: 'Combine multiple JSON objects into arrays or merge objects',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default JSONAggregator;
