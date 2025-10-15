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
  const [targetUrl, setTargetUrl] = useState('https://example.com');
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

      // Open new window
      const recordingWindow = window.open(targetUrl, '_blank', 'width=1200,height=800');
      recordingWindowRef.current = recordingWindow;

      if (!recordingWindow) {
        toast.error('Please allow popups to use the recorder');
        setIsRecording(false);
        return;
      }

      // Wait for window to load and inject recorder script
      recordingWindow.addEventListener('load', () => {
        injectRecorderScript(recordingWindow, newSessionId);
      });

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

  const injectRecorderScript = (recordingWindow, sessionId) => {
    try {
      const script = recordingWindow.document.createElement('script');
      script.textContent = `
        (function() {
          let eventCounter = 0;
          const events = [];
          
          // Helper to get best selector
          function getSelector(element) {
            if (element.id) return '#' + element.id;
            if (element.getAttribute('data-testid')) return '[data-testid="' + element.getAttribute('data-testid') + '"]';
            if (element.getAttribute('name')) return '[name="' + element.getAttribute('name') + '"]';
            if (element.getAttribute('placeholder')) return '[placeholder="' + element.getAttribute('placeholder') + '"]';
            
            // Try to get text content for buttons/links
            if (element.tagName === 'BUTTON' || element.tagName === 'A') {
              const text = element.textContent.trim();
              if (text) return element.tagName.toLowerCase() + ':has-text("' + text + '")';
            }
            
            // Fallback to CSS selector
            let selector = element.tagName.toLowerCase();
            if (element.className) {
              const classes = element.className.split(' ').filter(c => c.trim());
              if (classes.length > 0) selector += '.' + classes[0];
            }
            return selector;
          }

          // Capture clicks
          document.addEventListener('click', (e) => {
            const selector = getSelector(e.target);
            events.push({
              type: 'click',
              selector: selector,
              timestamp: Date.now(),
              url: window.location.href
            });
            sendEvents();
          }, true);

          // Capture input
          document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
              const selector = getSelector(e.target);
              events.push({
                type: 'input',
                selector: selector,
                value: e.target.value,
                timestamp: Date.now(),
                url: window.location.href
              });
              sendEvents();
            }
          }, true);

          // Capture navigation
          let lastUrl = window.location.href;
          setInterval(() => {
            if (window.location.href !== lastUrl) {
              events.push({
                type: 'navigation',
                url: window.location.href,
                timestamp: Date.now()
              });
              lastUrl = window.location.href;
              sendEvents();
            }
          }, 500);

          function sendEvents() {
            if (events.length === 0) return;
            
            fetch('${API}/recorder/events/${sessionId}', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ${token}'
              },
              body: JSON.stringify({ events: [...events] })
            }).then(() => {
              events.length = 0; // Clear sent events
            }).catch(console.error);
          }

          // Send events every 2 seconds
          setInterval(sendEvents, 2000);

          console.log('UI Recorder active - your actions are being recorded');
        })();
      `;
      
      recordingWindow.document.head.appendChild(script);
      toast.success('Recording started! Interact with the page');
    } catch (error) {
      console.error('Failed to inject recorder script:', error);
      toast.error('Failed to inject recorder. The page may have security restrictions.');
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
    navigator.clipboard.writeText(generatedCode);
    toast.success('Code copied to clipboard!');
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
    <div className="api-tester-container">
      {/* Header Section */}
      <div className="api-request-section" style={{ maxHeight: '35%', minHeight: 'auto' }}>
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
      <div className="api-response-section">
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

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            height="100%"
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
