import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Square, Trash2, Save, FolderOpen, Terminal, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * Shell/Bash Script Executor
 * Execute shell scripts with real-time output
 */
function ShellExecutor({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [script, setScript] = useState(tab.data?.script || '#!/bin/bash\n\necho "Hello World"');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [exitCode, setExitCode] = useState(null);
  const [executionTime, setExecutionTime] = useState(0);
  const [workingDir, setWorkingDir] = useState(tab.data?.workingDir || '');
  const [envVars, setEnvVars] = useState(tab.data?.envVars || []);
  const [savedScripts, setSavedScripts] = useState(tab.data?.savedScripts || []);
  const [scriptName, setScriptName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const outputRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  // Update tab data
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { script, workingDir, envVars, savedScripts } }
        : t
    );
    setTabs(updatedTabs);
  }, [script, workingDir, envVars, savedScripts]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Execute script
  const executeScript = async () => {
    if (!script.trim()) {
      toast.error('Script is empty');
      return;
    }

    setIsExecuting(true);
    setOutput('');
    setExitCode(null);
    setExecutionTime(0);
    startTimeRef.current = Date.now();

    // Start timer
    timerRef.current = setInterval(() => {
      setExecutionTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    try {
      // Prepare environment variables
      const env = {};
      envVars.forEach(v => {
        if (v.key && v.value) {
          env[v.key] = v.value;
        }
      });

      const response = await axios.post('/api/execute-script', {
        script,
        workingDir: workingDir || undefined,
        env
      });

      setOutput(response.data.output || '');
      setExitCode(response.data.exitCode);
      
      if (response.data.exitCode === 0) {
        toast.success('Script executed successfully');
      } else {
        toast.error(`Script failed with exit code ${response.data.exitCode}`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Execution failed';
      setOutput(`Error: ${errorMsg}`);
      setExitCode(-1);
      toast.error('Execution failed');
    } finally {
      setIsExecuting(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Stop execution (placeholder - would need WebSocket for real-time control)
  const stopExecution = () => {
    toast.info('Stop functionality requires WebSocket implementation');
    // In a full implementation, this would send a kill signal via WebSocket
  };

  // Add environment variable
  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  // Update environment variable
  const updateEnvVar = (index, field, value) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  // Remove environment variable
  const removeEnvVar = (index) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  // Save script
  const saveScript = () => {
    if (!scriptName.trim()) {
      toast.error('Please enter a script name');
      return;
    }

    const newScript = {
      id: Date.now().toString(),
      name: scriptName,
      script,
      workingDir,
      envVars,
      createdAt: new Date().toISOString()
    };

    setSavedScripts([...savedScripts, newScript]);
    setShowSaveDialog(false);
    setScriptName('');
    toast.success('Script saved');
  };

  // Load script
  const loadScript = (saved) => {
    setScript(saved.script);
    setWorkingDir(saved.workingDir || '');
    setEnvVars(saved.envVars || []);
    toast.success(`Loaded: ${saved.name}`);
  };

  // Delete saved script
  const deleteSavedScript = (id) => {
    if (window.confirm('Delete this saved script?')) {
      setSavedScripts(savedScripts.filter(s => s.id !== id));
      toast.success('Script deleted');
    }
  };

  // Clear output
  const clearOutput = () => {
    setOutput('');
    setExitCode(null);
    setExecutionTime(0);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Shell Script Executor</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Execute bash/shell scripts with real-time output
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={executeScript} 
            disabled={isExecuting}
            size="sm" 
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            {isExecuting ? 'Executing...' : 'Execute'}
          </Button>
          {isExecuting && (
            <Button onClick={stopExecution} size="sm" variant="outline" className="text-red-500">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
          <Button onClick={() => setShowSaveDialog(true)} size="sm" variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Panel - Script Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Configuration */}
          <div className="mb-3 p-3 border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen className="w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={workingDir}
                onChange={(e) => setWorkingDir(e.target.value)}
                placeholder="Working directory (optional, e.g., /tmp)"
                className="flex-1 px-3 py-1 text-sm border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              />
            </div>
            
            {/* Environment Variables */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">Environment Variables</span>
                <Button onClick={addEnvVar} size="sm" variant="ghost" className="h-6 text-xs">
                  + Add
                </Button>
              </div>
              {envVars.length > 0 && (
                <div className="space-y-1">
                  {envVars.map((env, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={env.key}
                        onChange={(e) => updateEnvVar(idx, 'key', e.target.value)}
                        placeholder="KEY"
                        className="w-1/3 px-2 py-1 text-xs border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono"
                      />
                      <span className="text-xs text-[var(--text-secondary)]">=</span>
                      <input
                        type="text"
                        value={env.value}
                        onChange={(e) => updateEnvVar(idx, 'value', e.target.value)}
                        placeholder="value"
                        className="flex-1 px-2 py-1 text-xs border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono"
                      />
                      <button
                        onClick={() => removeEnvVar(idx)}
                        className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Script Editor */}
          <div className="flex-1 border border-[var(--border-primary)] rounded-md overflow-hidden">
            <Editor
              height="100%"
              language="shell"
              theme={editorTheme}
              value={script}
              onChange={(value) => setScript(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>

        {/* Right Panel - Output & Saved Scripts */}
        <div className="w-96 flex flex-col gap-4 overflow-hidden">
          {/* Output */}
          <div className="flex-1 flex flex-col border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)] overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Output</span>
                {exitCode !== null && (
                  <span className={`text-xs px-2 py-0.5 rounded ${exitCode === 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {exitCode === 0 ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                    Exit: {exitCode}
                  </span>
                )}
                {executionTime > 0 && (
                  <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {executionTime}s
                  </span>
                )}
              </div>
              <Button onClick={clearOutput} size="sm" variant="ghost" className="h-6 text-xs">
                Clear
              </Button>
            </div>
            <div 
              ref={outputRef}
              className="flex-1 p-3 overflow-auto font-mono text-xs text-[var(--text-primary)] whitespace-pre-wrap"
            >
              {output || (
                <span className="text-[var(--text-secondary)] italic">
                  {isExecuting ? 'Executing...' : 'Output will appear here'}
                </span>
              )}
            </div>
          </div>

          {/* Saved Scripts */}
          <div className="h-48 flex flex-col border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)] overflow-hidden">
            <div className="p-2 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
              <span className="text-sm font-medium text-[var(--text-primary)]">Saved Scripts</span>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {savedScripts.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] text-center py-4">No saved scripts</p>
              ) : (
                <div className="space-y-1">
                  {savedScripts.map(saved => (
                    <div
                      key={saved.id}
                      className="flex items-center justify-between p-2 hover:bg-[var(--bg-tertiary)] rounded cursor-pointer"
                      onClick={() => loadScript(saved)}
                    >
                      <span className="text-xs text-[var(--text-primary)] truncate flex-1">{saved.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedScript(saved.id);
                        }}
                        className="p-1 hover:bg-[var(--bg-secondary)] rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-primary)] border-2 border-[var(--border-primary)] rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Save Script</h3>
            <input
              type="text"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              placeholder="Script name"
              className="w-full px-3 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)] mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && saveScript()}
            />
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setShowSaveDialog(false)} size="sm" variant="outline">
                Cancel
              </Button>
              <Button onClick={saveScript} size="sm" className="bg-[var(--accent-primary)] text-white">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShellExecutor;
