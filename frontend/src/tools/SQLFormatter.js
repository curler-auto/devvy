import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'sql-formatter';

/**
 * SQL Formatter Tool
 * Format SQL queries with syntax highlighting
 * Client-side implementation using sql-formatter
 */
function SQLFormatter({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputSQL, setInputSQL] = useState(tab.data?.input || '');
  const [outputSQL, setOutputSQL] = useState(tab.data?.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dialect, setDialect] = useState(tab.data?.dialect || 'sql');
  const [indentSize, setIndentSize] = useState(tab.data?.indent || 2);
  const [uppercase, setUppercase] = useState(tab.data?.uppercase !== false);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            input: inputSQL,
            output: outputSQL,
            dialect,
            indent: indentSize,
            uppercase
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [inputSQL, outputSQL, dialect, indentSize, uppercase]);

  // Format SQL
  const formatSQL = () => {
    try {
      if (!inputSQL.trim()) {
        toast.error('Please enter SQL first');
        return;
      }
      
      // Format SQL using sql-formatter
      const formattedSQL = format(inputSQL, {
        language: dialect, // sql, mysql, postgresql, etc.
        indent: ' '.repeat(indentSize),
        uppercase: uppercase, // Uppercase keywords
        linesBetweenQueries: 2,
      });
      
      setOutputSQL(formattedSQL);
      setIsValid(true);
      setError(null);
      
      toast.success('SQL formatted successfully');
    } catch (err) {
      console.error('SQL formatting error:', err);
      setIsValid(false);
      setError(err.message);
      setOutputSQL('');
      
      toast.error(`Formatting error: ${err.message}`);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputSQL);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="sql-formatter-tool" data-testid="sql-formatter">
      <div className="flex flex-col h-full">
        {/* Input SQL */}
        <div className="flex-1 json-panel mb-4">
          <div className="panel-header">
            <h3>Input SQL</h3>
            <div className="flex items-center gap-2">
              <select
                value={dialect}
                onChange={(e) => setDialect(e.target.value)}
                className="px-2 py-1 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              >
                <option value="sql">Standard SQL</option>
                <option value="mysql">MySQL</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="tsql">T-SQL (SQL Server)</option>
                <option value="plsql">PL/SQL (Oracle)</option>
                <option value="sqlite">SQLite</option>
                <option value="bigquery">BigQuery</option>
                <option value="spark">Spark SQL</option>
                <option value="redshift">Redshift</option>
              </select>
              <Button 
                onClick={formatSQL} 
                size="sm"
              >
                <Code className="w-4 h-4 mr-2" />
                Format
              </Button>
            </div>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="sql"
              theme={editorTheme}
              value={inputSQL}
              onChange={(value) => setInputSQL(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: indentSize,
              }}
            />
          </div>
        </div>

        {/* Formatting Options */}
        <div className="mb-4 flex justify-center items-center">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Indent Size:</label>
              <select
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value))}
                className="px-2 py-1 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="8">8 spaces</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={uppercase}
                  onChange={(e) => setUppercase(e.target.checked)}
                />
                <span className="text-sm">Uppercase Keywords</span>
              </label>
            </div>
          </div>
        </div>

        {/* Output SQL */}
        <div className="flex-1">
          <div className="panel-header">
            <h3>Formatted SQL</h3>
            <Button 
              onClick={copyToClipboard} 
              size="sm"
              variant="outline"
              disabled={!outputSQL}
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
              defaultLanguage="sql"
              theme={editorTheme}
              value={outputSQL}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                readOnly: true,
                automaticLayout: true,
                tabSize: indentSize,
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
      </div>
    </div>
  );
}

// Tool metadata
SQLFormatter.metadata = {
  id: 'sql-formatter',
  name: 'SQL Formatter',
  description: 'Format SQL queries with syntax highlighting',
  category: 'formatters',
  requiresBackend: false, // Client-side implementation
};

export default SQLFormatter;
