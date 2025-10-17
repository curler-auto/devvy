import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import xmlFormatter from 'xml-formatter';

/**
 * Random XML Generator Tool
 * Generate random XML data with customizable structure
 * Client-side implementation
 */
function RandomXMLGenerator({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [generatedXML, setGeneratedXML] = useState(tab.data?.output || '');
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState(tab.data?.settings || {
    rootElement: 'root',
    depth: 3,
    breadth: 4,
    childrenPerElement: 3,
    includeAttributes: true,
    attributesPerElement: 2,
    includeValues: true,
    includeComments: false,
    seed: Math.floor(Math.random() * 1000000),
  });
  const [showSettings, setShowSettings] = useState(false);

  // Update tab data when settings or output change
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { 
            output: generatedXML,
            settings
          } }
        : t
    );
    setTabs(updatedTabs);
  }, [generatedXML, settings]);

  // Generate random XML
  const generateXML = () => {
    try {
      // Update seed for new random values
      setSettings(prev => ({ ...prev, seed: Math.floor(Math.random() * 1000000) }));
      
      // Generate XML based on settings
      const xmlContent = generateRandomXML(settings);
      
      // Format XML
      const formattedXML = xmlFormatter(xmlContent, {
        indentation: '  ',
        lineSeparator: '\n',
        collapseContent: true,
      });
      
      setGeneratedXML(formattedXML);
      
      toast.success('Random XML generated successfully');
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(`Generation error: ${err.message}`);
    }
  };

  // Generate random XML based on settings
  const generateRandomXML = (config) => {
    // Seed random number generator
    const random = seedRandom(config.seed);
    
    // XML declaration
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    
    // Add root element
    xml += generateElement(config.rootElement, config, 0, random);
    
    return xml;
  };

  // Generate XML element
  const generateElement = (name, config, depth, random) => {
    let element = '';
    const attributes = config.includeAttributes ? generateAttributes(config, random) : '';
    
    // Start tag with attributes
    element += `<${name}${attributes}`;
    
    // Determine if this element has children or value
    const hasChildren = depth < config.depth;
    const hasValue = config.includeValues && (!hasChildren || random() > 0.5);
    
    if (!hasChildren && !hasValue) {
      // Self-closing tag
      element += ' />';
      return element;
    }
    
    // Close opening tag
    element += '>';
    
    // Add value if needed
    if (hasValue) {
      element += generateRandomValue(random);
    }
    
    // Add children if not at max depth
    if (hasChildren) {
      // Determine number of children
      const numChildren = Math.max(1, Math.floor(random() * config.childrenPerElement) + 1);
      
      for (let i = 0; i < numChildren; i++) {
        // Add comment occasionally
        if (config.includeComments && random() > 0.8) {
          element += `\n<!-- ${generateRandomComment(random)} -->`;
        }
        
        // Generate child element
        const childName = `element_${depth + 1}_${i + 1}`;
        element += '\n' + generateElement(childName, config, depth + 1, random);
      }
    }
    
    // Close tag
    element += `</${name}>`;
    
    return element;
  };

  // Generate random attributes
  const generateAttributes = (config, random) => {
    const numAttributes = Math.floor(random() * config.attributesPerElement) + 1;
    let attributes = '';
    
    for (let i = 0; i < numAttributes; i++) {
      attributes += ` attr_${i + 1}="${generateRandomValue(random)}"`;
    }
    
    return attributes;
  };

  // Generate random value
  const generateRandomValue = (random) => {
    const templates = [
      'Lorem ipsum',
      'Hello world',
      'Random text',
      'Sample data',
      'Test value',
      'Example content',
      'XML generator',
      'Devvy Studio',
      'Generated value',
      'Placeholder text'
    ];
    
    return templates[Math.floor(random() * templates.length)];
  };

  // Generate random comment
  const generateRandomComment = (random) => {
    const comments = [
      'This is a comment',
      'Generated element',
      'Random XML data',
      'Auto-generated',
      'Sample comment',
      'XML structure',
      'Nested element',
      'Element description',
      'Metadata',
      'Documentation'
    ];
    
    return comments[Math.floor(random() * comments.length)];
  };

  // Simple seeded random number generator
  const seedRandom = (seed) => {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  };

  // Update a setting value
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedXML);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="random-xml-generator-tool" data-testid="random-xml-generator">
      <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowSettings(!showSettings)} 
              size="sm"
              variant={showSettings ? "default" : "outline"}
            >
              <Settings className="w-4 h-4 mr-2" />
              {showSettings ? 'Hide Settings' : 'Show Settings'}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={generateXML} 
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Random XML
            </Button>
            
            <Button 
              onClick={copyToClipboard} 
              size="sm"
              variant="outline"
              disabled={!generatedXML}
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-2" /> Copied</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Copy</>
              )}
            </Button>
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-4 p-4 border border-[var(--border-primary)] rounded-md bg-[var(--bg-tertiary)]">
            <h3 className="text-base font-medium mb-3">Generator Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Root Element */}
              <div>
                <label className="block text-sm font-medium mb-1">Root Element Name</label>
                <input
                  type="text"
                  value={settings.rootElement}
                  onChange={(e) => updateSetting('rootElement', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                  placeholder="root"
                />
              </div>
              
              {/* Depth */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Depth: {settings.depth}
                </label>
                <input 
                  type="range"
                  min="1"
                  max="5"
                  value={settings.depth}
                  onChange={(e) => updateSetting('depth', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Children Per Element */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Children Per Element: {settings.childrenPerElement}
                </label>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={settings.childrenPerElement}
                  onChange={(e) => updateSetting('childrenPerElement', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Attributes Per Element */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Attributes Per Element: {settings.attributesPerElement}
                </label>
                <input 
                  type="range"
                  min="0"
                  max="5"
                  value={settings.attributesPerElement}
                  onChange={(e) => updateSetting('attributesPerElement', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Options */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">Options</label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1">
                    <input 
                      type="checkbox"
                      checked={settings.includeAttributes}
                      onChange={(e) => updateSetting('includeAttributes', e.target.checked)}
                    />
                    <span className="text-sm">Include Attributes</span>
                  </label>
                  
                  <label className="flex items-center gap-1">
                    <input 
                      type="checkbox"
                      checked={settings.includeValues}
                      onChange={(e) => updateSetting('includeValues', e.target.checked)}
                    />
                    <span className="text-sm">Include Values</span>
                  </label>
                  
                  <label className="flex items-center gap-1">
                    <input 
                      type="checkbox"
                      checked={settings.includeComments}
                      onChange={(e) => updateSetting('includeComments', e.target.checked)}
                    />
                    <span className="text-sm">Include Comments</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Generated XML */}
        <div className="flex-1">
          <div className="panel-header">
            <h3>Generated XML</h3>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="xml"
              theme={editorTheme}
              value={generatedXML}
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
RandomXMLGenerator.metadata = {
  id: 'random-xml-generator',
  name: 'Random XML Generator',
  description: 'Generate random XML data with customizable structure',
  category: 'xml',
  requiresBackend: false, // Client-side implementation
};

export default RandomXMLGenerator;
