import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsYaml from 'js-yaml';

/**
 * YAML to JSON Converter Tool
 * Convert YAML to JSON format
 * Client-side implementation using js-yaml
 */
function YAMLToJSON({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputYAML, setInputYAML] = useState(tab.data?.input || '');
  const [outputJSON, setOutputJSON] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [indentSize, setIndentSize] = useState(tab.data?.indent || 2);
  const [isInputFullscreen, setIsInputFullscreen] = useState(false);
  const [isOutputFullscreen, setIsOutputFullscreen] = useState(false);

  // Handle escape key to exit fullscreen
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

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputYAML,
            output: outputJSON,
            indent: indentSize
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputYAML, outputJSON, indentSize]);

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

  // Convert YAML to JSON
  const convertToJSON = () => {
    try {
      if (!inputYAML.trim()) {
        toast.error('Please enter YAML first');
        return;
      }
      
      // Parse YAML
      const parsed = jsYaml.load(inputYAML);
      
      // Convert to JSON with specified indentation
      const jsonString = JSON.stringify(parsed, null, indentSize);
      
      setOutputJSON(jsonString);
      setIsValid(true);
      setError(null);
      
      toast.success('Converted to JSON successfully');
    } catch (err) {
      console.error('Conversion error:', err);
      setIsValid(false);
      setError(err.message);
      setOutputJSON('');
      
      toast.error(`Conversion error: ${err.message}`);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputJSON);
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
      await navigator.clipboard.writeText(inputYAML);
      setCopiedInput(true);
      toast.success('Input copied to clipboard!');
      setTimeout(() => setCopiedInput(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="yaml-to-json-tool h-full flex flex-col" data-testid="yaml-to-json">
      {/* Header with Controls */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">YAML to JSON Converter</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-secondary)]">Indent:</label>
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              className="px-2 py-1 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="0">Compact</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={convertToJSON} size="sm" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white">
            <ArrowRight className="w-4 h-4 mr-2" />
            Convert
          </Button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Input YAML */}
        {!isOutputFullscreen && (
          <div className={`flex flex-col border-r border-[var(--border-primary)] ${isInputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Input YAML</h3>
              <div className="flex items-center gap-2">
                <Button onClick={formatYAML} size="sm" variant="ghost" className="h-8">
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
              defaultLanguage="yaml"
              theme={editorTheme}
              value={inputYAML}
              onChange={(value) => setInputYAML(value || '')}
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

        {/* Right Column - Output JSON */}
        {!isInputFullscreen && (
          <div className={`flex flex-col ${isOutputFullscreen ? 'w-full' : 'w-1/2'}`}>
          <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Output JSON</h3>
            <div className="flex items-center gap-2">
              <Button onClick={copyToClipboard} size="sm" variant="ghost" className="h-8" disabled={!outputJSON}>
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
              defaultLanguage="json"
              theme={editorTheme}
              value={outputJSON}
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
YAMLToJSON.metadata = {
  id: 'yaml-to-json',
  name: 'YAML to JSON',
  description: 'Convert YAML to JSON format',
  category: 'converters',
  requiresBackend: false, // Client-side implementation
};

export default YAMLToJSON;
