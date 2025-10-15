import React, { useState } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Send, Trash2, Copy, Check, FileCode } from 'lucide-react';
import { toast } from 'sonner';

export default function GrpcTester({ tab, tabs, setTabs }) {
  const [serverUrl, setServerUrl] = useState(tab.data.serverUrl || '');
  const [protoContent, setProtoContent] = useState(tab.data.protoContent || '');
  const [service, setService] = useState(tab.data.service || '');
  const [method, setMethod] = useState(tab.data.method || '');
  const [requestData, setRequestData] = useState(tab.data.requestData || '{}');
  const [metadata, setMetadata] = useState(tab.data.metadata || [{ key: '', value: '', enabled: true }]);
  const [response, setResponse] = useState(tab.data.response || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [parsedProto, setParsedProto] = useState(null);

  const updateTabData = (updates) => {
    const updatedTabs = tabs.map(t =>
      t.tabId === tab.tabId
        ? { ...t, data: { ...t.data, ...updates } }
        : t
    );
    setTabs(updatedTabs);
  };

  const handleProtoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setProtoContent(content);
        updateTabData({ protoContent: content });
        parseProtoFile(content);
        toast.success('Proto file loaded!');
      };
      reader.readAsText(file);
    }
  };

  const parseProtoFile = (content) => {
    // Simple proto parser - extracts service and rpc method names
    try {
      const serviceRegex = /service\s+(\w+)\s*{([^}]*)}/g;
      const rpcRegex = /rpc\s+(\w+)\s*\(([^)]+)\)\s*returns\s*\(([^)]+)\)/g;
      
      const services = [];
      let serviceMatch;
      
      while ((serviceMatch = serviceRegex.exec(content)) !== null) {
        const serviceName = serviceMatch[1];
        const serviceBody = serviceMatch[2];
        const methods = [];
        
        let rpcMatch;
        while ((rpcMatch = rpcRegex.exec(serviceBody)) !== null) {
          methods.push({
            name: rpcMatch[1],
            request: rpcMatch[2].trim(),
            response: rpcMatch[3].trim()
          });
        }
        
        services.push({ name: serviceName, methods });
      }
      
      setParsedProto({ services });
      if (services.length > 0) {
        setService(services[0].name);
        if (services[0].methods.length > 0) {
          setMethod(services[0].methods[0].name);
        }
      }
    } catch (error) {
      toast.error('Failed to parse proto file');
    }
  };

  const addMetadata = () => {
    const newMetadata = [...metadata, { key: '', value: '', enabled: true }];
    setMetadata(newMetadata);
    updateTabData({ metadata: newMetadata });
  };

  const updateMetadata = (index, field, value) => {
    const newMetadata = [...metadata];
    newMetadata[index][field] = value;
    setMetadata(newMetadata);
    updateTabData({ metadata: newMetadata });
  };

  const removeMetadata = (index) => {
    const newMetadata = metadata.filter((_, i) => i !== index);
    setMetadata(newMetadata);
    updateTabData({ metadata: newMetadata });
  };

  const sendGrpcRequest = async () => {
    if (!serverUrl) {
      toast.error('Please enter server URL');
      return;
    }

    if (!service || !method) {
      toast.error('Please select service and method');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      // Validate JSON
      let parsedRequest;
      try {
        parsedRequest = JSON.parse(requestData);
      } catch (e) {
        toast.error('Invalid JSON in request');
        setLoading(false);
        return;
      }

      // Build metadata
      const reqMetadata = {};
      metadata.filter(m => m.enabled && m.key).forEach(m => {
        reqMetadata[m.key] = m.value;
      });

      // Call backend gRPC proxy
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/grpc/call`, {
        server_url: serverUrl,
        service: service,
        method: method,
        request: parsedRequest,
        metadata: reqMetadata,
        proto_content: protoContent
      });

      const endTime = Date.now();

      const responseData = {
        status: 'OK',
        data: res.data.response,
        metadata: res.data.metadata || {},
        time: endTime - startTime
      };

      setResponse(responseData);
      updateTabData({
        serverUrl, protoContent, service, method, requestData, metadata,
        response: responseData
      });
      toast.success('gRPC call successful!');
    } catch (error) {
      const endTime = Date.now();
      const errorResponse = {
        status: 'ERROR',
        data: { error: error.response?.data?.detail || error.message },
        time: endTime - startTime,
        isError: true
      };
      setResponse(errorResponse);
      updateTabData({ response: errorResponse });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      toast.success('Response copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="api-tester-container" data-testid="grpc-tester">
      {/* Request Section */}
      <div className="api-request-section">
        {/* gRPC Header */}
        <div className="grpc-header">
          <div className="grpc-server-input">
            <label className="text-sm font-medium mb-2">Server URL</label>
            <Input
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                updateTabData({ serverUrl: e.target.value });
              }}
              placeholder="localhost:50051"
              className="api-url-input"
              data-testid="grpc-server-input"
            />
          </div>

          <div className="grpc-proto-upload">
            <label className="text-sm font-medium mb-2">Proto File</label>
            <div className="flex gap-2">
              <Button
                onClick={() => document.getElementById('proto-upload').click()}
                variant="outline"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload .proto
              </Button>
              <input
                id="proto-upload"
                type="file"
                accept=".proto"
                onChange={handleProtoUpload}
                style={{ display: 'none' }}
              />
              {protoContent && (
                <span className="text-sm text-emerald-500 flex items-center">
                  <FileCode className="w-4 h-4 mr-1" />
                  Loaded
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Service & Method Selection */}
        {parsedProto && parsedProto.services.length > 0 && (
          <div className="grpc-service-method">
            <div>
              <label className="text-sm font-medium mb-2">Service</label>
              <select
                value={service}
                onChange={(e) => {
                  setService(e.target.value);
                  const selectedService = parsedProto.services.find(s => s.name === e.target.value);
                  if (selectedService && selectedService.methods.length > 0) {
                    setMethod(selectedService.methods[0].name);
                  }
                  updateTabData({ service: e.target.value });
                }}
                className="grpc-select"
              >
                {parsedProto.services.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2">Method</label>
              <select
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value);
                  updateTabData({ method: e.target.value });
                }}
                className="grpc-select"
              >
                {parsedProto.services
                  .find(s => s.name === service)
                  ?.methods.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
              </select>
            </div>

            <Button
              onClick={sendGrpcRequest}
              disabled={loading}
              className="api-send-button mt-6"
              data-testid="grpc-send-button"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Calling...' : 'Invoke'}
            </Button>
          </div>
        )}

        {/* Request Tabs */}
        <Tabs defaultValue="request" className="api-tabs">
          <TabsList>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="proto">Proto</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="api-tab-content">
            <div className="api-body-editor">
              <label className="text-sm font-medium mb-2">Request Message (JSON)</label>
              <Editor
                height="300px"
                language="json"
                theme="vs-dark"
                value={requestData}
                onChange={(value) => {
                  setRequestData(value || '{}');
                  updateTabData({ requestData: value || '{}' });
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="api-tab-content">
            <div className="api-key-value-list">
              <div className="api-kv-header">
                <span>Key</span>
                <span>Value</span>
                <span className="w-12"></span>
              </div>
              {metadata.map((meta, idx) => (
                <div key={idx} className="api-kv-row">
                  <input
                    type="checkbox"
                    checked={meta.enabled}
                    onChange={(e) => updateMetadata(idx, 'enabled', e.target.checked)}
                    className="api-kv-checkbox"
                  />
                  <Input
                    value={meta.key}
                    onChange={(e) => updateMetadata(idx, 'key', e.target.value)}
                    placeholder="Metadata key"
                    size="sm"
                  />
                  <Input
                    value={meta.value}
                    onChange={(e) => updateMetadata(idx, 'value', e.target.value)}
                    placeholder="Value"
                    size="sm"
                  />
                  <button onClick={() => removeMetadata(idx)} className="api-kv-delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button onClick={addMetadata} variant="outline" size="sm">
                Add Metadata
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="proto" className="api-tab-content">
            <div className="api-body-editor">
              <Editor
                height="300px"
                language="protobuf"
                theme="vs-dark"
                value={protoContent}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Response Section */}
      {response && (
        <div className="api-response-section">
          <div className="api-response-header">
            <div className="api-response-status">
              <span className={`status-badge ${response.isError ? 'error' : 'success'}`}>
                {response.status}
              </span>
              <span className="response-time">{response.time}ms</span>
            </div>
            <Button onClick={copyResponse} variant="outline" size="sm">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <Tabs defaultValue="body" className="api-response-tabs">
            <TabsList>
              <TabsTrigger value="body">Response</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="body" className="api-response-body">
              <Editor
                height="300px"
                language="json"
                theme="vs-dark"
                value={JSON.stringify(response.data, null, 2)}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                }}
              />
            </TabsContent>

            <TabsContent value="metadata" className="api-response-headers">
              <div className="response-headers-list">
                {Object.entries(response.metadata || {}).map(([key, value]) => (
                  <div key={key} className="header-item">
                    <span className="header-key">{key}:</span>
                    <span className="header-value">{value}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
