import React, { useState } from 'react';
import { FileCode, Download, Copy, Check, Upload, Sparkles, Code, FileJson, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import AIChat from '../components/AIChat';

function OpenAPIToTests({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [openApiSpec, setOpenApiSpec] = useState('');
  const [outputFormat, setOutputFormat] = useState('python');
  const [testFramework, setTestFramework] = useState('pytest');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeAuth, setIncludeAuth] = useState(true);
  const [includeValidation, setIncludeValidation] = useState(true);
  const [includeExamples, setIncludeExamples] = useState(true);
  const [baseUrl, setBaseUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatMinimized, setAiChatMinimized] = useState(false);

  const toolContext = {
    toolName: 'OpenAPI to Test Cases',
    toolId: 'openapi-to-tests',
    description: 'Convert OpenAPI specifications to test code in multiple languages',
    currentData: {
      spec: openApiSpec,
      outputFormat,
      testFramework,
      generatedCode
    }
  };

  const outputFormats = {
    python: { name: 'Python', frameworks: ['pytest', 'unittest', 'requests'], icon: '🐍' },
    postman: { name: 'Postman Collection', frameworks: ['v2.1'], icon: '📮' },
    java: { name: 'Java', frameworks: ['JUnit 5', 'RestAssured', 'TestNG'], icon: '☕' },
    javascript: { name: 'JavaScript', frameworks: ['Jest', 'Mocha', 'Axios'], icon: '📜' },
    typescript: { name: 'TypeScript', frameworks: ['Jest', 'Supertest'], icon: '📘' },
    go: { name: 'Go', frameworks: ['testing', 'testify'], icon: '🔵' },
    csharp: { name: 'C#', frameworks: ['NUnit', 'xUnit'], icon: '🔷' },
    ruby: { name: 'Ruby', frameworks: ['RSpec', 'Minitest'], icon: '💎' },
  };

  const generateTests = async () => {
    try {
      setLoading(true);
      
      // Validate OpenAPI spec
      let spec;
      try {
        spec = JSON.parse(openApiSpec);
      } catch (e) {
        toast.error('Invalid JSON. Please provide a valid OpenAPI specification.');
        return;
      }

      const response = await axios.post('/api/openapi/generate-tests', {
        spec,
        outputFormat,
        testFramework,
        options: {
          includeAuth,
          includeValidation,
          includeExamples,
          baseUrl: baseUrl || spec.servers?.[0]?.url || 'http://localhost:8000'
        }
      });

      setGeneratedCode(response.data.code);
      toast.success('Test cases generated successfully!');
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(`Failed to generate tests: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setOpenApiSpec(e.target.result);
      toast.success('File uploaded');
    };
    reader.readAsText(file);
  };

  const downloadCode = () => {
    const extensions = {
      python: 'py',
      postman: 'json',
      java: 'java',
      javascript: 'js',
      typescript: 'ts',
      go: 'go',
      csharp: 'cs',
      ruby: 'rb'
    };

    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api_tests.${extensions[outputFormat]}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Code downloaded');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const loadExample = () => {
    const exampleSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Sample API',
        version: '1.0.0',
        description: 'A sample API for testing'
      },
      servers: [
        { url: 'https://api.example.com/v1' }
      ],
      paths: {
        '/users': {
          get: {
            summary: 'Get all users',
            operationId: 'getUsers',
            tags: ['Users'],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          email: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            summary: 'Create user',
            operationId: 'createUser',
            tags: ['Users'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' }
                    },
                    required: ['name', 'email']
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created'
              }
            }
          }
        },
        '/users/{id}': {
          get: {
            summary: 'Get user by ID',
            operationId: 'getUserById',
            tags: ['Users'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' }
              }
            ],
            responses: {
              '200': {
                description: 'Success'
              },
              '404': {
                description: 'Not found'
              }
            }
          }
        }
      }
    };
    setOpenApiSpec(JSON.stringify(exampleSpec, null, 2));
    toast.success('Example spec loaded');
  };

  const getLanguageForEditor = () => {
    if (outputFormat === 'postman') return 'json';
    if (outputFormat === 'typescript') return 'typescript';
    if (outputFormat === 'javascript') return 'javascript';
    if (outputFormat === 'python') return 'python';
    if (outputFormat === 'java') return 'java';
    if (outputFormat === 'go') return 'go';
    if (outputFormat === 'csharp') return 'csharp';
    if (outputFormat === 'ruby') return 'ruby';
    return 'plaintext';
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5" />
          <h2>OpenAPI to Test Cases</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAIChat(true)} size="sm" variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
          <Button onClick={loadExample} size="sm" variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            Load Example
          </Button>
        </div>
      </div>

      <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <AlertCircle className="w-4 h-4" />
          <span>Convert OpenAPI/Swagger specifications to test code in multiple languages</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4">
        {/* Left - Input */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">OpenAPI Specification</h3>
            <label className="cursor-pointer">
              <input type="file" accept=".json,.yaml,.yml" onChange={uploadFile} className="hidden" />
              <Button size="sm" variant="outline" as="span">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </label>
          </div>

          <div className="border border-[var(--border-primary)] rounded-md overflow-hidden" style={{ height: '400px' }}>
            <Editor
              height="100%"
              language="json"
              theme={editorTheme}
              value={openApiSpec}
              onChange={(value) => setOpenApiSpec(value || '')}
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

          <div className="space-y-3 p-3 border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)]">
            <h4 className="text-sm font-semibold">Generation Options</h4>
            
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Output Format</label>
              <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-sm">
                {Object.entries(outputFormats).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Test Framework</label>
              <select value={testFramework} onChange={(e) => setTestFramework(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-sm">
                {outputFormats[outputFormat].frameworks.map(fw => (
                  <option key={fw} value={fw.toLowerCase().replace(/\s+/g, '-')}>{fw}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Base URL (optional)</label>
              <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-sm" />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={includeAuth} onChange={(e) => setIncludeAuth(e.target.checked)} />
                <span>Include authentication tests</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={includeValidation} onChange={(e) => setIncludeValidation(e.target.checked)} />
                <span>Include response validation</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={includeExamples} onChange={(e) => setIncludeExamples(e.target.checked)} />
                <span>Include example data</span>
              </label>
            </div>

            <Button onClick={generateTests} disabled={!openApiSpec || loading} className="w-full">
              <Code className="w-4 h-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Tests'}
            </Button>
          </div>
        </div>

        {/* Right - Output */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Generated Test Code</h3>
            <div className="flex gap-1">
              <Button onClick={copyCode} size="sm" variant="ghost" disabled={!generatedCode}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button onClick={downloadCode} size="sm" variant="ghost" disabled={!generatedCode}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="border border-[var(--border-primary)] rounded-md overflow-hidden flex-1">
            <Editor
              height="100%"
              language={getLanguageForEditor()}
              theme={editorTheme}
              value={generatedCode || '// Generated test code will appear here...'}
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

      {/* AI Chat Component */}
      <AIChat
        toolContext={toolContext}
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        onMinimize={() => setAiChatMinimized(!aiChatMinimized)}
        isMinimized={aiChatMinimized}
      />
    </div>
  );
}

OpenAPIToTests.metadata = {
  id: 'openapi-to-tests',
  name: 'OpenAPI to Test Cases',
  description: 'Convert OpenAPI specs to test code in Python, Java, JavaScript, and more',
  category: 'api-testing',
  requiresBackend: true,
};

export default OpenAPIToTests;
