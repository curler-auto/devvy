import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { XMLParser } from 'fast-xml-parser';

/**
 * XML to JSON Converter Tool
 * Convert XML to JSON format
 * Client-side implementation using fast-xml-parser
 */
function XMLToJSON({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputXML, setInputXML] = useState(tab.data?.input || '');
  const [outputJSON, setOutputJSON] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [isInputFullscreen, setIsInputFullscreen] = useState(false);
  const [isOutputFullscreen, setIsOutputFullscreen] = useState(false);
  const [indentSize, setIndentSize] = useState(tab.data?.indent || 2);
  const [preserveAttributes, setPreserveAttributes] = useState(tab.data?.preserveAttributes !== false);
  const [ignoreDeclaration, setIgnoreDeclaration] = useState(tab.data?.ignoreDeclaration !== false);
  const [parseTagValue, setParseTagValue] = useState(tab.data?.parseTagValue !== false);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputXML,
            output: outputJSON,
            indent: indentSize,
            preserveAttributes,
            ignoreDeclaration,
            parseTagValue
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputXML, outputJSON, indentSize, preserveAttributes, ignoreDeclaration, parseTagValue]);

  // Format XML
  const formatXML = () => {
    try {
      if (!inputXML.trim()) {
        toast.error('Please enter XML first');
        return;
      }
      
      // Use the XMLParser to validate XML
      const parser = new XMLParser();
      parser.parse(inputXML);
      
      // Format XML using external formatter
      const xmlFormatter = require('xml-formatter');
      const formatted = xmlFormatter(inputXML, {
        indentation: '  ',
        lineSeparator: '\n',
        collapseContent: true,
      });
      
      setInputXML(formatted);
      setIsValid(true);
      setError(null);
      
      toast.success('XML formatted successfully');
    } catch (err) {
      console.error('XML formatting error:', err);
      setIsValid(false);
      setError(err.message);
      
      toast.error(`Invalid XML: ${err.message}`);
    }
  };

  // Convert XML to JSON
  const convertToJSON = () => {
    try {
      if (!inputXML.trim()) {
        toast.error('Please enter XML first');
        return;
      }
      
      // Configure parser options
      const options = {
        ignoreAttributes: !preserveAttributes,
        attributeNamePrefix: '@_',
        ignoreDeclaration: ignoreDeclaration,
        parseTagValue: parseTagValue,
        trimValues: true,
        isArray: (name, jpath, isLeafNode, isAttribute) => {
          // Handle arrays properly
          if (jpath.endsWith('.item') || jpath.endsWith('.element')) {
            return true;
          }
          return false;
        }
      };
      
      // Parse XML
      const parser = new XMLParser(options);
      const result = parser.parse(inputXML);
      
      // Format JSON with specified indentation
      const jsonString = JSON.stringify(result, null, indentSize);
      
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
      toast.success('Output copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const copyInputToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inputXML);
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
    <div className="xml-to-json-tool h-full flex flex-col" data-testid="xml-to-json">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">XML to JSON Converter</h2>
          <div className="flex items-center gap-2">
            <select value={indentSize} onChange={(e) => setIndentSize(Number(e.target.value))} className="px-2 py-1 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]">
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="0">Compact</option>
            </select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={preserveAttributes} onChange={(e) => setPreserveAttributes(e.target.checked)} />Attrs</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={ignoreDeclaration} onChange={(e) => setIgnoreDeclaration(e.target.checked)} />No Decl</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={parseTagValue} onChange={(e) => setParseTagValue(e.target.checked)} />Parse</label>
          </div>
        </div>
        <Button onClick={convertToJSON} size="sm" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"><ArrowRight className="w-4 h-4 mr-2" />Convert</Button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {!isOutputFullscreen && (
          <div className={`flex flex-col border-r border-[var(--border-primary)] ${isInputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Input XML</h3>
              <div className="flex items-center gap-2">
                <Button onClick={formatXML} size="sm" variant="ghost" className="h-8"><Code className="w-4 h-4 mr-2" />Format</Button>
                <Button onClick={copyInputToClipboard} size="sm" variant="ghost" className="h-8">{copiedInput ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                <Button onClick={() => setIsInputFullscreen(!isInputFullscreen)} size="sm" variant="ghost" className="h-8 w-8 p-0">{isInputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <Editor height="100%" defaultLanguage="xml" theme={editorTheme} value={inputXML} onChange={(value) => setInputXML(value || '')} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2 }} />
              {!isValid && error && <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500"><AlertCircle className="w-3 h-3 inline-block mr-1" />{error}</div>}
            </div>
          </div>
        )}
        {!isInputFullscreen && (
          <div className={`flex flex-col ${isOutputFullscreen ? 'w-full' : 'w-1/2'}`}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Output JSON</h3>
              <div className="flex items-center gap-2">
                <Button onClick={copyToClipboard} size="sm" variant="ghost" className="h-8" disabled={!outputJSON}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                <Button onClick={() => setIsOutputFullscreen(!isOutputFullscreen)} size="sm" variant="ghost" className="h-8 w-8 p-0">{isOutputFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
              </div>
            </div>
            <div className="flex-1">
              <Editor height="100%" defaultLanguage="json" theme={editorTheme} value={outputJSON} options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, readOnly: true, automaticLayout: true, tabSize: indentSize }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool metadata
XMLToJSON.metadata = {
  id: 'xml-to-json',
  name: 'XML to JSON',
  description: 'Convert XML to JSON format',
  category: 'converters',
  requiresBackend: false, // Client-side implementation
};

export default XMLToJSON;
