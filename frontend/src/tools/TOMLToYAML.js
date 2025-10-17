import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsYaml from 'js-yaml';
import TOML from 'toml';

/**
 * TOML to YAML Converter Tool
 * Convert TOML to YAML format
 * Client-side implementation using js-yaml and toml
 */
function TOMLToYAML({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputTOML, setInputTOML] = useState(tab.data?.input || '');
  const [outputYAML, setOutputYAML] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [isInputFullscreen, setIsInputFullscreen] = useState(false);
  const [isOutputFullscreen, setIsOutputFullscreen] = useState(false);
  const [indentSize, setIndentSize] = useState(tab.data?.indent || 2);
  const [sortKeys, setSortKeys] = useState(tab.data?.sortKeys || false);
  const [lineWidth, setLineWidth] = useState(tab.data?.lineWidth || 80);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputTOML,
            output: outputYAML,
            indent: indentSize,
            sortKeys,
            lineWidth
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputTOML, outputYAML, indentSize, sortKeys, lineWidth]);

  // Format TOML
  const formatTOML = () => {
    try {
      if (!inputTOML.trim()) {
        toast.error('Please enter TOML first');
        return;
      }
      
      // Parse TOML to validate and get object
      const parsed = TOML.parse(inputTOML);
      
      // Format TOML (since there's no built-in formatter in TOML.js, we'll use our custom formatter)
      const formatted = formatTOMLObject(parsed);
      
      setInputTOML(formatted);
      setIsValid(true);
      setError(null);
      
      toast.success('TOML formatted successfully');
    } catch (err) {
      console.error('TOML formatting error:', err);
      setIsValid(false);
      setError(err.message);
      
      toast.error(`Invalid TOML: ${err.message}`);
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

  // Convert TOML to YAML
  const convertToYAML = () => {
    try {
      if (!inputTOML.trim()) {
        toast.error('Please enter TOML first');
        return;
      }
      
      // Parse TOML to JS object
      const parsed = TOML.parse(inputTOML);
      
      // Convert JS object to YAML
      const yamlString = jsYaml.dump(parsed, {
        indent: indentSize,
        lineWidth: lineWidth,
        sortKeys: sortKeys,
        noRefs: true,
      });
      
      setOutputYAML(yamlString);
      setIsValid(true);
      setError(null);
      
      toast.success('Converted to YAML successfully');
    } catch (err) {
      console.error('Conversion error:', err);
      setIsValid(false);
      setError(err.message);
      setOutputYAML('');
      
      toast.error(`Conversion error: ${err.message}`);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputYAML);
      setCopied(true);
      toast.success('Output copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const copyInputToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inputTOML);
      setCopiedInput(true);
      toast.success('Input copied!');
      setTimeout(() => setCopiedInput(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isInputFullscreen) setIsInputFullscreen(false);
        if (isOutputFullscreen) setIsOutputFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isInputFullscreen, isOutputFullscreen]);

  return (
    <div className="toml-to-yaml-tool h-full flex flex-col" data-testid="toml-to-yaml">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">TOML to YAML Converter</h2>
          <div className="flex items-center gap-3">
            <select value={indentSize} onChange={(e) => setIndentSize(Number(e.target.value))} className="px-2 py-1 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]">
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
            </select>
            <select value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="px-2 py-1 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]">
              <option value="80">80</option>
              <option value="100">100</option>
              <option value="120">120</option>
              <option value="0">∞</option>
            </select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} />Sort</label>
          </div>
        </div>
        <Button onClick={convertToYAML} size="sm" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"><ArrowRight className="w-4 h-4 mr-2" />Convert</Button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {!isOutputFullscreen && (
          <div className={`flex flex-col border-r border-[var(--border-primary)] ${isInputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Input TOML</h3>
              <div className="flex items-center gap-2">
                <Button onClick={formatTOML} size="sm" variant="ghost" className="h-8"><Code className="w-4 h-4 mr-2" />Format</Button>
                <Button onClick={copyInputToClipboard} size="sm" variant="ghost" className="h-8">{copiedInput ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                <Button onClick={() => setIsInputFullscreen(!isInputFullscreen)} size="sm" variant="ghost" className="h-8 w-8 p-0">{isInputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <Editor height="100%" defaultLanguage="toml" theme={editorTheme} value={inputTOML} onChange={(value) => setInputTOML(value || '')} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2 }} />
              {!isValid && error && <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500"><AlertCircle className="w-3 h-3 inline-block mr-1" />{error}</div>}
            </div>
          </div>
        )}
        {!isInputFullscreen && (
          <div className={`flex flex-col ${isOutputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Output YAML</h3>
              <div className="flex items-center gap-2">
                <Button onClick={copyToClipboard} size="sm" variant="ghost" className="h-8" disabled={!outputYAML}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                <Button onClick={() => setIsOutputFullscreen(!isOutputFullscreen)} size="sm" variant="ghost" className="h-8 w-8 p-0">{isOutputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
              </div>
            </div>
            <div className="flex-1">
              <Editor height="100%" defaultLanguage="yaml" theme={editorTheme} value={outputYAML} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, readOnly: true, automaticLayout: true, tabSize: indentSize }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool metadata
TOMLToYAML.metadata = {
  id: 'toml-to-yaml',
  name: 'TOML to YAML',
  description: 'Convert TOML to YAML format',
  category: 'converters',
  requiresBackend: false, // Client-side implementation
};

export default TOMLToYAML;
