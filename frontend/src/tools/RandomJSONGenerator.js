import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, RefreshCw, Settings, Plus, Trash2, FileText, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { faker } from '@faker-js/faker';

/**
 * Random JSON Generator Tool
 * Generate random JSON data with customizable structure and schema builder
 * Uses Faker.js for realistic data generation
 */
function RandomJSONGenerator({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [generatedJSON, setGeneratedJSON] = useState(tab.data?.output || '');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState(tab.data?.activeTab || 'config');
  const [showResultsSidebar, setShowResultsSidebar] = useState(false);
  const [blinkResults, setBlinkResults] = useState(false);
  
  // Config-based generation settings
  const [config, setConfig] = useState(tab.data?.config || {
    count: 1,
    depth: 3,
    arrayLength: 5,
  });
  
  // Schema-based generation
  const [schema, setSchema] = useState(tab.data?.schema || [
    { id: 1, name: 'id', type: 'number', fakerMethod: 'number.int', arrayLength: 1, isArray: false, expanded: false }
  ]);
  const [nextFieldId, setNextFieldId] = useState(2);

  // Faker method categories
  const fakerCategories = {
    person: ['firstName', 'lastName', 'fullName', 'jobTitle', 'prefix', 'suffix', 'gender', 'bio'],
    internet: ['email', 'userName', 'password', 'url', 'domainName', 'ip', 'mac', 'userAgent'],
    company: ['name', 'catchPhrase', 'bs', 'buzzPhrase', 'buzzNoun', 'buzzVerb'],
    address: ['streetAddress', 'city', 'state', 'zipCode', 'country', 'countryCode', 'latitude', 'longitude'],
    phone: ['number', 'imei'],
    date: ['past', 'future', 'recent', 'soon', 'birthdate', 'month', 'weekday'],
    commerce: ['productName', 'price', 'department', 'product', 'productDescription'],
    finance: ['accountNumber', 'amount', 'transactionType', 'currencyCode', 'bitcoinAddress', 'creditCardNumber'],
    lorem: ['word', 'words', 'sentence', 'sentences', 'paragraph', 'paragraphs', 'text', 'slug'],
    number: ['int', 'float', 'bigInt'],
    string: ['uuid', 'alpha', 'alphanumeric', 'numeric'],
    datatype: ['boolean', 'json'],
    image: ['avatar', 'url', 'dataUri'],
  };

  // Update tab data
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            output: generatedJSON,
            config,
            schema,
            activeTab
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [generatedJSON, config, schema, activeTab]);

  // Generate JSON from schema
  const generateFromSchema = () => {
    try {
      const count = config.count || 1;
      const results = [];

      for (let i = 0; i < count; i++) {
        const obj = {};
        schema.forEach(field => {
          obj[field.name] = generateFieldValue(field);
        });
        results.push(obj);
      }

      const output = count === 1 ? results[0] : results;
      const formatted = JSON.stringify(output, null, 2);
      setGeneratedJSON(formatted);
      
      // Show results sidebar with animation
      setBlinkResults(true);
      setTimeout(() => {
        setBlinkResults(false);
        setShowResultsSidebar(true);
      }, 300);
      
      toast.success(`Generated ${count} record(s) successfully`);
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(`Generation error: ${err.message}`);
    }
  };

  // Generate value for a field based on its configuration
  const generateFieldValue = (field) => {
    try {
      if (field.isArray) {
        const arrayLength = field.arrayLength || config.arrayLength || 3;
        return Array.from({ length: arrayLength }, () => generateSingleValue(field));
      }
      return generateSingleValue(field);
    } catch (err) {
      console.error(`Error generating field ${field.name}:`, err);
      return null;
    }
  };

  // Generate a single value based on field type and faker method
  const generateSingleValue = (field) => {
    if (field.fakerMethod && field.fakerMethod !== 'none') {
      try {
        const [category, method] = field.fakerMethod.split('.');
        if (faker[category] && faker[category][method]) {
          return faker[category][method]();
        }
      } catch (err) {
        console.error(`Faker error for ${field.fakerMethod}:`, err);
      }
    }

    // Fallback to basic types
    switch (field.type) {
      case 'string':
        return faker.lorem.word();
      case 'number':
        return faker.number.int({ min: 1, max: 1000 });
      case 'boolean':
        return faker.datatype.boolean();
      case 'null':
        return null;
      case 'object':
        return {};
      case 'array':
        return [];
      default:
        return faker.lorem.word();
    }
  };

  // Add new field to schema
  const addField = () => {
    const newField = {
      id: nextFieldId,
      name: `field_${nextFieldId}`,
      type: 'string',
      fakerMethod: 'lorem.word',
      arrayLength: 3,
      isArray: false,
      expanded: false
    };
    setSchema([...schema, newField]);
    setNextFieldId(nextFieldId + 1);
  };

  // Remove field from schema
  const removeField = (id) => {
    setSchema(schema.filter(f => f.id !== id));
  };

  // Update field property
  const updateField = (id, property, value) => {
    setSchema(schema.map(f => 
      f.id === id ? { ...f, [property]: value } : f
    ));
  };

  // Toggle field expansion
  const toggleFieldExpansion = (id) => {
    setSchema(schema.map(f => 
      f.id === id ? { ...f, expanded: !f.expanded } : f
    ));
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedJSON);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="random-json-generator-tool h-full flex flex-col" data-testid="random-json-generator">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Random JSON Generator</h2>
        <div className="flex items-center gap-2">
          <Button 
            onClick={generateFromSchema} 
            size="sm"
            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Settings className="w-4 h-4 inline-block mr-2" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Code className="w-4 h-4 inline-block mr-2" />
            Schema Builder
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'config' && (
            <div className="max-w-2xl">
              <h3 className="text-base font-semibold mb-4 text-[var(--text-primary)]">Generation Settings</h3>
              
              <div className="space-y-4">
                {/* Number of Records */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
                    Number of Records: {config.count}
                  </label>
                  <input 
                    type="range"
                    min="1"
                    max="100"
                    value={config.count}
                    onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                    <span>1</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Max Depth */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
                    Max Nesting Depth: {config.depth}
                  </label>
                  <input 
                    type="range"
                    min="1"
                    max="10"
                    value={config.depth}
                    onChange={(e) => setConfig({ ...config, depth: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Array Length */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
                    Default Array Length: {config.arrayLength}
                  </label>
                  <input 
                    type="range"
                    min="1"
                    max="50"
                    value={config.arrayLength}
                    onChange={(e) => setConfig({ ...config, arrayLength: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                    <span>1</span>
                    <span>50</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-md">
                <p className="text-sm text-[var(--text-secondary)]">
                  💡 <strong>Tip:</strong> Use the Schema Builder tab to define your JSON structure with specific field names and Faker.js methods for realistic data.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Schema Fields</h3>
                <Button onClick={addField} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-2">
                {schema.map((field) => (
                  <div 
                    key={field.id} 
                    className="border border-[var(--border-primary)] rounded-md bg-[var(--bg-tertiary)]"
                  >
                    {/* Field Header */}
                    <div className="flex items-center gap-2 p-3">
                      <button
                        onClick={() => toggleFieldExpansion(field.id)}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {field.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(field.id, 'name', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                        placeholder="Field name"
                      />
                      
                      <select
                        value={field.type}
                        onChange={(e) => updateField(field.id, 'type', e.target.value)}
                        className="px-2 py-1 text-sm border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="null">Null</option>
                        <option value="object">Object</option>
                        <option value="array">Array</option>
                      </select>

                      <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={field.isArray}
                          onChange={(e) => updateField(field.id, 'isArray', e.target.checked)}
                        />
                        Array
                      </label>

                      <Button
                        onClick={() => removeField(field.id)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Expanded Field Options */}
                    {field.expanded && (
                      <div className="px-3 pb-3 space-y-3 border-t border-[var(--border-primary)] pt-3">
                        {/* Faker Method Selection */}
                        <div>
                          <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">
                            Faker Method
                          </label>
                          <select
                            value={field.fakerMethod}
                            onChange={(e) => updateField(field.id, 'fakerMethod', e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                          >
                            <option value="none">None (Basic Type)</option>
                            {Object.entries(fakerCategories).map(([category, methods]) => (
                              <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                                {methods.map(method => (
                                  <option key={`${category}.${method}`} value={`${category}.${method}`}>
                                    {category}.{method}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        {/* Array Length (if isArray) */}
                        {field.isArray && (
                          <div>
                            <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">
                              Array Length: {field.arrayLength}
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="20"
                              value={field.arrayLength}
                              onChange={(e) => updateField(field.id, 'arrayLength', parseInt(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {schema.length === 0 && (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No fields defined. Click "Add Field" to start building your schema.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Results Button */}
      {generatedJSON && (
        <div className="fixed bottom-6 right-6 z-30">
          <Button
            onClick={() => setShowResultsSidebar(!showResultsSidebar)}
            size="sm"
            className={`h-12 w-12 p-0 rounded-full shadow-lg ${blinkResults ? 'animate-pulse bg-[var(--accent-primary)] text-white' : ''} ${showResultsSidebar ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)]'}`}
            title="View generated JSON"
          >
            <FileText className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Overlay when sidebar is open */}
      {showResultsSidebar && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setShowResultsSidebar(false)}
        />
      )}

      {/* Results Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-[600px] bg-[var(--bg-primary)] border-l-2 border-[var(--border-primary)] shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
          showResultsSidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close Button */}
        {showResultsSidebar && (
          <Button
            onClick={() => setShowResultsSidebar(false)}
            size="sm"
            variant="ghost"
            className="absolute -left-10 top-4 h-10 w-10 p-0 rounded-l-md bg-[var(--bg-secondary)] border border-r-0 border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]"
            title="Close results"
          >
            <X className="w-5 h-5" />
          </Button>
        )}

        {/* Sidebar Content */}
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Generated JSON</h3>
            <Button onClick={copyToClipboard} size="sm" variant="outline">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* JSON Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={editorTheme}
              value={generatedJSON}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                readOnly: true,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
RandomJSONGenerator.metadata = {
  id: 'random-json-generator',
  name: 'Random JSON Generator',
  description: 'Generate random JSON data with schema builder and Faker.js integration',
  category: 'json',
  requiresBackend: false,
};

export default RandomJSONGenerator;
