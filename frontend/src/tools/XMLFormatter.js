import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import xmlFormatter from 'xml-formatter';
import { DOMParser } from '@xmldom/xmldom';

/**
 * XML Formatter Tool
 * Formats and validates XML with syntax highlighting
 * Client-side implementation using xml-formatter
 */
function XMLFormatter({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputXML, setInputXML] = useState(tab.data?.input || '');
  const [outputXML, setOutputXML] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Validate XML using DOMParser
  const validateXML = (xml) => {
    try {
      const parser = new DOMParser();
      const errorHandler = {
        warning: (w) => console.warn(w),
        error: (e) => { throw new Error(e); },
        fatalError: (e) => { throw new Error(e); }
      };
      
      parser.options = { errorHandler };
      parser.parseFromString(xml, 'text/xml');
      return { valid: true, error: null };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  };

  // Format XML (client-side)
  const formatXML = () => {
    try {
      // First validate XML
      const validation = validateXML(inputXML);
      
      if (!validation.valid) {
        setIsValid(false);
        setError(validation.error);
        setOutputXML(''); // Clear output on error
        toast.error(`Invalid XML: ${validation.error}`);
        return false;
      }
      
      // Format XML
      const formattedXML = xmlFormatter(inputXML, {
        indentation: '  ', // 2 spaces
        lineSeparator: '\n',
        collapseContent: true,
      });
      
      setOutputXML(formattedXML);
      setIsValid(true);
      setError(null);
      
      // Update tab data
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { ...t, data: { input: inputXML, output: formattedXML } }
          : t
      );
      setTabs(updatedTabs);
      
      toast.success('XML formatted successfully!');
      return true;
    } catch (err) {
      console.error('XML formatting error:', err);
      setIsValid(false);
      setError(err.message);
      setOutputXML(''); // Clear output on error
      
      toast.error(`XML formatting error: ${err.message}`);
      return false;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputXML);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="xml-tool" data-testid="xml-formatter">
      <div className="json-panel">
        <div className="panel-header">
          <h3>Input XML</h3>
          <Button 
            onClick={formatXML} 
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
            defaultLanguage="xml"
            theme={editorTheme}
            value={inputXML}
            onChange={(value) => setInputXML(value || '')}
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
            disabled={!outputXML}
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
            defaultLanguage="xml"
            theme={editorTheme}
            value={outputXML}
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
XMLFormatter.metadata = {
  id: 'xml-formatter',
  name: 'XML Formatter',
  description: 'Format and validate XML',
  category: 'formatters',
  requiresBackend: false, // Client-side implementation
};

export default XMLFormatter;
