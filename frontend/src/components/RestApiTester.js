import React, { useState } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Send, Trash2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export default function RestApiTester({ tab, tabs, setTabs }) {
  const [method, setMethod] = useState(tab.data.method || 'GET');
  const [url, setUrl] = useState(tab.data.url || '');
  const [headers, setHeaders] = useState(tab.data.headers || [{ key: '', value: '', enabled: true }]);
  const [params, setParams] = useState(tab.data.params || [{ key: '', value: '', enabled: true }]);
  const [authType, setAuthType] = useState(tab.data.authType || 'none');
  const [authData, setAuthData] = useState(tab.data.authData || { token: '', username: '', password: '', apiKey: '' });
  const [bodyType, setBodyType] = useState(tab.data.bodyType || 'json');
  const [bodyContent, setBodyContent] = useState(tab.data.bodyContent || '');
  const [response, setResponse] = useState(tab.data.response || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateTabData = (updates) => {
    const updatedTabs = tabs.map(t =>
      t.tabId === tab.tabId
        ? { ...t, data: { ...t.data, ...updates } }
        : t
    );
    setTabs(updatedTabs);
  };

  const addHeader = () => {
    const newHeaders = [...headers, { key: '', value: '', enabled: true }];
    setHeaders(newHeaders);
    updateTabData({ headers: newHeaders });
  };

  const updateHeader = (index, field, value) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
    updateTabData({ headers: newHeaders });
  };

  const removeHeader = (index) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    setHeaders(newHeaders);
    updateTabData({ headers: newHeaders });
  };

  const addParam = () => {
    const newParams = [...params, { key: '', value: '', enabled: true }];
    setParams(newParams);
    updateTabData({ params: newParams });
  };

  const updateParam = (index, field, value) => {
    const newParams = [...params];
    newParams[index][field] = value;
    setParams(newParams);
    updateTabData({ params: newParams });
  };

  const removeParam = (index) => {
    const newParams = params.filter((_, i) => i !== index);
    setParams(newParams);
    updateTabData({ params: newParams });
  };

  const buildUrl = () => {
    let finalUrl = url;
    const enabledParams = params.filter(p => p.enabled && p.key);
    
    if (enabledParams.length > 0) {
      const queryString = enabledParams
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      finalUrl += (url.includes('?') ? '&' : '?') + queryString;
    }
    
    return finalUrl;
  };

  const buildHeaders = () => {
    const reqHeaders = {};
    
    headers.filter(h => h.enabled && h.key).forEach(h => {
      reqHeaders[h.key] = h.value;
    });

    if (authType === 'bearer' && authData.token) {
      reqHeaders['Authorization'] = `Bearer ${authData.token}`;
    } else if (authType === 'basic' && authData.username) {
      const encoded = btoa(`${authData.username}:${authData.password}`);
      reqHeaders['Authorization'] = `Basic ${encoded}`;
    } else if (authType === 'apikey' && authData.apiKey) {
      reqHeaders['X-API-Key'] = authData.apiKey;
    }

    if (bodyType === 'json' && ['POST', 'PUT', 'PATCH'].includes(method)) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    return reqHeaders;
  };

  const sendRequest = async () => {
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const finalUrl = buildUrl();
      const reqHeaders = buildHeaders();
      
      const config = {
        method: method.toLowerCase(),
        url: finalUrl,
        headers: reqHeaders
      };

      if (['post', 'put', 'patch'].includes(method.toLowerCase()) && bodyContent) {
        if (bodyType === 'json') {
          try {
            config.data = JSON.parse(bodyContent);
          } catch (e) {
            toast.error('Invalid JSON in body');
            setLoading(false);
            return;
          }
        } else {
          config.data = bodyContent;
        }
      }

      const res = await axios(config);
      const endTime = Date.now();

      const responseData = {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        data: res.data,
        time: endTime - startTime,
        size: JSON.stringify(res.data).length
      };

      setResponse(responseData);
      updateTabData({
        method, url, headers, params, authType, authData, bodyType, bodyContent,
        response: responseData
      });
      toast.success(`Response: ${res.status} ${res.statusText}`);
    } catch (error) {
      const endTime = Date.now();
      const errorResponse = {
        status: error.response?.status || 0,
        statusText: error.response?.statusText || 'Error',
        headers: error.response?.headers || {},
        data: error.response?.data || { error: error.message },
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
    <div className="api-tester-container" data-testid="rest-api-tester">
      {/* Request Section */}
      <div className="api-request-section">
        {/* URL Bar */}
        <div className="api-url-bar">
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              updateTabData({ method: e.target.value });
            }}
            className="api-method-select"
            data-testid="method-select"
          >
            {HTTP_METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              updateTabData({ url: e.target.value });
            }}
            placeholder="https://api.example.com/endpoint"
            className="api-url-input"
            data-testid="url-input"
          />
          
          <Button
            onClick={sendRequest}
            disabled={loading}
            className="api-send-button"
            data-testid="send-button"
          >
            <Send className="w-4 h-4 mr-2" aria-hidden="true" />
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </div>

        {/* Request Tabs */}
        <Tabs defaultValue="params" className="api-tabs">
          <TabsList>
            <TabsTrigger value="params">Params</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="auth">Authorization</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
          </TabsList>

          <TabsContent value="params" className="api-tab-content">
            <div className="api-key-value-list">
              <div className="api-kv-header">
                <span>Key</span>
                <span>Value</span>
                <span className="w-12"></span>
              </div>
              {params.map((param, idx) => (
                <div key={idx} className="api-kv-row">
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={(e) => updateParam(idx, 'enabled', e.target.checked)}
                    className="api-kv-checkbox"
                    aria-label="Enable parameter"
                  />
                  <Input
                    value={param.key}
                    onChange={(e) => updateParam(idx, 'key', e.target.value)}
                    placeholder="Parameter name"
                    size="sm"
                  />
                  <Input
                    value={param.value}
                    onChange={(e) => updateParam(idx, 'value', e.target.value)}
                    placeholder="Value"
                    size="sm"
                  />
                  <button onClick={() => removeParam(idx)} className="api-kv-delete" aria-label="Remove parameter">
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <Button onClick={addParam} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Add Parameter
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="headers" className="api-tab-content">
            <div className="api-key-value-list">
              <div className="api-kv-header">
                <span>Key</span>
                <span>Value</span>
                <span className="w-12"></span>
              </div>
              {headers.map((header, idx) => (
                <div key={idx} className="api-kv-row">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => updateHeader(idx, 'enabled', e.target.checked)}
                    className="api-kv-checkbox"
                    aria-label="Enable header"
                  />
                  <Input
                    value={header.key}
                    onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                    placeholder="Header name"
                    size="sm"
                  />
                  <Input
                    value={header.value}
                    onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                    placeholder="Value"
                    size="sm"
                  />
                  <button onClick={() => removeHeader(idx)} className="api-kv-delete" aria-label="Remove header">
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <Button onClick={addHeader} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Add Header
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="auth" className="api-tab-content">
            <div className="api-auth-section">
              <select
                value={authType}
                onChange={(e) => {
                  setAuthType(e.target.value);
                  updateTabData({ authType: e.target.value });
                }}
                className="api-auth-type-select"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
              </select>

              {authType === 'bearer' && (
                <div className="api-auth-form">
                  <label>Token</label>
                  <Input
                    value={authData.token}
                    onChange={(e) => {
                      const newAuthData = { ...authData, token: e.target.value };
                      setAuthData(newAuthData);
                      updateTabData({ authData: newAuthData });
                    }}
                    placeholder="Enter bearer token"
                    type="password"
                  />
                </div>
              )}

              {authType === 'basic' && (
                <div className="api-auth-form">
                  <label>Username</label>
                  <Input
                    value={authData.username}
                    onChange={(e) => {
                      const newAuthData = { ...authData, username: e.target.value };
                      setAuthData(newAuthData);
                      updateTabData({ authData: newAuthData });
                    }}
                    placeholder="Username"
                  />
                  <label>Password</label>
                  <Input
                    value={authData.password}
                    onChange={(e) => {
                      const newAuthData = { ...authData, password: e.target.value };
                      setAuthData(newAuthData);
                      updateTabData({ authData: newAuthData });
                    }}
                    placeholder="Password"
                    type="password"
                  />
                </div>
              )}

              {authType === 'apikey' && (
                <div className="api-auth-form">
                  <label>API Key</label>
                  <Input
                    value={authData.apiKey}
                    onChange={(e) => {
                      const newAuthData = { ...authData, apiKey: e.target.value };
                      setAuthData(newAuthData);
                      updateTabData({ authData: newAuthData });
                    }}
                    placeholder="Enter API key"
                    type="password"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="body" className="api-tab-content">
            <div className="api-body-section">
              <select
                value={bodyType}
                onChange={(e) => {
                  setBodyType(e.target.value);
                  updateTabData({ bodyType: e.target.value });
                }}
                className="api-body-type-select"
              >
                <option value="json">JSON</option>
                <option value="text">Raw Text</option>
                <option value="xml">XML</option>
              </select>

              <div className="api-body-editor">
                <Editor
                  height="250px"
                  language={bodyType === 'json' ? 'json' : bodyType === 'xml' ? 'xml' : 'text'}
                  theme="vs-dark"
                  value={bodyContent}
                  onChange={(value) => {
                    setBodyContent(value || '');
                    updateTabData({ bodyContent: value || '' });
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
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
                {response.status} {response.statusText}
              </span>
              <span className="response-time">{response.time}ms</span>
              {response.size && <span className="response-size">{(response.size / 1024).toFixed(2)} KB</span>}
            </div>
            <Button onClick={copyResponse} variant="outline" size="sm" aria-label="Copy response">
              {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            </Button>
          </div>

          <Tabs defaultValue="body" className="api-response-tabs">
            <TabsList>
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
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

            <TabsContent value="headers" className="api-response-headers">
              <div className="response-headers-list">
                {Object.entries(response.headers || {}).map(([key, value]) => (
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
