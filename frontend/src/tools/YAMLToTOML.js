import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsYaml from 'js-yaml';
import TOML from 'toml';

/**
 * YAML to TOML Converter Tool
 * Convert YAML to TOML format
 * Client-side implementation using js-yaml and toml
 */
function YAMLToTOML({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputYAML, setInputYAML] = useState(tab.data?.input || '');
  const [outputTOML, setOutputTOML] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [isInputFullscreen, setIsInputFullscreen] = useState(false);
  const [isOutputFullscreen, setIsOutputFullscreen] = useState(false);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputYAML,
            output: outputTOML
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputYAML, outputTOML]);

  // Format YAML
  const formatYAML = () => {
    try {
      if (!inputYAML.trim()) {
        toast.error('Please enter YAML first');
        return;
      }
      
      // Parse and dump to format
      const parsed = jsYaml.load(inputYAML);
      const formatted = jsYaml.dump(parsed, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
      });
      
      setInputYAML(formatted);
      setIsValid(true);
      setError(null);
      
      toast.success('YAML formatted successfully');
    } catch (err) {
      console.error('YAML formatting error:', err);
      setIsValid(false);
      setError(err.message);
      
      toast.error(`Invalid YAML: ${err.message}`);
    }
  };

  // Convert YAML to TOML
  const convertToTOML = () => {
    try {
      if (!inputYAML.trim()) {
        toast.error('Please enter YAML first');
        return;
      }
      
      // Parse YAML to JS object
      const parsed = jsYaml.load(inputYAML);
      
      // Convert JS object to TOML
      const tomlString = objectToTOML(parsed);
      
      setOutputTOML(tomlString);
      setIsValid(true);
      setError(null);
      
      toast.success('Converted to TOML successfully');
    } catch (err) {
      console.error('Conversion error:', err);
      setIsValid(false);
      setError(err.message);
      setOutputTOML('');
      
      toast.error(`Conversion error: ${err.message}`);
    }
  };

  // Convert JS object to TOML string
  const objectToTOML = (obj, prefix = '') => {
    let result = '';
    const tables = {};
    
    // Process simple key-value pairs first
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
    
    // Process tables
    Object.entries(tables).forEach(([key, value]) => {
      const tablePath = prefix ? `${prefix}.${key}` : key;
      result += `[${tablePath}]\n`;
      
      // Process table contents
      Object.entries(value).forEach(([subKey, subValue]) => {
        if (typeof subValue === 'object' && subValue !== null && !Array.isArray(subValue)) {
          // Nested table, recurse
          result += '\n' + objectToTOML(subValue, tablePath + '.' + subKey);
        } else {
          // Simple key-value pair in table
          result += `${subKey} = ${formatTOMLValue(subValue)}\n`;
        }
      });
      
      result += '\n';
    });
    
    return result;
  };
  
  // Format value for TOML
  const formatTOMLValue = (value) => {
    if (typeof value === 'string') {
      // Escape special characters
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
      
      return `"${escaped}"`;
    } else if (Array.isArray(value)) {
      return `[${value.map(formatTOMLValue).join(', ')}]`;
    } else if (typeof value === 'object' && value !== null) {
      // Inline table
      return `{ ${Object.entries(value).map(([k, v]) => `${k} = ${formatTOMLValue(v)}`).join(', ')} }`;
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else if (value === null) {
      // TOML doesn't have null, use empty string
      return '""';
    } else {
      return String(value);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputTOML);
      setCopied(true);
      toast.success('Output copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const copyInputToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inputYAML);
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
    <div className="yaml-to-toml-tool h-full flex flex-col" data-testid="yaml-to-toml">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">YAML to TOML Converter</h2>
        <Button onClick={convertToTOML} size="sm" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"><ArrowRight className="w-4 h-4 mr-2" />Convert</Button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {!isOutputFullscreen && (
          <div className={`flex flex-col border-r border-[var(--border-primary)] ${isInputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Input YAML</h3>
              <div className="flex items-center gap-2">
                <Button onClick={formatYAML} size="sm" variant="ghost" className="h-8"><Code className="w-4 h-4 mr-2" />Format</Button>
                <Button onClick={copyInputToClipboard} size="sm" variant="ghost" className="h-8">{copiedInput ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                <Button onClick={() => setIsInputFullscreen(!isInputFullscreen)} size="sm" variant="ghost" className="h-8 w-8 p-0">{isInputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <Editor height="100%" defaultLanguage="yaml" theme={editorTheme} value={inputYAML} onChange={(value) => setInputYAML(value || '')} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2 }} />
              {!isValid && error && <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500"><AlertCircle className="w-3 h-3 inline-block mr-1" />{error}</div>}
            </div>
          </div>
        )}
        {!isInputFullscreen && (
          <div className={`flex flex-col ${isOutputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Output TOML</h3>
              <div className="flex items-center gap-2">
                <Button onClick={copyToClipboard} size="sm" variant="ghost" className="h-8" disabled={!outputTOML}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                <Button onClick={() => setIsOutputFullscreen(!isOutputFullscreen)} size="sm" variant="ghost" className="h-8 w-8 p-0">{isOutputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
              </div>
            </div>
            <div className="flex-1">
              <Editor height="100%" defaultLanguage="toml" theme={editorTheme} value={outputTOML} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, readOnly: true, automaticLayout: true, tabSize: 2 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool metadata
YAMLToTOML.metadata = {
  id: 'yaml-to-toml',
  name: 'YAML to TOML',
  description: 'Convert YAML to TOML format',
  category: 'converters',
  requiresBackend: false, // Client-side implementation
};

export default YAMLToTOML;
