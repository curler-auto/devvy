import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * JSON Schema Validator Tool
 * Validate JSON data against a JSON Schema
 * Client-side implementation using Ajv
 */
function JSONSchemaValidator({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [schema, setSchema] = useState(tab.data?.schema || '');
  const [jsonData, setJsonData] = useState(tab.data?.data || '');
  const [validationResult, setValidationResult] = useState(tab.data?.result || '');
  const [isSchemaValid, setIsSchemaValid] = useState(true);
  const [isDataValid, setIsDataValid] = useState(true);
  const [schemaError, setSchemaError] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            schema,
            data: jsonData,
            result: validationResult
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [schema, jsonData, validationResult]);

  // Format JSON
  const formatJSON = (type) => {
    try {
      if (type === 'schema') {
        if (!schema.trim()) {
          toast.error('Please enter JSON Schema first');
          return;
        }
        
        // Parse and stringify to format
        const parsed = JSON.parse(schema);
        const formatted = JSON.stringify(parsed, null, 2);
        
        setSchema(formatted);
        setIsSchemaValid(true);
        setSchemaError(null);
        
        toast.success('Schema formatted successfully');
      } else {
        if (!jsonData.trim()) {
          toast.error('Please enter JSON data first');
          return;
        }
        
        // Parse and stringify to format
        const parsed = JSON.parse(jsonData);
        const formatted = JSON.stringify(parsed, null, 2);
        
        setJsonData(formatted);
        setIsDataValid(true);
        setDataError(null);
        
        toast.success('JSON data formatted successfully');
      }
    } catch (err) {
      console.error('JSON formatting error:', err);
      
      if (type === 'schema') {
        setIsSchemaValid(false);
        setSchemaError(err.message);
        toast.error(`Invalid Schema: ${err.message}`);
      } else {
        setIsDataValid(false);
        setDataError(err.message);
        toast.error(`Invalid JSON data: ${err.message}`);
      }
    }
  };

  // Validate JSON against schema
  const validateJSON = () => {
    try {
      if (!schema.trim()) {
        toast.error('Please enter JSON Schema first');
        return;
      }
      
      if (!jsonData.trim()) {
        toast.error('Please enter JSON data first');
        return;
      }
      
      // Parse schema and data
      const parsedSchema = JSON.parse(schema);
      const parsedData = JSON.parse(jsonData);
      
      // Create Ajv instance
      const ajv = new Ajv({ allErrors: true, verbose: true });
      addFormats(ajv); // Add format validators
      
      // Compile schema
      const validate = ajv.compile(parsedSchema);
      
      // Validate data
      const valid = validate(parsedData);
      
      if (valid) {
        setValidationResult(JSON.stringify({
          valid: true,
          message: 'Validation successful! The JSON data is valid against the schema.'
        }, null, 2));
        toast.success('Validation successful!');
      } else {
        setValidationResult(JSON.stringify({
          valid: false,
          errors: validate.errors
        }, null, 2));
        toast.error('Validation failed. See errors for details.');
      }
      
      setIsSchemaValid(true);
      setIsDataValid(true);
      setSchemaError(null);
      setDataError(null);
    } catch (err) {
      console.error('Validation error:', err);
      setValidationResult(JSON.stringify({
        valid: false,
        error: err.message
      }, null, 2));
      
      toast.error(`Validation error: ${err.message}`);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(validationResult);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  // Load example schema and data
  const loadExample = () => {
    const exampleSchema = {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "age": { "type": "integer", "minimum": 0 },
        "email": { "type": "string", "format": "email" },
        "website": { "type": "string", "format": "uri" },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "address": {
          "type": "object",
          "properties": {
            "street": { "type": "string" },
            "city": { "type": "string" },
            "zipCode": { "type": "string", "pattern": "^\\d{5}(-\\d{4})?$" }
          },
          "required": ["street", "city"]
        }
      },
      "required": ["name", "email"]
    };
    
    const exampleData = {
      "name": "John Doe",
      "age": 30,
      "email": "john.doe@example.com",
      "website": "https://example.com",
      "tags": ["developer", "javascript", "react"],
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "zipCode": "12345"
      }
    };
    
    setSchema(JSON.stringify(exampleSchema, null, 2));
    setJsonData(JSON.stringify(exampleData, null, 2));
    setValidationResult('');
    setIsSchemaValid(true);
    setIsDataValid(true);
    setSchemaError(null);
    setDataError(null);
    
    toast.info('Example loaded');
  };

  return (
    <div className="json-schema-validator-tool" data-testid="json-schema-validator">
      <div className="flex flex-col h-full">
        <div className="flex justify-end mb-2">
          <Button 
            onClick={loadExample} 
            size="sm"
            variant="outline"
          >
            Load Example
          </Button>
        </div>
        
        {/* Input panels */}
        <div className="flex flex-1 gap-4 mb-4">
          {/* Schema */}
          <div className="flex-1 json-panel">
            <div className="panel-header">
              <h3>JSON Schema</h3>
              <Button 
                onClick={() => formatJSON('schema')} 
                size="sm"
              >
                <Code className="w-4 h-4 mr-2" />
                Format
              </Button>
            </div>
            <div className="editor-container">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme={editorTheme}
                value={schema}
                onChange={(value) => setSchema(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
              {!isSchemaValid && schemaError && (
                <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                  <AlertCircle className="w-3 h-3 inline-block mr-1" />
                  {schemaError}
                </div>
              )}
            </div>
          </div>

          {/* JSON Data */}
          <div className="flex-1 json-panel">
            <div className="panel-header">
              <h3>JSON Data</h3>
              <Button 
                onClick={() => formatJSON('data')} 
                size="sm"
              >
                <Code className="w-4 h-4 mr-2" />
                Format
              </Button>
            </div>
            <div className="editor-container">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme={editorTheme}
                value={jsonData}
                onChange={(value) => setJsonData(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
              {!isDataValid && dataError && (
                <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                  <AlertCircle className="w-3 h-3 inline-block mr-1" />
                  {dataError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Validate button */}
        <div className="flex justify-center mb-4">
          <Button 
            onClick={validateJSON} 
            size="sm"
            className="px-8"
          >
            <Play className="w-4 h-4 mr-2" />
            Validate
          </Button>
        </div>

        {/* Validation Result */}
        <div className="flex-1">
          <div className="panel-header">
            <h3>Validation Result</h3>
            <Button 
              onClick={copyToClipboard} 
              size="sm"
              variant="outline"
              disabled={!validationResult}
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
              defaultLanguage="json"
              theme={editorTheme}
              value={validationResult}
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
JSONSchemaValidator.metadata = {
  id: 'json-schema-validator',
  name: 'JSON Schema Validator',
  description: 'Validate JSON data against a JSON Schema',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default JSONSchemaValidator;
