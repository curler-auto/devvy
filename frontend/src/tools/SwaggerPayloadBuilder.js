import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Upload, Copy, Check, Download, RefreshCw, FileJson, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsYaml from 'js-yaml';
import { faker } from '@faker-js/faker';

/**
 * Swagger Payload Builder
 * Generate request payloads from Swagger/OpenAPI specs
 */
function SwaggerPayloadBuilder({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [swaggerSpec, setSwaggerSpec] = useState(tab.data?.swaggerSpec || '');
  const [parsedSpec, setParsedSpec] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [generatedPayload, setGeneratedPayload] = useState('');
  const [copied, setCopied] = useState(false);
  const [specFormat, setSpecFormat] = useState('json'); // json or yaml

  // Update tab data
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { swaggerSpec } }
        : t
    );
    setTabs(updatedTabs);
  }, [swaggerSpec]);

  // Parse Swagger spec
  const parseSwagger = () => {
    try {
      let spec;
      
      // Try JSON first
      try {
        spec = JSON.parse(swaggerSpec);
        setSpecFormat('json');
      } catch {
        // Try YAML
        spec = jsYaml.load(swaggerSpec);
        setSpecFormat('yaml');
      }

      setParsedSpec(spec);
      extractEndpoints(spec);
      toast.success('Swagger spec parsed successfully');
    } catch (err) {
      toast.error('Invalid Swagger/OpenAPI spec: ' + err.message);
    }
  };

  // Extract endpoints from spec
  const extractEndpoints = (spec) => {
    const endpointList = [];
    const paths = spec.paths || {};
    
    Object.keys(paths).forEach(path => {
      const pathItem = paths[path];
      
      ['get', 'post', 'put', 'patch', 'delete'].forEach(method => {
        if (pathItem[method]) {
          const operation = pathItem[method];
          endpointList.push({
            path,
            method: method.toUpperCase(),
            summary: operation.summary || '',
            description: operation.description || '',
            operationId: operation.operationId || '',
            requestBody: operation.requestBody,
            parameters: operation.parameters || []
          });
        }
      });
    });

    setEndpoints(endpointList);
  };

  // Generate payload from schema
  const generatePayloadFromSchema = (schema, definitions = {}) => {
    if (!schema) return null;

    // Handle $ref
    if (schema.$ref) {
      const refPath = schema.$ref.split('/');
      const refName = refPath[refPath.length - 1];
      
      // OpenAPI 3.0
      if (parsedSpec.components?.schemas?.[refName]) {
        return generatePayloadFromSchema(parsedSpec.components.schemas[refName], definitions);
      }
      // OpenAPI 2.0
      if (parsedSpec.definitions?.[refName]) {
        return generatePayloadFromSchema(parsedSpec.definitions[refName], definitions);
      }
    }

    // Handle allOf
    if (schema.allOf) {
      let merged = {};
      schema.allOf.forEach(subSchema => {
        const generated = generatePayloadFromSchema(subSchema, definitions);
        if (generated && typeof generated === 'object') {
          merged = { ...merged, ...generated };
        }
      });
      return merged;
    }

    // Handle oneOf/anyOf - use first option
    if (schema.oneOf || schema.anyOf) {
      const options = schema.oneOf || schema.anyOf;
      return generatePayloadFromSchema(options[0], definitions);
    }

    // Use example if available
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Generate based on type
    switch (schema.type) {
      case 'object':
        const obj = {};
        const properties = schema.properties || {};
        
        Object.keys(properties).forEach(key => {
          obj[key] = generatePayloadFromSchema(properties[key], definitions);
        });
        
        return obj;

      case 'array':
        const items = schema.items || {};
        const arrayExample = generatePayloadFromSchema(items, definitions);
        return [arrayExample];

      case 'string':
        if (schema.enum) return schema.enum[0];
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'email') return faker.internet.email();
        if (schema.format === 'uri' || schema.format === 'url') return faker.internet.url();
        if (schema.format === 'uuid') return faker.string.uuid();
        if (schema.pattern) return 'string'; // Could use randexp here
        return schema.default || faker.lorem.word();

      case 'number':
      case 'integer':
        if (schema.enum) return schema.enum[0];
        if (schema.minimum !== undefined) return schema.minimum;
        if (schema.maximum !== undefined) return schema.maximum;
        return schema.default || (schema.type === 'integer' ? 0 : 0.0);

      case 'boolean':
        return schema.default !== undefined ? schema.default : true;

      default:
        return null;
    }
  };

  // Generate payload for selected endpoint
  const generatePayload = (endpoint) => {
    setSelectedEndpoint(endpoint);

    try {
      let payload = {};

      // OpenAPI 3.0 - requestBody
      if (endpoint.requestBody) {
        const content = endpoint.requestBody.content;
        const jsonContent = content?.['application/json'] || content?.['*/*'];
        
        if (jsonContent?.schema) {
          payload = generatePayloadFromSchema(jsonContent.schema);
        }
      }
      // OpenAPI 2.0 - body parameter
      else {
        const bodyParam = endpoint.parameters.find(p => p.in === 'body');
        if (bodyParam?.schema) {
          payload = generatePayloadFromSchema(bodyParam.schema);
        }
      }

      const formatted = JSON.stringify(payload, null, 2);
      setGeneratedPayload(formatted);
      toast.success('Payload generated');
    } catch (err) {
      toast.error('Failed to generate payload: ' + err.message);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  // Download payload
  const downloadPayload = () => {
    const blob = new Blob([generatedPayload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payload-${selectedEndpoint?.operationId || 'request'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Payload downloaded');
  };

  // Load example Swagger
  const loadExample = () => {
    const exampleSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Example API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          post: {
            summary: 'Create User',
            operationId: 'createUser',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'John Doe' },
                      email: { type: 'string', format: 'email' },
                      age: { type: 'integer', minimum: 0 },
                      active: { type: 'boolean', default: true }
                    },
                    required: ['name', 'email']
                  }
                }
              }
            }
          }
        }
      }
    };
    
    setSwaggerSpec(JSON.stringify(exampleSpec, null, 2));
    toast.success('Example loaded');
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Swagger Payload Builder</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Generate request payloads from Swagger/OpenAPI specifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadExample} size="sm" variant="outline">
            <FileJson className="w-4 h-4 mr-2" />
            Load Example
          </Button>
          <Button onClick={parseSwagger} size="sm" className="bg-[var(--accent-primary)] text-white">
            <Zap className="w-4 h-4 mr-2" />
            Parse Spec
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Panel - Swagger Spec */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="mb-2">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Swagger/OpenAPI Spec (JSON or YAML)
            </label>
          </div>
          <div className="flex-1 border border-[var(--border-primary)] rounded-md overflow-hidden">
            <Editor
              height="100%"
              language={specFormat}
              theme={editorTheme}
              value={swaggerSpec}
              onChange={(value) => setSwaggerSpec(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>

        {/* Right Panel - Endpoints & Payload */}
        <div className="w-1/2 flex flex-col gap-4 overflow-hidden">
          {/* Endpoints List */}
          {parsedSpec && (
            <div className="flex-1 flex flex-col border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)] overflow-hidden">
              <div className="p-3 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Endpoints ({endpoints.length})
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {endpoints.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                    No endpoints with request bodies found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {endpoints.map((endpoint, idx) => (
                      <div
                        key={idx}
                        onClick={() => generatePayload(endpoint)}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          selectedEndpoint === endpoint
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                            : 'border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                            endpoint.method === 'GET' ? 'bg-blue-500 text-white' :
                            endpoint.method === 'POST' ? 'bg-green-500 text-white' :
                            endpoint.method === 'PUT' ? 'bg-yellow-500 text-white' :
                            endpoint.method === 'PATCH' ? 'bg-orange-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {endpoint.method}
                          </span>
                          <span className="text-sm font-mono text-[var(--text-primary)]">{endpoint.path}</span>
                        </div>
                        {endpoint.summary && (
                          <p className="text-xs text-[var(--text-secondary)]">{endpoint.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generated Payload */}
          {generatedPayload && (
            <div className="flex-1 flex flex-col border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)] overflow-hidden">
              <div className="flex items-center justify-between p-2 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Generated Payload</h3>
                <div className="flex gap-1">
                  <Button onClick={copyToClipboard} size="sm" variant="ghost" className="h-7 text-xs">
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button onClick={downloadPayload} size="sm" variant="ghost" className="h-7 text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language="json"
                  theme={editorTheme}
                  value={generatedPayload}
                  onChange={(value) => setGeneratedPayload(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                  }}
                />
              </div>
            </div>
          )}

          {/* Empty State */}
          {!parsedSpec && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)]">
              <Upload className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                No Spec Loaded
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Paste your Swagger/OpenAPI spec and click "Parse Spec"
              </p>
              <Button onClick={loadExample} size="sm">
                Load Example
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SwaggerPayloadBuilder;
