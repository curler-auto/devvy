import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsYaml from 'js-yaml';

/**
 * JSON to YAML Converter Tool
 * Convert JSON to YAML format
 * Client-side implementation using js-yaml
 */
function JSONToYAML({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data?.input || '');
  const [outputYAML, setOutputYAML] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [indentSize, setIndentSize] = useState(tab.data?.indent || 2);
  const [isInputFullscreen, setIsInputFullscreen] = useState(false);
  const [isOutputFullscreen, setIsOutputFullscreen] = useState(false);
  const [sortKeys, setSortKeys] = useState(tab.data?.sortKeys || false);
  const [lineWidth, setLineWidth] = useState(tab.data?.lineWidth || 80);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputJSON,
            output: outputYAML,
            indent: indentSize,
            sortKeys,
            lineWidth
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputJSON, outputYAML, indentSize, sortKeys, lineWidth]);

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

  // Convert JSON to YAML
  const convertToYAML = () => {
    try {
      if (!inputJSON.trim()) {
        toast.error('Please enter JSON first');
        return;
      }
      
      // Parse JSON
      const parsed = JSON.parse(inputJSON);
      
      // Convert to YAML with specified options
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
      toast.success('Output copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  const copyInputToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inputJSON);
      setCopiedInput(true);
      toast.success('Input copied to clipboard!');
      setTimeout(() => setCopiedInput(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  // Handle escape key to exit maximize
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
    <div className="json-to-yaml-tool h-full flex flex-col" data-testid="json-to-yaml">
      {/* Header with Controls */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">JSON to YAML Converter</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--text-secondary)]">Indent:</label>
              <select
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value))}
                className="px-2 py-1 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              >
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--text-secondary)]">Width:</label>
              <select
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="px-2 py-1 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              >
                <option value="80">80</option>
                <option value="100">100</option>
                <option value="120">120</option>
                <option value="0">∞</option>
              </select>
            </div>
            <label className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={sortKeys}
                onChange={(e) => setSortKeys(e.target.checked)}
              />
              Sort Keys
            </label>
          </div>
        </div>
        <Button onClick={convertToYAML} size="sm" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white">
          <ArrowRight className="w-4 h-4 mr-2" />
          Convert
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Input JSON */}
        {!isOutputFullscreen && (
          <div className={`flex flex-col border-r border-[var(--border-primary)] ${isInputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Input JSON</h3>
              <div className="flex items-center gap-2">
                <Button onClick={formatJSON} size="sm" variant="ghost" className="h-8">
                  <Code className="w-4 h-4 mr-2" />
                  Format
                </Button>
                <Button onClick={copyInputToClipboard} size="sm" variant="ghost" className="h-8">
                  {copiedInput ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button 
                  onClick={() => setIsInputFullscreen(!isInputFullscreen)} 
                  size="sm" 
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title={isInputFullscreen ? "Restore" : "Maximize"}
                >
                  {isInputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme={editorTheme}
                value={inputJSON}
                onChange={(value) => setInputJSON(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
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
        )}

        {/* Right Column - Output YAML */}
        {!isInputFullscreen && (
          <div className={`flex flex-col ${isOutputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Output YAML</h3>
              <div className="flex items-center gap-2">
                <Button onClick={copyToClipboard} size="sm" variant="ghost" className="h-8" disabled={!outputYAML}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button 
                  onClick={() => setIsOutputFullscreen(!isOutputFullscreen)} 
                  size="sm" 
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title={isOutputFullscreen ? "Restore" : "Maximize"}
                >
                  {isOutputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="yaml"
                theme={editorTheme}
                value={outputYAML}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  readOnly: true,
                  automaticLayout: true,
                  tabSize: indentSize,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool metadata
JSONToYAML.metadata = {
  id: 'json-to-yaml',
  name: 'JSON to YAML',
  description: 'Convert JSON to YAML format',
  category: 'converters',
  requiresBackend: false, // Client-side implementation
};

export default JSONToYAML;
