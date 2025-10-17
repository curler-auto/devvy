import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Check, RefreshCw, Plus, Trash2, ArrowDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { faker } from '@faker-js/faker';

/**
 * Faker Tool
 * Generate random fake data using Faker.js library
 * Client-side implementation
 */
function FakerTool({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [generatedData, setGeneratedData] = useState(tab.data?.output || '');
  const [copied, setCopied] = useState(false);
  const [fields, setFields] = useState(tab.data?.fields || [
    { id: 1, name: 'fullName', type: 'person.fullName', count: 1 },
    { id: 2, name: 'email', type: 'internet.email', count: 1 },
    { id: 3, name: 'address', type: 'location.streetAddress', count: 1 },
  ]);
  const [format, setFormat] = useState(tab.data?.format || 'json');
  const [count, setCount] = useState(tab.data?.count || 10);
  const [seed, setSeed] = useState(tab.data?.seed || 123);

  // Update tab data when inputs change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            output: generatedData,
            fields,
            format,
            count,
            seed
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [generatedData, fields, format, count, seed]);

  // Available faker types grouped by category
  const fakerTypes = {
    'Person': [
      { label: 'Full Name', value: 'person.fullName' },
      { label: 'First Name', value: 'person.firstName' },
      { label: 'Last Name', value: 'person.lastName' },
      { label: 'Gender', value: 'person.gender' },
      { label: 'Job Title', value: 'person.jobTitle' },
      { label: 'Job Descriptor', value: 'person.jobDescriptor' },
      { label: 'Job Area', value: 'person.jobArea' },
    ],
    'Internet': [
      { label: 'Email', value: 'internet.email' },
      { label: 'User Name', value: 'internet.userName' },
      { label: 'Password', value: 'internet.password' },
      { label: 'Domain Name', value: 'internet.domainName' },
      { label: 'URL', value: 'internet.url' },
      { label: 'IP', value: 'internet.ip' },
      { label: 'IPv6', value: 'internet.ipv6' },
      { label: 'User Agent', value: 'internet.userAgent' },
    ],
    'Location': [
      { label: 'Street Address', value: 'location.streetAddress' },
      { label: 'City', value: 'location.city' },
      { label: 'State', value: 'location.state' },
      { label: 'Country', value: 'location.country' },
      { label: 'Zip Code', value: 'location.zipCode' },
      { label: 'Latitude', value: 'location.latitude' },
      { label: 'Longitude', value: 'location.longitude' },
      { label: 'Timezone', value: 'location.timezone' },
    ],
    'Date & Time': [
      { label: 'Past Date', value: 'date.past' },
      { label: 'Future Date', value: 'date.future' },
      { label: 'Recent Date', value: 'date.recent' },
      { label: 'Month', value: 'date.month' },
      { label: 'Weekday', value: 'date.weekday' },
    ],
    'Finance': [
      { label: 'Account Number', value: 'finance.accountNumber' },
      { label: 'Account Name', value: 'finance.accountName' },
      { label: 'Amount', value: 'finance.amount' },
      { label: 'Credit Card Number', value: 'finance.creditCardNumber' },
      { label: 'Credit Card CVV', value: 'finance.creditCardCVV' },
      { label: 'Bitcoin Address', value: 'finance.bitcoinAddress' },
      { label: 'Transaction Type', value: 'finance.transactionType' },
      { label: 'Currency Code', value: 'finance.currencyCode' },
    ],
    'Company': [
      { label: 'Company Name', value: 'company.name' },
      { label: 'Company Suffix', value: 'company.companySuffix' },
      { label: 'Catch Phrase', value: 'company.catchPhrase' },
      { label: 'BS', value: 'company.bs' },
    ],
    'Phone & Communication': [
      { label: 'Phone Number', value: 'phone.number' },
      { label: 'Phone Format', value: 'phone.phoneNumber' },
      { label: 'IMEI', value: 'phone.imei' },
    ],
    'Random': [
      { label: 'UUID', value: 'string.uuid' },
      { label: 'Boolean', value: 'datatype.boolean' },
      { label: 'Hex Color', value: 'color.rgb' },
      { label: 'RGB Color', value: 'internet.color' },
      { label: 'Lorem Paragraph', value: 'lorem.paragraph' },
      { label: 'Lorem Sentence', value: 'lorem.sentence' },
      { label: 'Lorem Word', value: 'lorem.word' },
    ],
  };

  // Add a new field
  const addField = () => {
    const newId = Math.max(0, ...fields.map(field => field.id)) + 1;
    setFields([...fields, { id: newId, name: `field_${newId}`, type: 'person.fullName', count: 1 }]);
  };

  // Remove a field
  const removeField = (id) => {
    if (fields.length <= 1) {
      toast.error('You must have at least one field');
      return;
    }
    setFields(fields.filter(field => field.id !== id));
  };

  // Update a field
  const updateField = (id, key, value) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, [key]: value } : field
    ));
  };

  // Generate data
  const generateData = () => {
    try {
      // Set faker seed for reproducible results
      faker.seed(seed);
      
      // Generate data based on fields and count
      const results = [];
      
      for (let i = 0; i < count; i++) {
        const item = {};
        
        fields.forEach(field => {
          const [namespace, method] = field.type.split('.');
          
          if (field.count > 1) {
            // Generate array of values
            item[field.name] = Array.from({ length: field.count }, () => {
              return generateFakerValue(namespace, method);
            });
          } else {
            // Generate single value
            item[field.name] = generateFakerValue(namespace, method);
          }
        });
        
        results.push(item);
      }
      
      // Format output based on selected format
      let output = '';
      
      switch (format) {
        case 'json':
          output = JSON.stringify(results, null, 2);
          break;
        case 'csv':
          output = convertToCSV(results);
          break;
        case 'sql':
          output = convertToSQL(results);
          break;
        default:
          output = JSON.stringify(results, null, 2);
      }
      
      setGeneratedData(output);
      toast.success(`Generated ${count} records successfully`);
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(`Generation error: ${err.message}`);
    }
  };

  // Generate a value using faker
  const generateFakerValue = (namespace, method) => {
    try {
      // Handle special cases
      if (namespace === 'date') {
        if (method === 'past') return faker.date.past().toISOString();
        if (method === 'future') return faker.date.future().toISOString();
        if (method === 'recent') return faker.date.recent().toISOString();
        if (method === 'month') return faker.date.month();
        if (method === 'weekday') return faker.date.weekday();
      }
      
      // Handle standard cases
      return faker[namespace][method]();
    } catch (err) {
      console.error(`Error generating ${namespace}.${method}:`, err);
      return `Error: ${err.message}`;
    }
  };

  // Convert data to CSV
  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const headerRow = headers.join(',');
    
    const rows = data.map(item => {
      return headers.map(header => {
        const value = item[header];
        
        // Handle arrays
        if (Array.isArray(value)) {
          return `"${value.join('; ')}"`;
        }
        
        // Handle strings with commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        
        return value;
      }).join(',');
    });
    
    return [headerRow, ...rows].join('\n');
  };

  // Convert data to SQL insert statements
  const convertToSQL = (data) => {
    if (data.length === 0) return '';
    
    const tableName = 'generated_data';
    const headers = Object.keys(data[0]);
    
    const createTable = `CREATE TABLE ${tableName} (\n` +
      headers.map(header => `  ${header} TEXT`).join(',\n') +
      '\n);\n\n';
    
    const insertStatements = data.map(item => {
      const values = headers.map(header => {
        const value = item[header];
        
        // Handle arrays
        if (Array.isArray(value)) {
          return `'${value.join('; ').replace(/'/g, "''")}'`;
        }
        
        // Handle strings
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        }
        
        // Handle null
        if (value === null) {
          return 'NULL';
        }
        
        return value;
      }).join(', ');
      
      return `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${values});`;
    }).join('\n');
    
    return createTable + insertStatements;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedData);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  const downloadData = () => {
    try {
      // Determine file extension based on format
      const fileExtension = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'sql';
      
      // Create blob and download link
      const blob = new Blob([generatedData], { type: `text/${fileExtension}` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Set attributes and trigger download
      link.href = url;
      link.download = `faker_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded data as ${fileExtension.toUpperCase()}`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download data');
    }
  };

  return (
    <div className="faker-tool" data-testid="faker-tool">
      <div className="flex flex-col h-full">
        {/* Configuration */}
        <div className="mb-4 p-4 border border-[var(--border-primary)] rounded-md bg-[var(--bg-tertiary)]">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h3 className="text-base font-medium">Data Generator Configuration</h3>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <label className="text-sm">Records:</label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="1000"
                  className="w-16 px-2 py-1 border rounded-md bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                />
              </div>
              
              <div className="flex items-center gap-1">
                <label className="text-sm">Seed:</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border rounded-md bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                />
              </div>
              
              <div className="flex items-center gap-1">
                <label className="text-sm">Format:</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="px-2 py-1 border rounded-md bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="sql">SQL</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Fields */}
          <div className="space-y-2 mb-4">
            {fields.map((field) => (
              <div 
                key={field.id} 
                className="flex items-center gap-2 p-2 border rounded-md border-[var(--border-primary)] bg-[var(--bg-secondary)]"
              >
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(field.id, 'name', e.target.value)}
                  placeholder="Field Name"
                  className="w-1/4 px-2 py-1 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                />
                
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, 'type', e.target.value)}
                  className="flex-1 px-2 py-1 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                >
                  {Object.entries(fakerTypes).map(([category, types]) => (
                    <optgroup key={category} label={category}>
                      {types.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                
                <div className="flex items-center gap-1">
                  <label className="text-xs">Count:</label>
                  <input
                    type="number"
                    value={field.count}
                    onChange={(e) => updateField(field.id, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max="100"
                    className="w-16 px-2 py-1 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                  />
                </div>
                
                <Button 
                  onClick={() => removeField(field.id)} 
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between">
            <Button 
              onClick={addField} 
              size="sm"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
            
            <Button 
              onClick={generateData} 
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Data
            </Button>
          </div>
        </div>
        
        {/* Generated Data */}
        <div className="flex-1">
          <div className="panel-header">
            <h3>Generated Data</h3>
            <div className="flex gap-2">
              <Button 
                onClick={copyToClipboard} 
                size="sm"
                variant="outline"
                disabled={!generatedData}
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-2" /> Copied</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copy</>
                )}
              </Button>
              
              <Button 
                onClick={downloadData} 
                size="sm"
                variant="outline"
                disabled={!generatedData}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage={format === 'json' ? 'json' : format === 'csv' ? 'plaintext' : 'sql'}
              theme={editorTheme}
              value={generatedData}
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
FakerTool.metadata = {
  id: 'faker-tool',
  name: 'Faker Data Generator',
  description: 'Generate random fake data using Faker.js library',
  category: 'generators',
  requiresBackend: false, // Client-side implementation
};

export default FakerTool;
