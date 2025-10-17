import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, Search, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { JSONPath } from 'jsonpath-plus';
import { beautifyJSON } from '@/utils/jsonUtils';

/**
 * JSON Path Extract Tool
 * Extract data from JSON using JSONPath expressions
 * Client-side implementation
 */
function JSONPathExtract({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data?.input || '');
  const [jsonPath, setJsonPath] = useState(tab.data?.path || '$..');
  const [extractedData, setExtractedData] = useState(tab.data?.extracted || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [parsedJSON, setParsedJSON] = useState(null);
  const [extractHistory, setExtractHistory] = useState(tab.data?.history || []);

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

  // Extract data using JSONPath
  const extractData = () => {
    try {
      if (!parsedJSON) {
        toast.error('Please enter valid JSON first');
        return;
      }
      
      // Execute JSONPath query
      const result = JSONPath({ path: jsonPath, json: parsedJSON });
      
      // Format result
      const formattedResult = JSON.stringify(result, null, 2);
      setExtractedData(formattedResult);
      
      // Add to history
      const newHistory = [
        { path: jsonPath, timestamp: new Date().toISOString() },
        ...extractHistory.slice(0, 9) // Keep last 10 items
      ];
      setExtractHistory(newHistory);
      
      // Update tab data
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { ...t, data: { 
              input: inputJSON, 
              path: jsonPath, 
              extracted: formattedResult,
              history: newHistory
            } }
          : t
      );
      setTabs(updatedTabs);
      
      toast.success('Data extracted successfully');
    } catch (err) {
      console.error('JSONPath error:', err);
      setExtractedData('');
      toast.error(`JSONPath error: ${err.message}`);
    }
  };

  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
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
    const result = beautifyJSON(extractedData);
    if (result.success) {
      setExtractedData(result.result);
      toast.success('Result beautified!');
    } else {
      toast.error(result.error);
    }
  };

  const downloadExtracted = () => {
    try {
      if (!extractedData) {
        toast.error('No data to download');
        return;
      }
      
      // Create blob and download link
      const blob = new Blob([extractedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Set attributes and trigger download
      link.href = url;
      link.download = `extracted_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Downloaded extracted data');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download data');
    }
  };

  const useHistoryItem = (path) => {
    setJsonPath(path);
  };

  return (
    <div className="jsonpath-extract-tool" data-testid="json-path-extract">
      <div className="flex flex-col h-full">
        {/* Input JSON */}
        <div className="flex-1 json-panel mb-4">
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
        </div>

        {/* JSONPath Query */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium">JSONPath Query:</label>
            <div className="flex-1 relative">
              <input
                type="text"
                value={jsonPath}
                onChange={(e) => setJsonPath(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                placeholder="$.."
              />
            </div>
            <Button 
              onClick={extractData} 
              size="sm"
            >
              <Search className="w-4 h-4 mr-2" />
              Extract
            </Button>
          </div>
          
          {/* History */}
          {extractHistory.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium mb-1">Recent Queries:</p>
              <div className="flex flex-wrap gap-2">
                {extractHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => useHistoryItem(item.path)}
                    className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] transition-colors"
                  >
                    {item.path}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <p className="text-xs text-[var(--text-tertiary)]">
            Examples: <code>$..</code> (all paths), <code>$.store.book[*].author</code> (all authors), <code>$..book[?(@.price{'>'} 10)]</code> (books with price {'>'} 10)
          </p>
        </div>

        {/* Result */}
        <div className="flex-1 json-panel">
          <div className="panel-header">
            <h3>Extracted Data</h3>
            <div className="flex gap-2">
              <Button 
                onClick={beautifyOutput} 
                size="sm"
                variant="outline"
                disabled={!extractedData}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Beautify
              </Button>
              <Button 
                onClick={() => copyToClipboard(extractedData)} 
                size="sm"
                variant="outline"
                disabled={!extractedData}
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-2" /> Copied</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copy</>
                )}
              </Button>
              <Button 
                onClick={downloadExtracted} 
                size="sm"
                variant="outline"
                disabled={!extractedData}
              >
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </div>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={editorTheme}
              value={extractedData}
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
JSONPathExtract.metadata = {
  id: 'json-path-extract',
  name: 'JSON Path Extract',
  description: 'Extract data from JSON using JSONPath expressions',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default JSONPathExtract;
