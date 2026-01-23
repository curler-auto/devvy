import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Check, RefreshCw, Plus, Trash2, FileText, X, Download, Upload, ChevronDown, ChevronUp, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { faker } from '@faker-js/faker';
import jsYaml from 'js-yaml';
import xmlFormatter from 'xml-formatter';
import TOML from 'toml';

/**
 * Data Generator Tool
 * Unified tool for generating data in multiple formats (Basic, JSON, CSV, XML, YAML, TOML, SQL)
 * Uses Faker.js for realistic data generation
 */
function DataGenerator({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [generatedData, setGeneratedData] = useState(tab.data?.output || '');
  const [copied, setCopied] = useState(false);
  const [activeFormat, setActiveFormat] = useState(tab.data?.activeFormat || 'basic');
  const [showResultsSidebar, setShowResultsSidebar] = useState(false);
  const [blinkResults, setBlinkResults] = useState(false);
  
  // Common config
  const [count, setCount] = useState(tab.data?.count || 10);
  const [seed, setSeed] = useState(tab.data?.seed || 123);
  
  const [basicFields, setBasicFields] = useState(tab.data?.basicFields || [
    { id: 1, name: 'fullName', template: '{{person.fullName}}' },
    { id: 2, name: 'email', template: '{{internet.email}}' },
  ]);
  
  // JSON/CSV/XML/YAML/TOML  // Schema-based generation
  const [schema, setSchema] = useState(tab.data?.schema || [
    { id: 1, name: 'id', type: 'number', fakerMethod: 'number.int', isArray: false, arrayLength: 1 },
    { id: 2, name: 'name', type: 'string', fakerMethod: 'person.fullName', isArray: false, arrayLength: 1 },
  ]);
  const [nextFieldId, setNextFieldId] = useState(3);
  
  // Schema import - isolated per format
  const [schemaInputs, setSchemaInputs] = useState(tab.data?.schemaInputs || {
    json: '',
    csv: '',
    xml: '',
    yaml: '',
    toml: '',
    sql: ''
  });
  const [showSchemaImport, setShowSchemaImport] = useState(false);

  // Update tab data
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            output: generatedData,
            activeFormat,
            count,
            seed,
            basicFields,
            schema,
            schemaInputs
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [generatedData, activeFormat, count, seed, basicFields, schema, schemaInputs]);

  // Generate data based on active format
  const generateData = () => {
    try {
      faker.seed(seed);
      let output = '';

      switch (activeFormat) {
        case 'basic':
          output = generateBasicFormat();
          break;
        case 'json':
          output = generateJSONFormat();
          break;
        case 'csv':
          output = generateCSVFormat();
          break;
        case 'xml':
          output = generateXMLFormat();
          break;
        case 'yaml':
          output = generateYAMLFormat();
          break;
        case 'toml':
          output = generateTOMLFormat();
          break;
        case 'sql':
          output = generateSQLFormat();
          break;
        default:
          output = generateJSONFormat();
      }

      setGeneratedData(output);
      
      // Show results sidebar with animation
      setBlinkResults(true);
      setTimeout(() => {
        setBlinkResults(false);
        setShowResultsSidebar(true);
      }, 300);
      
      toast.success(`Generated ${count} record(s) in ${activeFormat.toUpperCase()} format`);
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(`Generation error: ${err.message}`);
    }
  };

  // Generate Basic format (field by field with {{}} syntax)
  const generateBasicFormat = () => {
    const results = [];
    for (let i = 0; i < count; i++) {
      const record = {};
      basicFields.forEach(field => {
        record[field.name] = parseFakerTemplate(field.template);
      });
      results.push(record);
    }
    
    // Format as section by section
    let output = '';
    basicFields.forEach(field => {
      output += `${field.name}:\n`;
      results.forEach((record, idx) => {
        output += `  ${idx + 1}. ${record[field.name]}\n`;
      });
      output += '\n';
    });
    return output;
  };

  // Parse {{faker.method}} template
  const parseFakerTemplate = (template) => {
    const match = template.match(/\{\{(.+?)\}\}/);
    if (match) {
      const [category, method] = match[1].split('.');
      return generateFakerValue(category, method);
    }
    return template;
  };

  // Generate JSON format
  const generateJSONFormat = () => {
    const results = [];
    for (let i = 0; i < count; i++) {
      const obj = {};
      schema.forEach(field => {
        obj[field.name] = generateFieldValue(field);
      });
      results.push(obj);
    }
    return JSON.stringify(count === 1 ? results[0] : results, null, 2);
  };

  // Generate CSV format
  const generateCSVFormat = () => {
    const results = [];
    for (let i = 0; i < count; i++) {
      const obj = {};
      schema.forEach(field => {
        obj[field.name] = generateFieldValue(field);
      });
      results.push(obj);
    }
    
    if (results.length === 0) return '';
    const headers = Object.keys(results[0]);
    const headerRow = headers.join(',');
    const rows = results.map(item => {
      return headers.map(header => {
        const value = item[header];
        if (Array.isArray(value)) return `"${value.join('; ')}"`;
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });
    return [headerRow, ...rows].join('\n');
  };

  // Generate XML format
  const generateXMLFormat = () => {
    const results = [];
    for (let i = 0; i < count; i++) {
      const obj = {};
      schema.forEach(field => {
        obj[field.name] = generateFieldValue(field);
      });
      results.push(obj);
    }
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';
    results.forEach(record => {
      xml += '  <record>\n';
      Object.entries(record).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          xml += `    <${key}>\n`;
          value.forEach(item => {
            xml += `      <item>${escapeXML(String(item))}</item>\n`;
          });
          xml += `    </${key}>\n`;
        } else {
          xml += `    <${key}>${escapeXML(String(value))}</${key}>\n`;
        }
      });
      xml += '  </record>\n';
    });
    xml += '</records>';
    
    try {
      return xmlFormatter(xml, { indentation: '  ' });
    } catch {
      return xml;
    }
  };

  const escapeXML = (str) => {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
  };

  // Generate YAML format
  const generateYAMLFormat = () => {
    const results = [];
    for (let i = 0; i < count; i++) {
      const obj = {};
      schema.forEach(field => {
        obj[field.name] = generateFieldValue(field);
      });
      results.push(obj);
    }
    return jsYaml.dump(count === 1 ? results[0] : results, { indent: 2 });
  };

  // Generate TOML format
  const generateTOMLFormat = () => {
    const results = [];
    for (let i = 0; i < count; i++) {
      const obj = {};
      schema.forEach(field => {
        obj[field.name] = generateFieldValue(field);
      });
      results.push(obj);
    }
    
    let toml = '';
    results.forEach((record, idx) => {
      toml += `[[records]]\n`;
      Object.entries(record).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          toml += `${key} = [${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]\n`;
        } else if (typeof value === 'string') {
          toml += `${key} = "${value}"\n`;
        } else {
          toml += `${key} = ${value}\n`;
        }
      });
      toml += '\n';
    });
    return toml;
  };

  // Generate SQL format
  const generateSQLFormat = () => {
    const results = [];
    for (let i = 0; i < count; i++) {
      const obj = {};
      schema.forEach(field => {
        obj[field.name] = generateFieldValue(field);
      });
      results.push(obj);
    }
    
    if (results.length === 0) return '';
    const tableName = 'generated_data';
    const headers = Object.keys(results[0]);
    
    const createTable = `CREATE TABLE ${tableName} (\n` +
      headers.map(header => `  ${header} TEXT`).join(',\n') +
      '\n);\n\n';
    
    const insertStatements = results.map(item => {
      const values = headers.map(header => {
        const value = item[header];
        if (Array.isArray(value)) return `'${value.join('; ').replace(/'/g, "''")}'`;
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (value === null) return 'NULL';
        return value;
      }).join(', ');
      return `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${values});`;
    }).join('\n');
    
    return createTable + insertStatements;
  };

  // Generate field value based on configuration
  const generateFieldValue = (field) => {
    try {
      if (field.isArray) {
        const arrayLength = field.arrayLength || 3;
        return Array.from({ length: arrayLength }, () => generateSingleValue(field));
      }
      return generateSingleValue(field);
    } catch (err) {
      return null;
    }
  };

  // Generate single value
  const generateSingleValue = (field) => {
    if (field.fakerMethod && field.fakerMethod !== 'none') {
      const [category, method] = field.fakerMethod.split('.');
      return generateFakerValue(category, method);
    }
    
    switch (field.type) {
      case 'string': return faker.lorem.word();
      case 'number': return faker.number.int({ min: 1, max: 1000 });
      case 'boolean': return faker.datatype.boolean();
      case 'null': return null;
      default: return faker.lorem.word();
    }
  };

  // Generate faker value
  const generateFakerValue = (category, method) => {
    try {
      if (category === 'date') {
        if (method === 'past') return faker.date.past().toISOString();
        if (method === 'future') return faker.date.future().toISOString();
        if (method === 'recent') return faker.date.recent().toISOString();
      }
      return faker[category][method]();
    } catch (err) {
      return `Error: ${err.message}`;
    }
  };

  // Basic format field management
  const addBasicField = () => {
    setBasicFields([...basicFields, { 
      id: nextFieldId, 
      name: `field_${nextFieldId}`, 
      template: '{{person.fullName}}' 
    }]);
    setNextFieldId(nextFieldId + 1);
  };

  const removeBasicField = (id) => {
    setBasicFields(basicFields.filter(f => f.id !== id));
  };

  const updateBasicField = (id, key, value) => {
    setBasicFields(basicFields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  // Schema field management
  const addSchemaField = () => {
    setSchema([...schema, {
      id: nextFieldId,
      name: `field_${nextFieldId}`,
      type: 'string',
      fakerMethod: 'lorem.word',
      isArray: false,
      arrayLength: 1
    }]);
    setNextFieldId(nextFieldId + 1);
  };

  const removeSchemaField = (id) => {
    setSchema(schema.filter(f => f.id !== id));
  };

  const updateSchemaField = (id, key, value) => {
    setSchema(schema.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedData);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  // Download data
  const downloadData = () => {
    try {
      const extensions = { basic: 'txt', json: 'json', csv: 'csv', xml: 'xml', yaml: 'yaml', toml: 'toml', sql: 'sql' };
      const ext = extensions[activeFormat] || 'txt';
      const blob = new Blob([generatedData], { type: `text/${ext}` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${ext.toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to download');
    }
  };

  // Parse schema from input
  const parseSchemaFromInput = () => {
    const currentInput = schemaInputs[activeFormat];
    if (!currentInput || !currentInput.trim()) {
      toast.error('Please enter sample data to parse');
      return;
    }

    try {
      let parsedFields = [];
      
      switch (activeFormat) {
        case 'json':
          parsedFields = parseJSONSchema(currentInput);
          break;
        case 'csv':
          parsedFields = parseCSVSchema(currentInput);
          break;
        case 'xml':
          parsedFields = parseXMLSchema(currentInput);
          break;
        case 'yaml':
          parsedFields = parseYAMLSchema(currentInput);
          break;
        case 'toml':
          parsedFields = parseTOMLSchema(currentInput);
          break;
        case 'sql':
          parsedFields = parseSQLSchema(currentInput);
          break;
        default:
          toast.error('Schema import not supported for this format');
          return;
      }

      if (parsedFields.length > 0) {
        setSchema(parsedFields);
        setNextFieldId(Math.max(...parsedFields.map(f => f.id)) + 1);
        toast.success(`Imported ${parsedFields.length} fields from schema`);
        setShowSchemaImport(false);
      } else {
        toast.error('No fields found in schema');
      }
    } catch (err) {
      console.error('Schema parse error:', err);
      toast.error(`Failed to parse schema: ${err.message}`);
    }
  };

  // Parse JSON schema
  const parseJSONSchema = (jsonStr) => {
    const parsed = JSON.parse(jsonStr);
    const fields = [];
    let id = 1;

    const extractFields = (obj, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        const isArray = Array.isArray(value);
        const actualValue = isArray ? value[0] : value;
        
        if (actualValue && typeof actualValue === 'object' && !Array.isArray(actualValue)) {
          // Nested object - flatten it
          extractFields(actualValue, fieldName);
        } else {
          const type = inferType(actualValue);
          const fakerMethod = suggestFakerMethod(key, type);
          fields.push({
            id: id++,
            name: fieldName,
            type,
            fakerMethod,
            isArray,
            arrayLength: isArray ? Math.min(value.length, 5) : 1
          });
        }
      });
    };

    if (Array.isArray(parsed)) {
      extractFields(parsed[0] || {});
    } else {
      extractFields(parsed);
    }

    return fields;
  };

  // Parse CSV schema
  const parseCSVSchema = (csvStr) => {
    const lines = csvStr.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const firstDataRow = lines.length > 1 ? lines[1].split(',').map(v => v.trim().replace(/"/g, '')) : [];
    
    return headers.map((header, idx) => {
      const sampleValue = firstDataRow[idx];
      const type = inferType(sampleValue);
      const fakerMethod = suggestFakerMethod(header, type);
      
      return {
        id: idx + 1,
        name: header,
        type,
        fakerMethod,
        isArray: false,
        arrayLength: 1
      };
    });
  };

  // Parse XML schema
  const parseXMLSchema = (xmlStr) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
    const fields = [];
    let id = 1;

    const extractFromNode = (node, prefix = '') => {
      if (node.nodeType === 1) { // Element node
        const tagName = node.tagName;
        const fieldName = prefix ? `${prefix}.${tagName}` : tagName;
        
        if (node.children.length === 0) {
          const value = node.textContent;
          const type = inferType(value);
          const fakerMethod = suggestFakerMethod(tagName, type);
          
          fields.push({
            id: id++,
            name: fieldName,
            type,
            fakerMethod,
            isArray: false,
            arrayLength: 1
          });
        } else {
          Array.from(node.children).forEach(child => extractFromNode(child, fieldName));
        }
      }
    };

    extractFromNode(xmlDoc.documentElement);
    return fields;
  };

  // Parse YAML schema
  const parseYAMLSchema = (yamlStr) => {
    const parsed = jsYaml.load(yamlStr);
    return parseJSONSchema(JSON.stringify(parsed));
  };

  // Parse TOML schema
  const parseTOMLSchema = (tomlStr) => {
    const parsed = TOML.parse(tomlStr);
    return parseJSONSchema(JSON.stringify(parsed));
  };

  // Parse SQL DDL
  const parseSQLSchema = (sqlStr) => {
    const fields = [];
    
    // Find the CREATE TABLE statement and extract content between parentheses
    const tableStart = sqlStr.search(/CREATE\s+TABLE/i);
    if (tableStart === -1) {
      throw new Error('No CREATE TABLE statement found');
    }
    
    // Find the opening parenthesis
    const openParen = sqlStr.indexOf('(', tableStart);
    if (openParen === -1) {
      throw new Error('Invalid CREATE TABLE syntax');
    }
    
    // Find the matching closing parenthesis
    let parenDepth = 0;
    let closeParen = -1;
    for (let i = openParen; i < sqlStr.length; i++) {
      if (sqlStr[i] === '(') parenDepth++;
      else if (sqlStr[i] === ')') {
        parenDepth--;
        if (parenDepth === 0) {
          closeParen = i;
          break;
        }
      }
    }
    
    if (closeParen === -1) {
      throw new Error('Unmatched parentheses in CREATE TABLE');
    }
    
    const tableContent = sqlStr.substring(openParen + 1, closeParen);
    
    // Smart split: split by comma but not within parentheses
    const columnDefs = [];
    let current = '';
    parenDepth = 0;
    
    for (let char of tableContent) {
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;
      
      if (char === ',' && parenDepth === 0) {
        if (current.trim()) columnDefs.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) columnDefs.push(current.trim());
    
    columnDefs.forEach((colDef) => {
      const trimmed = colDef.trim();
      
      // Skip empty lines
      if (!trimmed) return;
      
      // Skip constraint definitions (PRIMARY KEY, FOREIGN KEY, etc.)
      if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\s+KEY/i.test(trimmed)) {
        return;
      }
      
      const parts = trimmed.split(/\s+/);
      const columnName = parts[0].replace(/[`"'\[\]]/g, '');
      
      // Skip if it's a constraint keyword
      if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)$/i.test(columnName)) {
        return;
      }
      
      const sqlType = parts[1]?.toUpperCase() || 'VARCHAR';
      
      const type = mapSQLTypeToJSType(sqlType);
      const fakerMethod = suggestFakerMethod(columnName, type);
      
      fields.push({
        id: fields.length + 1,
        name: columnName,
        type,
        fakerMethod,
        isArray: false,
        arrayLength: 1
      });
    });

    return fields;
  };

  // Infer JavaScript type from value
  const inferType = (value) => {
    if (value === null || value === undefined || value === '') return 'string';
    if (!isNaN(value) && value !== '') return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    return 'string';
  };

  // Map SQL type to JavaScript type
  const mapSQLTypeToJSType = (sqlType) => {
    if (sqlType.includes('INT') || sqlType.includes('DECIMAL') || sqlType.includes('FLOAT') || sqlType.includes('DOUBLE')) {
      return 'number';
    }
    if (sqlType.includes('BOOL')) {
      return 'boolean';
    }
    return 'string';
  };

  // Suggest Faker method based on field name and type
  const suggestFakerMethod = (fieldName, type) => {
    const name = fieldName.toLowerCase();
    
    // Email patterns
    if (name.includes('email')) return 'internet.email';
    
    // Name patterns
    if (name.includes('firstname') || name === 'fname') return 'person.firstName';
    if (name.includes('lastname') || name === 'lname') return 'person.lastName';
    if (name.includes('fullname') || name === 'name') return 'person.fullName';
    
    // Address patterns
    if (name.includes('address') || name.includes('street')) return 'location.streetAddress';
    if (name.includes('city')) return 'location.city';
    if (name.includes('state')) return 'location.state';
    if (name.includes('country')) return 'location.country';
    if (name.includes('zip') || name.includes('postal')) return 'location.zipCode';
    
    // Contact patterns
    if (name.includes('phone') || name.includes('mobile')) return 'phone.number';
    if (name.includes('url') || name.includes('website')) return 'internet.url';
    
    // Company patterns
    if (name.includes('company')) return 'company.name';
    
    // ID patterns
    if (name.includes('id') || name.includes('uuid')) return 'string.uuid';
    
    // Date patterns
    if (name.includes('date') || name.includes('created') || name.includes('updated')) return 'date.past';
    
    // Price/Amount patterns
    if (name.includes('price') || name.includes('amount') || name.includes('cost')) return 'commerce.price';
    
    // Description patterns
    if (name.includes('description') || name.includes('bio')) return 'lorem.paragraph';
    
    // Default based on type
    if (type === 'number') return 'number.int';
    if (type === 'boolean') return 'datatype.boolean';
    return 'lorem.word';
  };

  // Faker categories for dropdowns
  const fakerCategories = {
    person: ['firstName', 'lastName', 'fullName', 'jobTitle', 'gender'],
    internet: ['email', 'userName', 'password', 'url', 'domainName', 'ip'],
    company: ['name', 'catchPhrase', 'bs'],
    location: ['city', 'state', 'country', 'zipCode', 'streetAddress'],
    phone: ['number'],
    date: ['past', 'future', 'recent', 'month', 'weekday'],
    finance: ['accountNumber', 'amount', 'creditCardNumber', 'bitcoinAddress'],
    commerce: ['productName', 'price', 'department'],
    lorem: ['word', 'words', 'sentence', 'paragraph'],
    number: ['int', 'float'],
    string: ['uuid', 'alpha', 'alphanumeric'],
    datatype: ['boolean'],
  };

  return (
    <div className="data-generator-tool h-full flex flex-col" data-testid="data-generator">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data Generator</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <label className="text-sm text-[var(--text-secondary)]">Records:</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="1000"
              className="w-20 px-2 py-1 text-sm border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            />
          </div>
          <Button onClick={generateData} size="sm" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate
          </Button>
        </div>
      </div>

      {/* Format Tabs */}
      <div className="flex border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-x-auto">
        {['basic', 'json', 'csv', 'xml', 'yaml', 'toml', 'sql'].map(format => (
          <button
            key={format}
            onClick={() => setActiveFormat(format)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeFormat === format
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {format.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeFormat === 'basic' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Basic Fields ({'{{'} {'}}'}  Syntax)</h3>
              <Button onClick={addBasicField} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </div>
            <div className="space-y-2">
              {basicFields.map(field => (
                <div key={field.id} className="flex items-center gap-2 p-3 border rounded-md border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateBasicField(field.id, 'name', e.target.value)}
                    placeholder="Field name"
                    className="w-1/3 px-2 py-1 text-sm border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                  />
                  <input
                    type="text"
                    value={field.template}
                    onChange={(e) => updateBasicField(field.id, 'template', e.target.value)}
                    placeholder="{{person.fullName}}"
                    className="flex-1 px-2 py-1 text-sm border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono"
                  />
                  <Button onClick={() => removeBasicField(field.id)} size="sm" variant="ghost" className="text-red-500 h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md text-sm text-[var(--text-secondary)]">
              💡 Use {'{{'} category.method {'}}'}  syntax. Example: {'{{'} person.fullName {'}}'},  {'{{'} internet.email {'}}'},  {'{{'} number.int {'}}'}
            </div>
          </div>
        )}

        {['json', 'csv', 'xml', 'yaml', 'toml', 'sql'].includes(activeFormat) && (
          <div className="max-w-4xl">
            {/* Schema Import Section */}
            <div className="mb-6 border border-[var(--border-primary)] rounded-md bg-[var(--bg-tertiary)]">
              <button
                onClick={() => setShowSchemaImport(!showSchemaImport)}
                className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Import Schema from Sample Data
                  </span>
                </div>
                {showSchemaImport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showSchemaImport && (
                <div className="p-4 border-t border-[var(--border-primary)]">
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Paste sample {activeFormat.toUpperCase()} data below. Fields will be automatically extracted with smart Faker method suggestions.
                  </p>
                  
                  <div className="mb-3">
                    <Editor
                      height="200px"
                      language={activeFormat === 'sql' ? 'sql' : activeFormat === 'xml' ? 'xml' : activeFormat === 'yaml' ? 'yaml' : activeFormat === 'toml' ? 'ini' : activeFormat === 'csv' ? 'plaintext' : 'json'}
                      theme={editorTheme}
                      value={schemaInputs[activeFormat]}
                      onChange={(value) => setSchemaInputs({ ...schemaInputs, [activeFormat]: value || '' })}
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
                  
                  <div className="flex gap-2">
                    <Button onClick={parseSchemaFromInput} size="sm" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white">
                      <Upload className="w-4 h-4 mr-2" />
                      Parse & Import Schema
                    </Button>
                    <Button onClick={() => setSchemaInputs({ ...schemaInputs, [activeFormat]: '' })} size="sm" variant="outline">
                      Clear
                    </Button>
                  </div>
                  
                  <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-[var(--text-secondary)]">
                    <strong>Examples:</strong>
                    {activeFormat === 'json' && ' {"name": "John", "email": "john@example.com", "age": 30}'}
                    {activeFormat === 'csv' && ' name,email,age\\nJohn,john@example.com,30'}
                    {activeFormat === 'xml' && ' <user><name>John</name><email>john@example.com</email></user>'}
                    {activeFormat === 'yaml' && ' name: John\\nemail: john@example.com\\nage: 30'}
                    {activeFormat === 'toml' && ' name = "John"\\nemail = "john@example.com"\\nage = 30'}
                    {activeFormat === 'sql' && ' CREATE TABLE users (name VARCHAR(100), email VARCHAR(100), age INT)'}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Schema Fields</h3>
              <Button onClick={addSchemaField} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </div>
            <div className="space-y-2">
              {schema.map(field => (
                <div key={field.id} className="flex items-center gap-2 p-3 border rounded-md border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateSchemaField(field.id, 'name', e.target.value)}
                    placeholder="Field name"
                    className="w-1/5 px-2 py-1 text-sm border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateSchemaField(field.id, 'type', e.target.value)}
                    className="w-1/6 px-2 py-1 text-sm border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="null">Null</option>
                  </select>
                  <select
                    value={field.fakerMethod}
                    onChange={(e) => updateSchemaField(field.id, 'fakerMethod', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                  >
                    <option value="none">None</option>
                    {Object.entries(fakerCategories).map(([cat, methods]) => (
                      <optgroup key={cat} label={cat}>
                        {methods.map(m => <option key={`${cat}.${m}`} value={`${cat}.${m}`}>{cat}.{m}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={field.isArray} onChange={(e) => updateSchemaField(field.id, 'isArray', e.target.checked)} />
                    Array
                  </label>
                  {field.isArray && (
                    <input
                      type="number"
                      value={field.arrayLength}
                      onChange={(e) => updateSchemaField(field.id, 'arrayLength', parseInt(e.target.value) || 1)}
                      min="1"
                      max="20"
                      className="w-16 px-2 py-1 text-sm border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                    />
                  )}
                  <Button onClick={() => removeSchemaField(field.id)} size="sm" variant="ghost" className="text-red-500 h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Results Button */}
      {generatedData && (
        <div className="fixed bottom-6 right-6 z-30">
          <Button
            onClick={() => setShowResultsSidebar(!showResultsSidebar)}
            size="sm"
            className={`h-12 w-12 p-0 rounded-full shadow-lg ${blinkResults ? 'animate-pulse bg-[var(--accent-primary)] text-white' : ''} ${showResultsSidebar ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)]'}`}
          >
            <FileText className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Overlay */}
      {showResultsSidebar && <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowResultsSidebar(false)} />}

      {/* Open Results Button - Shows when sidebar is collapsed and data exists */}
      {generatedData && !showResultsSidebar && (
        <Button
          onClick={() => setShowResultsSidebar(true)}
          size="sm"
          variant="ghost"
          className="fixed right-0 h-16 w-8 p-0 rounded-l-md bg-[var(--bg-secondary)] hover:bg-[var(--accent-primary)] hover:text-white border border-r-0 border-[var(--border-primary)] shadow-lg z-30"
          title="Open results panel"
          style={{ 
            top: 'calc(5% + 50%)',
            transform: 'translateY(-50%)'
          }}
        >
          <ChevronsLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </Button>
      )}

      {/* Results Sidebar */}
      <div className={`fixed right-0 w-[700px] bg-[var(--bg-primary)] border-l-2 border-[var(--border-primary)] shadow-2xl transition-transform duration-300 ease-in-out z-50 ${showResultsSidebar ? 'translate-x-0' : 'translate-x-full'}`} style={{ top: '5%', height: '95%' }}>
        {/* Collapse Button on Left Edge - Centered Vertically with >> Icon */}
        <Button
          onClick={() => setShowResultsSidebar(false)}
          size="sm"
          variant="ghost"
          className="absolute -left-8 h-16 w-8 p-0 rounded-l-md bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-r-0 border-[var(--border-primary)] shadow-lg z-[60]"
          title="Close results panel"
          style={{ 
            display: showResultsSidebar ? 'flex' : 'none', 
            alignItems: 'center', 
            justifyContent: 'center',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <ChevronsRight className="w-5 h-5 text-[var(--text-primary)]" />
        </Button>
        
        <div className="h-full flex flex-col">
          {/* Header with Copy and Download - Theme Aligned */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Generated Data · {activeFormat.toUpperCase()}</h3>
            <div className="flex gap-2">
              <Button 
                onClick={copyToClipboard} 
                size="sm"
                variant="outline"
                disabled={!generatedData}
                className="bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white border-[var(--border-primary)]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button 
                onClick={downloadData} 
                size="sm"
                variant="outline"
                disabled={!generatedData}
                className="bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white border-[var(--border-primary)]"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={
                activeFormat === 'json' ? 'json' :
                activeFormat === 'xml' ? 'xml' :
                activeFormat === 'yaml' ? 'yaml' :
                activeFormat === 'toml' ? 'ini' :
                activeFormat === 'sql' ? 'sql' :
                activeFormat === 'csv' ? 'plaintext' :
                'plaintext'
              }
              theme={editorTheme}
              value={generatedData}
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

DataGenerator.metadata = {
  id: 'data-generator',
  name: 'Data Generator',
  description: 'Generate data in multiple formats (Basic, JSON, CSV, XML, YAML, TOML, SQL) with Faker.js',
  category: 'generators',
  requiresBackend: false,
};

export default DataGenerator;
