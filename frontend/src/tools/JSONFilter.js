import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, Filter, Plus, X, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { JSONPath } from 'jsonpath-plus';
import { beautifyJSON } from '@/utils/jsonUtils';

/**
 * JSON Filter Tool
 * Filter JSON data based on various conditions
 * Client-side implementation
 */
function JSONFilter({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data?.input || '');
  const [filteredJSON, setFilteredJSON] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [parsedJSON, setParsedJSON] = useState(null);
  const [filterRules, setFilterRules] = useState(tab.data?.rules || [
    { id: 1, type: 'remove-null', path: '$..', value: '', enabled: true }
  ]);

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

  // Update tab data
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputJSON,
            output: filteredJSON,
            rules: filterRules
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputJSON, filteredJSON, filterRules]);

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
      setParsedJSON(parsed);
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

  // Add a new filter rule
  const addFilterRule = () => {
    const newId = Math.max(0, ...filterRules.map(rule => rule.id)) + 1;
    setFilterRules([...filterRules, { 
      id: newId, 
      type: 'remove-null', 
      path: '$..', 
      value: '', 
      enabled: true 
    }]);
  };

  // Remove a filter rule
  const removeFilterRule = (id) => {
    setFilterRules(filterRules.filter(rule => rule.id !== id));
  };

  // Update a filter rule
  const updateFilterRule = (id, field, value) => {
    setFilterRules(filterRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  // Toggle a filter rule
  const toggleFilterRule = (id) => {
    setFilterRules(filterRules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  // Apply filter rules
  const applyFilters = () => {
    try {
      if (!parsedJSON) {
        toast.error('Please enter valid JSON first');
        return;
      }
      
      // Clone the input JSON to avoid modifying the original
      let result = JSON.parse(JSON.stringify(parsedJSON));
      
      // Apply each enabled filter rule
      const enabledRules = filterRules.filter(rule => rule.enabled);
      
      if (enabledRules.length === 0) {
        toast.info('No enabled filter rules to apply');
        setFilteredJSON(JSON.stringify(result, null, 2));
        return;
      }
      
      // Apply filters
      enabledRules.forEach(rule => {
        result = applyFilter(result, rule);
      });
      
      // Format result
      const formattedResult = JSON.stringify(result, null, 2);
      setFilteredJSON(formattedResult);
      
      toast.success('Filters applied successfully');
    } catch (err) {
      console.error('Filter error:', err);
      toast.error(`Filter error: ${err.message}`);
    }
  };

  // Apply a single filter rule
  const applyFilter = (json, rule) => {
    switch (rule.type) {
      case 'remove-null':
        return removeNullValues(json, rule.path);
      
      case 'remove-empty':
        return removeEmptyValues(json, rule.path);
      
      case 'keep-only':
        return keepOnlyValues(json, rule.path);
      
      case 'remove-keys':
        return removeKeys(json, rule.path);
      
      case 'filter-value':
        return filterByValue(json, rule.path, rule.value);
      
      default:
        return json;
    }
  };

  // Remove null values
  const removeNullValues = (json, path) => {
    const paths = JSONPath({ path, json, resultType: 'pointer' });
    
    // Process from deepest paths to shallowest to avoid modifying paths we'll need later
    paths.sort((a, b) => b.split('/').length - a.split('/').length);
    
    paths.forEach(pointer => {
      try {
        const parts = pointer.split('/').filter(p => p);
        let current = json;
        let parent = null;
        let lastKey = null;
        
        // Navigate to the parent of the target
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          parent = current;
          current = current[isNaN(part) ? part : parseInt(part)];
          lastKey = parts[i + 1];
        }
        
        // If the value is null, remove it
        if (current[lastKey] === null) {
          if (Array.isArray(parent)) {
            parent.splice(parseInt(lastKey), 1);
          } else {
            delete current[lastKey];
          }
        }
      } catch (err) {
        console.error('Error processing path:', pointer, err);
      }
    });
    
    return json;
  };

  // Remove empty values (empty arrays, empty objects, empty strings)
  const removeEmptyValues = (json, path) => {
    const paths = JSONPath({ path, json, resultType: 'pointer' });
    
    // Process from deepest paths to shallowest
    paths.sort((a, b) => b.split('/').length - a.split('/').length);
    
    paths.forEach(pointer => {
      try {
        const parts = pointer.split('/').filter(p => p);
        let current = json;
        let parent = null;
        let lastKey = null;
        
        // Navigate to the parent of the target
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          parent = current;
          current = current[isNaN(part) ? part : parseInt(part)];
          lastKey = parts[i + 1];
        }
        
        const value = current[lastKey];
        
        // Check if empty
        const isEmpty = (
          value === '' || 
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
        );
        
        if (isEmpty) {
          if (Array.isArray(parent)) {
            parent.splice(parseInt(lastKey), 1);
          } else {
            delete current[lastKey];
          }
        }
      } catch (err) {
        console.error('Error processing path:', pointer, err);
      }
    });
    
    return json;
  };

  // Keep only specified paths
  const keepOnlyValues = (json, path) => {
    const result = {};
    const paths = JSONPath({ path, json, resultType: 'path' });
    
    paths.forEach(p => {
      try {
        const value = JSONPath({ path: p, json, resultType: 'value' })[0];
        
        // Build the result object
        const parts = p.substring(2).split('.');
        let current = result;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        
        current[parts[parts.length - 1]] = value;
      } catch (err) {
        console.error('Error processing path:', p, err);
      }
    });
    
    return result;
  };

  // Remove specific keys
  const removeKeys = (json, keys) => {
    const keysToRemove = keys.split(',').map(k => k.trim());
    
    const removeKeysRecursive = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => removeKeysRecursive(item));
      }
      
      const result = { ...obj };
      keysToRemove.forEach(key => {
        delete result[key];
      });
      
      // Process nested objects
      Object.keys(result).forEach(key => {
        result[key] = removeKeysRecursive(result[key]);
      });
      
      return result;
    };
    
    return removeKeysRecursive(json);
  };

  // Filter by value
  const filterByValue = (json, path, valueStr) => {
    try {
      // Parse the filter expression
      const [operator, value] = parseFilterExpression(valueStr);
      
      const paths = JSONPath({ path, json, resultType: 'pointer' });
      
      // Process from deepest paths to shallowest
      paths.sort((a, b) => b.split('/').length - a.split('/').length);
      
      paths.forEach(pointer => {
        try {
          const parts = pointer.split('/').filter(p => p);
          let current = json;
          let parent = null;
          let lastKey = null;
          
          // Navigate to the parent of the target
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            parent = current;
            current = current[isNaN(part) ? part : parseInt(part)];
            lastKey = parts[i + 1];
          }
          
          const itemValue = current[lastKey];
          
          // Apply the filter
          const shouldKeep = evaluateFilter(itemValue, operator, value);
          
          if (!shouldKeep) {
            if (Array.isArray(parent)) {
              parent.splice(parseInt(lastKey), 1);
            } else {
              delete current[lastKey];
            }
          }
        } catch (err) {
          console.error('Error processing path:', pointer, err);
        }
      });
      
      return json;
    } catch (err) {
      console.error('Filter by value error:', err);
      throw new Error(`Filter by value error: ${err.message}`);
    }
  };

  // Parse filter expression (e.g., ">10", "=hello", "!=null")
  const parseFilterExpression = (expr) => {
    const operators = ['>=', '<=', '!=', '=', '>', '<'];
    let operator = null;
    let value = null;
    
    for (const op of operators) {
      if (expr.startsWith(op)) {
        operator = op;
        value = expr.substring(op.length);
        break;
      }
    }
    
    if (!operator) {
      throw new Error('Invalid filter expression. Must start with =, !=, >, <, >=, or <=');
    }
    
    // Parse value
    if (value === 'null') {
      value = null;
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (!isNaN(value)) {
      value = Number(value);
    }
    
    return [operator, value];
  };

  // Evaluate a filter condition
  const evaluateFilter = (itemValue, operator, filterValue) => {
    switch (operator) {
      case '=':
        return itemValue === filterValue;
      case '!=':
        return itemValue !== filterValue;
      case '>':
        return itemValue > filterValue;
      case '<':
        return itemValue < filterValue;
      case '>=':
        return itemValue >= filterValue;
      case '<=':
        return itemValue <= filterValue;
      default:
        return true;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(filteredJSON);
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
    const result = beautifyJSON(filteredJSON);
    if (result.success) {
      setFilteredJSON(result.result);
      toast.success('Result beautified!');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="json-tool" data-testid="json-filter">
      {/* Left Column - Input */}
      <div>
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

        {/* Filter Rules */}
        <div className="mb-4">
          <div className="panel-header mb-2">
            <h3>Filter Rules</h3>
            <div className="flex gap-2">
              <Button 
                onClick={addFilterRule} 
                size="sm"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
              <Button 
                onClick={applyFilters} 
                size="sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            {filterRules.map((rule) => (
              <div 
                key={rule.id} 
                className={`flex items-center gap-2 p-2 border rounded-md ${
                  rule.enabled 
                    ? 'border-[var(--border-primary)]' 
                    : 'border-[var(--border-primary)] opacity-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleFilterRule(rule.id)}
                  className="w-4 h-4"
                />
                
                <select
                  value={rule.type}
                  onChange={(e) => updateFilterRule(rule.id, 'type', e.target.value)}
                  className="px-2 py-1 text-sm rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"
                >
                  <option value="remove-null">Remove Null Values</option>
                  <option value="remove-empty">Remove Empty Values</option>
                  <option value="keep-only">Keep Only Matching</option>
                  <option value="remove-keys">Remove Keys</option>
                  <option value="filter-value">Filter by Value</option>
                </select>
                
                {rule.type !== 'remove-keys' ? (
                  <input
                    type="text"
                    value={rule.path}
                    onChange={(e) => updateFilterRule(rule.id, 'path', e.target.value)}
                    placeholder="JSONPath (e.g., $..)"
                    className="flex-1 px-2 py-1 text-sm rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"
                  />
                ) : (
                  <input
                    type="text"
                    value={rule.path}
                    onChange={(e) => updateFilterRule(rule.id, 'path', e.target.value)}
                    placeholder="Keys to remove (comma-separated)"
                    className="flex-1 px-2 py-1 text-sm rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"
                  />
                )}
                
                {rule.type === 'filter-value' && (
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateFilterRule(rule.id, 'value', e.target.value)}
                    placeholder="Filter (e.g., >10, =true)"
                    className="w-40 px-2 py-1 text-sm rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"
                  />
                )}
                
                <Button 
                  onClick={() => removeFilterRule(rule.id)} 
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {filterRules.length === 0 && (
            <div className="text-center p-4 text-[var(--text-tertiary)]">
              No filter rules. Add a rule to start filtering.
            </div>
          )}
        </div>

      </div>

      {/* Right Column - Filtered Result */}
      <div>
        <div className="panel-header">
          <h3>Filtered Result</h3>
          <div className="flex gap-2">
            <Button 
              onClick={beautifyOutput} 
              size="sm"
              variant="outline"
              disabled={!filteredJSON}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Beautify
            </Button>
            <Button 
              onClick={copyToClipboard} 
              size="sm"
              variant="outline"
              disabled={!filteredJSON}
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
            value={filteredJSON}
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
JSONFilter.metadata = {
  id: 'json-filter',
  name: 'JSON Filter',
  description: 'Filter JSON data based on various conditions',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default JSONFilter;
