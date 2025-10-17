import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import xmlFormatter from 'xml-formatter';

/**
 * JSON to XML Converter Tool
 * Convert JSON to XML format
 * Client-side implementation
 */
function JSONToXML({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data?.input || '');
  const [outputXML, setOutputXML] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [isInputFullscreen, setIsInputFullscreen] = useState(false);
  const [isOutputFullscreen, setIsOutputFullscreen] = useState(false);
  const [rootElement, setRootElement] = useState(tab.data?.rootElement || 'root');
  const [indentSize, setIndentSize] = useState(tab.data?.indent || 2);
  const [addDeclaration, setAddDeclaration] = useState(tab.data?.addDeclaration !== false);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputJSON,
            output: outputXML,
            rootElement,
            indent: indentSize,
            addDeclaration
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputJSON, outputXML, rootElement, indentSize, addDeclaration]);

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

  // Convert JSON to XML
  const convertToXML = () => {
    try {
      if (!inputJSON.trim()) {
        toast.error('Please enter JSON first');
        return;
      }
      
      // Parse JSON
      const parsed = JSON.parse(inputJSON);
      
      // Convert to XML
      let xmlString = '';
      
      // Add XML declaration if needed
      if (addDeclaration) {
        xmlString += '<?xml version="1.0" encoding="UTF-8"?>\n';
      }
      
      // Add root element and convert JSON to XML
      xmlString += `<${rootElement}>${jsonToXML(parsed)}</${rootElement}>`;
      
      // Format XML
      const formattedXML = xmlFormatter(xmlString, {
        indentation: ' '.repeat(indentSize),
        lineSeparator: '\n',
        collapseContent: true,
      });
      
      setOutputXML(formattedXML);
      setIsValid(true);
      setError(null);
      
      toast.success('Converted to XML successfully');
    } catch (err) {
      console.error('Conversion error:', err);
      setIsValid(false);
      setError(err.message);
      setOutputXML('');
      
      toast.error(`Conversion error: ${err.message}`);
    }
  };

  // Convert JSON to XML recursively
  const jsonToXML = (obj, parentKey = '') => {
    if (obj === null) {
      return '';
    }
    
    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        // Handle array
        return obj.map(item => {
          const elementName = getElementName(parentKey);
          return `<${elementName}>${jsonToXML(item, elementName)}</${elementName}>`;
        }).join('');
      } else {
        // Handle object
        return Object.entries(obj).map(([key, value]) => {
          const elementName = getElementName(key);
          
          if (value === null) {
            return `<${elementName}/>`;
          } else if (typeof value === 'object') {
            return `<${elementName}>${jsonToXML(value, key)}</${elementName}>`;
          } else {
            return `<${elementName}>${escapeXML(value)}</${elementName}>`;
          }
        }).join('');
      }
    } else {
      // Handle primitive value
      return escapeXML(obj);
    }
  };

  // Get valid XML element name
  const getElementName = (key) => {
    // Default element name for arrays
    if (!key || key === '') {
      return 'item';
    }
    
    // Make sure key is valid XML element name
    // Replace invalid characters with underscore
    return key.replace(/[^a-zA-Z0-9_.-]/g, '_');
  };

  // Escape XML special characters
  const escapeXML = (value) => {
    if (typeof value !== 'string') {
      return value;
    }
    
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputXML);
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
    <div className="json-to-xml-tool h-full flex flex-col" data-testid="json-to-xml">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">JSON to XML Converter</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={rootElement}
              onChange={(e) => setRootElement(e.target.value)}
              placeholder="root"
              className="w-20 px-2 py-1 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            />
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              className="px-2 py-1 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            >
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
            </select>
            <label className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={addDeclaration} onChange={(e) => setAddDeclaration(e.target.checked)} />
              XML Decl
            </label>
          </div>
        </div>
        <Button onClick={convertToXML} size="sm" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white">
          <ArrowRight className="w-4 h-4 mr-2" />
          Convert
        </Button>
      </div>
      <div className="flex-1 flex overflow-hidden">
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
                <Button onClick={() => setIsInputFullscreen(!isInputFullscreen)} size="sm" variant="ghost" className="h-8 w-8 p-0" title={isInputFullscreen ? "Restore" : "Maximize"}>
                  {isInputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <Editor height="100%" defaultLanguage="json" theme={editorTheme} value={inputJSON} onChange={(value) => setInputJSON(value || '')} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2 }} />
              {!isValid && error && (
                <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                  <AlertCircle className="w-3 h-3 inline-block mr-1" />
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
        {!isInputFullscreen && (
          <div className={`flex flex-col ${isOutputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Output XML</h3>
              <div className="flex items-center gap-2">
                <Button onClick={copyToClipboard} size="sm" variant="ghost" className="h-8" disabled={!outputXML}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button onClick={() => setIsOutputFullscreen(!isOutputFullscreen)} size="sm" variant="ghost" className="h-8 w-8 p-0" title={isOutputFullscreen ? "Restore" : "Maximize"}>
                  {isOutputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <Editor height="100%" defaultLanguage="xml" theme={editorTheme} value={outputXML} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, readOnly: true, automaticLayout: true, tabSize: indentSize }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool metadata
JSONToXML.metadata = {
  id: 'json-to-xml',
  name: 'JSON to XML',
  description: 'Convert JSON to XML format',
  category: 'converters',
  requiresBackend: false, // Client-side implementation
};

export default JSONToXML;
