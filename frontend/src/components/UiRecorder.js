import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Editor } from '@monaco-editor/react';
import { Play, Square, Copy, Download, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UiRecorder({ tab, tabs, setTabs }) {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [targetUrl, setTargetUrl] = useState(`${window.location.origin}/demo-page.html`);
  const [language, setLanguage] = useState('python');
  const [generatedCode, setGeneratedCode] = useState('');
  const [recordedEvents, setRecordedEvents] = useState([]);
  const recordingWindowRef = useRef(null);
  const eventListenerRef = useRef(null);
  const { token } = useAuth();

  useEffect(() => {
    return () => {
      if (recordingWindowRef.current && !recordingWindowRef.current.closed) {
        recordingWindowRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Create recording session
      const response = await axios.post(
        `${API}/recorder/session`,
        { language, target_url: targetUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newSessionId = response.data.session_id;
      setSessionId(newSessionId);
      setIsRecording(true);
      setRecordedEvents([]);
      setGeneratedCode('// Recording... Interact with the page to capture actions');

      // Open new window with our recorder page
      const recorderPageUrl = `${window.location.origin}/recorder.html?url=${encodeURIComponent(targetUrl)}&session=${newSessionId}&token=${token}`;
      const recordingWindow = window.open(recorderPageUrl, '_blank', 'width=1200,height=800');
      recordingWindowRef.current = recordingWindow;

      if (!recordingWindow) {
        toast.error('Please allow popups to use the recorder');
        setIsRecording(false);
        return;
      }

      toast.success('Recording started! Interact with the page in the new window');

      // Monitor if window is closed
      const checkWindow = setInterval(() => {
        if (recordingWindow.closed) {
          clearInterval(checkWindow);
          stopRecording();
        }
      }, 500);

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording session');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    
    if (recordingWindowRef.current && !recordingWindowRef.current.closed) {
      recordingWindowRef.current.close();
    }

    if (!sessionId) return;

    try {
      // Generate code from recorded events
      const response = await axios.post(
        `${API}/recorder/generate/${sessionId}`,
        { language },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGeneratedCode(response.data.code);
      toast.success('Recording stopped! Code generated');
    } catch (error) {
      console.error('Failed to generate code:', error);
      toast.error('Failed to generate code from recording');
    }
  };

  const copyCode = () => {
    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(generatedCode)
        .then(() => {
          toast.success('Code copied to clipboard!');
        })
        .catch(() => {
          // Fallback to old method
          fallbackCopyCode();
        });
    } else {
      // Use fallback method
      fallbackCopyCode();
    }
  };

  const fallbackCopyCode = () => {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = generatedCode;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      toast.success('Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy code. Please select and copy manually.');
    }
    
    document.body.removeChild(textarea);
  };

  const downloadCode = () => {
    const extension = language === 'python' ? 'py' : 'js';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recorded_test.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Code downloaded!');
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'hidden', 
      background: '#0a0a0a' 
    }}>
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px', 
        padding: '20px', 
        borderBottom: '1px solid #2a2a2a',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Globe className="w-5 h-5 text-emerald-500" />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#e5e5e5' }}>
              UI Automation Recorder
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#9ca3af' }}>
                Target URL
              </label>
              <Input
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                disabled={isRecording}
                className="api-url-input"
              />
            </div>

            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#9ca3af' }}>
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isRecording}
                className="api-method-select"
                style={{ width: '100%' }}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>

            {!isRecording ? (
              <Button
                onClick={startRecording}
                className="api-send-button"
                style={{ height: '40px' }}
              >
                <Play className="w-4 h-4" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                className="api-send-button"
                style={{ height: '40px', background: '#ef4444' }}
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </Button>
            )}
          </div>

          {isRecording && (
            <div style={{
              padding: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#10b981'
            }}>
              🔴 Recording in progress... Interact with the opened browser window
            </div>
          )}
        </div>
      </div>

      {/* Code Editor Section */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '20px', 
        overflow: 'hidden',
        minHeight: 0
      }}>
        <div className="api-response-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#e5e5e5' }}>
              Generated Code
            </span>
            {generatedCode && !isRecording && (
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                {language === 'python' ? 'Python' : language === 'javascript' ? 'JavaScript' : 'TypeScript'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {generatedCode && !isRecording && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyCode}
                  style={{ height: '32px' }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadCode}
                  style={{ height: '32px' }}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div style={{ height: '600px', overflow: 'hidden' }}>
          <Editor
            height="600px"
            language={language === 'python' ? 'python' : 'javascript'}
            value={generatedCode || '// Click "Start Recording" to begin capturing UI interactions'}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        </div>
      </div>
    </div>
  );
}
