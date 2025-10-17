import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsYaml from 'js-yaml';

/**
 * YAML Formatter Tool
 * Formats and validates YAML with syntax highlighting
 * Client-side implementation using js-yaml
 */
function YAMLFormatter({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputYAML, setInputYAML] = useState(tab.data?.input || '');
  const [outputYAML, setOutputYAML] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Format YAML (client-side)
  const formatYAML = () => {
    try {
      // First parse YAML to validate it
      const parsedYAML = jsYaml.load(inputYAML);
      
      // Then dump it back to formatted YAML
      const formattedYAML = jsYaml.dump(parsedYAML, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
        sortKeys: false // Keep original key order
      });
      
      setOutputYAML(formattedYAML);
      setIsValid(true);
      setError(null);
      
      // Update tab data
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { ...t, data: { input: inputYAML, output: formattedYAML } }
          : t
      );
      setTabs(updatedTabs);
      
      toast.success('YAML formatted successfully!');
      return true;
    } catch (err) {
      console.error('YAML formatting error:', err);
      setIsValid(false);
      setError(err.message);
      setOutputYAML(''); // Clear output on error
      
      toast.error(`Invalid YAML: ${err.message}`);
      return false;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputYAML);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="yaml-tool" data-testid="yaml-formatter">
      <div className="json-panel">
        <div className="panel-header">
          <h3>Input YAML</h3>
          <Button 
            onClick={formatYAML} 
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
            defaultLanguage="yaml"
            theme={editorTheme}
            value={inputYAML}
            onChange={(value) => setInputYAML(value || '')}
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
            disabled={!outputYAML}
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
            defaultLanguage="yaml"
            theme={editorTheme}
            value={outputYAML}
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
YAMLFormatter.metadata = {
  id: 'yaml-formatter',
  name: 'YAML Formatter',
  description: 'Format and validate YAML',
  category: 'formatters',
  requiresBackend: false, // Client-side implementation
};

export default YAMLFormatter;
