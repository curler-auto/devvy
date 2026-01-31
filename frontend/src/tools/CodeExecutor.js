import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Terminal as TerminalIcon, Settings, Copy, Check, Download, Upload, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import Editor from '@monaco-editor/react';

function CodeExecutor({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [executionConfigs, setExecutionConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('');
  const [executionTime, setExecutionTime] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, running, success, error
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalCommand, setTerminalCommand] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const terminalRef = useRef(null);
  const wsRef = useRef(null);

  const languageTemplates = {
    python: '# Python Code\nprint("Hello, World!")\n',
    javascript: '// JavaScript Code\nconsole.log("Hello, World!");\n',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
    c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
    go: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
    rust: 'fn main() {\n    println!("Hello, World!");\n}\n',
    ruby: '# Ruby Code\nputs "Hello, World!"\n',
    php: '<?php\necho "Hello, World!\\n";\n?>\n',
    typescript: '// TypeScript Code\nconsole.log("Hello, World!");\n',
    kotlin: 'fun main() {\n    println("Hello, World!")\n}\n',
    swift: 'print("Hello, World!")\n',
    scala: 'object Main extends App {\n  println("Hello, World!")\n}\n',
    r: '# R Code\nprint("Hello, World!")\n',
    sql: '-- SQL Query\nSELECT "Hello, World!" as message;\n',
    bash: '#!/bin/bash\necho "Hello, World!"\n',
  };

  useEffect(() => {
    loadExecutionConfigs();
    setCode(languageTemplates[language] || '');
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedConfig]);

  const loadExecutionConfigs = () => {
    try {
      const stored = localStorage.getItem('execution_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        setExecutionConfigs(configs);
        if (configs.length > 0) setSelectedConfig(configs[0].id);
      }
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  };

  const connectWebSocket = () => {
    const config = executionConfigs.find(c => c.id === selectedConfig);
    if (!config) return;

    const wsUrl = config.wsUrl || config.apiUrl.replace('http', 'ws');
    wsRef.current = new WebSocket(`${wsUrl}/terminal`);

    wsRef.current.onmessage = (event) => {
      setTerminalOutput(prev => prev + event.data);
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const executeCode = async () => {
    try {
      setLoading(true);
      setStatus('running');
      setOutput('');
      const startTime = Date.now();

      const config = executionConfigs.find(c => c.id === selectedConfig);
      if (!config) {
        toast.error('Please select an execution environment');
        return;
      }

      const response = await axios.post('/api/code/execute', {
        language,
        code,
        stdin,
        configId: selectedConfig
      }, {
        headers: { 'Authorization': `Bearer ${config.token || ''}` }
      });

      const endTime = Date.now();
      setExecutionTime(endTime - startTime);
      setOutput(response.data.output || response.data.stdout || '');
      
      if (response.data.stderr) {
        setOutput(prev => prev + '\n\n--- Errors ---\n' + response.data.stderr);
        setStatus('error');
      } else {
        setStatus('success');
      }

      toast.success(`Executed in ${endTime - startTime}ms`);
    } catch (err) {
      setStatus('error');
      setOutput(`Error: ${err.response?.data?.detail || err.message}`);
      toast.error('Execution failed');
    } finally {
      setLoading(false);
    }
  };

  const stopExecution = async () => {
    try {
      const config = executionConfigs.find(c => c.id === selectedConfig);
      await axios.post('/api/code/stop', { configId: selectedConfig }, {
        headers: { 'Authorization': `Bearer ${config.token || ''}` }
      });
      setStatus('idle');
      toast.success('Execution stopped');
    } catch (err) {
      toast.error('Failed to stop execution');
    }
  };

  const executeTerminalCommand = () => {
    if (!terminalCommand.trim()) return;

    setTerminalHistory(prev => [...prev, terminalCommand]);
    setHistoryIndex(-1);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: terminalCommand }));
      setTerminalOutput(prev => prev + `\n$ ${terminalCommand}\n`);
      setTerminalCommand('');
    } else {
      toast.error('Terminal not connected');
    }
  };

  const handleTerminalKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeTerminalCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < terminalHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setTerminalCommand(terminalHistory[terminalHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setTerminalCommand(terminalHistory[terminalHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setTerminalCommand('');
      }
    }
  };

  const changeLanguage = (newLang) => {
    setLanguage(newLang);
    setCode(languageTemplates[newLang] || '');
    setOutput('');
    setStatus('idle');
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Output copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `output-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Output downloaded');
  };

  const clearOutput = () => {
    setOutput('');
    setStatus('idle');
    setExecutionTime(null);
  };

  const clearTerminal = () => {
    setTerminalOutput('');
  };

  const getStatusIcon = () => {
    if (status === 'running') return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="tool-container flex flex-col h-full">
      <div className="tool-header">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          <h2>Code Executor</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowTerminal(!showTerminal)} size="sm" variant="outline">
            <TerminalIcon className="w-4 h-4 mr-2" />
            {showTerminal ? 'Hide' : 'Show'} Terminal
          </Button>
          <Button
            onClick={() => setShowSettings(!showSettings)}
            size="sm"
            variant="outline"
            aria-label="Execution settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-4 mb-4">
          <h3 className="text-sm font-semibold mb-2">Execution Environment Configuration</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Configure remote execution hosts in Settings → Environment
          </p>
        </div>
      )}

      <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={selectedConfig}
            onChange={(e) => setSelectedConfig(e.target.value)}
            className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)]"
            aria-label="Select execution environment"
          >
            <option value="">Select Environment</option>
            {executionConfigs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)]"
            aria-label="Select programming language"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="ruby">Ruby</option>
            <option value="php">PHP</option>
            <option value="kotlin">Kotlin</option>
            <option value="swift">Swift</option>
            <option value="scala">Scala</option>
            <option value="r">R</option>
            <option value="sql">SQL</option>
            <option value="bash">Bash</option>
          </select>

          {executionTime && (
            <span className="text-sm text-[var(--text-secondary)]">
              {executionTime}ms
            </span>
          )}
          {getStatusIcon()}
        </div>

        <div className="flex items-center gap-2">
          {status === 'running' ? (
            <Button onClick={stopExecution} size="sm" variant="destructive">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button onClick={executeCode} disabled={!selectedConfig || loading} size="sm">
              <Play className="w-4 h-4 mr-2" />
              Run Code
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Code Editor</h3>
          </div>
          <div className="flex-1 border border-[var(--border-primary)] rounded-md overflow-hidden">
            <Editor
              height="100%"
              language={language}
              theme={editorTheme}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Standard Input (stdin)</h3>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter input for your program..."
              aria-label="Standard input"
              className="h-20 px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Output</h3>
            <div className="flex gap-1">
              <Button
                onClick={copyOutput}
                size="sm"
                variant="ghost"
                disabled={!output}
                aria-label="Copy output"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                onClick={downloadOutput}
                size="sm"
                variant="ghost"
                disabled={!output}
                aria-label="Download output"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                onClick={clearOutput}
                size="sm"
                variant="ghost"
                disabled={!output}
                aria-label="Clear output"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 border border-[var(--border-primary)] rounded-md p-3 bg-[var(--bg-secondary)] overflow-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
          </div>
        </div>
      </div>

      {showTerminal && (
        <div className="border-t border-[var(--border-primary)] flex flex-col" style={{ height: '250px' }}>
          <div className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">Terminal</span>
            </div>
            <Button
              onClick={clearTerminal}
              size="sm"
              variant="ghost"
              aria-label="Clear terminal"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div
            ref={terminalRef}
            className="flex-1 p-3 bg-black text-green-400 font-mono text-sm overflow-auto"
          >
            <pre className="whitespace-pre-wrap">{terminalOutput || '$ Ready...\n'}</pre>
          </div>
          <div className="p-2 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] flex items-center gap-2">
            <span className="text-green-400 font-mono">$</span>
            <input
              type="text"
              value={terminalCommand}
              onChange={(e) => setTerminalCommand(e.target.value)}
              onKeyDown={handleTerminalKeyDown}
              placeholder="Enter command..."
              aria-label="Terminal command"
              className="flex-1 px-2 py-1 bg-black text-green-400 font-mono text-sm border-none outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

CodeExecutor.metadata = {
  id: 'code-executor',
  name: 'Code Executor',
  description: 'Execute code in multiple languages with integrated terminal',
  category: 'utilities',
  requiresBackend: true,
};

export default CodeExecutor;
