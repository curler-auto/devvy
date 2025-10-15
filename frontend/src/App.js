import { useState, useEffect } from 'react';
import '@/App.css';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { 
  Menu, X, ChevronRight, Search, Star, Code, FileJson, 
  Globe, FileSpreadsheet, Copy, Check, AlertCircle, Settings, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  { id: 'json', name: 'JSON', icon: FileJson },
  { id: 'api', name: 'API', icon: Globe },
  { id: 'xml', name: 'XML', icon: Code },
  { id: 'excel', name: 'Excel', icon: FileSpreadsheet },
];

const TOOLS = [
  { 
    id: 'json-beautifier', 
    name: 'JSON Beautifier', 
    category: 'json',
    icon: FileJson,
    description: 'Format and beautify JSON data'
  },
  { 
    id: 'json-validator', 
    name: 'JSON Validator', 
    category: 'json',
    icon: FileJson,
    description: 'Validate JSON structure'
  },
  { 
    id: 'api-tester', 
    name: 'API Tester', 
    category: 'api',
    icon: Globe,
    description: 'Test REST API endpoints'
  },
];

function App() {
  const [activePane, setActivePane] = useState('categories'); // 'categories' or 'tools'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites/list`);
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const toggleFavorite = async (toolId) => {
    try {
      if (favorites.includes(toolId)) {
        await axios.post(`${API}/favorites/remove`, { tool_id: toolId });
        setFavorites(favorites.filter(id => id !== toolId));
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/favorites/add`, { tool_id: toolId });
        setFavorites([...favorites, toolId]);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const openTool = (tool) => {
    const existingTab = tabs.find(t => t.id === tool.id);
    if (existingTab) {
      setActiveTab(existingTab.tabId);
    } else {
      const newTab = {
        tabId: `${tool.id}-${Date.now()}`,
        ...tool,
        data: {}
      };
      setTabs([...tabs, newTab]);
      setActiveTab(newTab.tabId);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const closeTab = (tabId, e) => {
    e?.stopPropagation();
    const tabIndex = tabs.findIndex(t => t.tabId === tabId);
    const newTabs = tabs.filter(t => t.tabId !== tabId);
    setTabs(newTabs);
    
    if (activeTab === tabId && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveTab(newTabs[newActiveIndex].tabId);
    } else if (newTabs.length === 0) {
      setActiveTab(null);
    }
  };

  const closeOtherTabs = (tabId) => {
    const keepTab = tabs.find(t => t.tabId === tabId);
    setTabs([keepTab]);
    setActiveTab(tabId);
  };

  const closeTabsToRight = (tabId) => {
    const tabIndex = tabs.findIndex(t => t.tabId === tabId);
    const newTabs = tabs.slice(0, tabIndex + 1);
    setTabs(newTabs);
    if (!newTabs.find(t => t.tabId === activeTab)) {
      setActiveTab(tabId);
    }
  };

  const filteredTools = searchQuery
    ? TOOLS.filter(tool => 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : TOOLS;

  const categoryTools = selectedCategory
    ? TOOLS.filter(tool => tool.category === selectedCategory.id)
    : [];

  const favoriteTools = TOOLS.filter(tool => favorites.includes(tool.id));

  const filteredCategories = searchQuery
    ? CATEGORIES.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CATEGORIES;

  return (
    <div className="App" data-testid="productivity-app">
      <Toaster position="top-right" richColors />
      
      {/* Top Bar */}
      <div className="top-bar" data-testid="top-bar">
        <div className="flex items-center gap-3">
          <Code className="w-6 h-6" />
          <span className="text-lg font-semibold">DevTools Suite</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" data-testid="settings-button">
            <Settings className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50">
            <User className="w-4 h-4" />
            <span className="text-sm">Developer</span>
          </div>
        </div>
      </div>

      <div className="main-container">
        {/* Two-Pane Sidebar */}
        <div className="sidebar" data-testid="sidebar">
          {/* First Level - Icon Pane */}
          <div className="icon-pane">
            <button
              className={`icon-pane-item ${activePane === 'categories' ? 'active' : ''}`}
              onClick={() => {
                setActivePane('categories');
                setSelectedCategory(null);
                setSearchQuery('');
              }}
              title="Categories"
              data-testid="icon-categories"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              className={`icon-pane-item ${activePane === 'tools' ? 'active' : ''}`}
              onClick={() => {
                setActivePane('tools');
                setSelectedCategory(null);
                setSearchQuery('');
              }}
              title="All Tools"
              data-testid="icon-tools"
            >
              <Search className="w-5 h-5" />
            </button>
            {favoriteTools.length > 0 && (
              <button
                className={`icon-pane-item ${activePane === 'favorites' ? 'active' : ''}`}
                onClick={() => {
                  setActivePane('favorites');
                  setSelectedCategory(null);
                  setSearchQuery('');
                }}
                title="Favorites"
                data-testid="icon-favorites"
              >
                <Star className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Second Level - Content Pane */}
          <div className="content-pane">
            <div className="content-pane-header">
              <div className="content-pane-title">
                {activePane === 'categories' && !selectedCategory && 'Categories'}
                {activePane === 'categories' && selectedCategory && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBackToCategories}
                      className="text-gray-400 hover:text-white"
                      data-testid="back-to-categories"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                    {selectedCategory.name} Tools
                  </div>
                )}
                {activePane === 'tools' && 'All Tools'}
                {activePane === 'favorites' && 'Favorites'}
              </div>
              <Input
                placeholder={`Search ${activePane}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                data-testid="pane-search-input"
              />
            </div>

            <div className="content-pane-body">
              {/* Show Categories */}
              {activePane === 'categories' && !selectedCategory && (
                <>
                  {filteredCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        className="pane-item"
                        onClick={() => handleCategorySelect(category)}
                        data-testid={`pane-category-${category.id}`}
                      >
                        <div className="pane-item-icon">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="pane-item-content">
                          <div className="pane-item-name">{category.name}</div>
                          <div className="pane-item-desc">
                            {TOOLS.filter(t => t.category === category.id).length} tools
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    );
                  })}
                </>
              )}

              {/* Show Tools in Selected Category */}
              {activePane === 'categories' && selectedCategory && (
                <>
                  {categoryTools.map((tool) => (
                    <ToolPaneItem
                      key={tool.id}
                      tool={tool}
                      onOpen={openTool}
                      isFavorite={favorites.includes(tool.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </>
              )}

              {/* Show All Tools */}
              {activePane === 'tools' && (
                <>
                  {filteredTools.map((tool) => (
                    <ToolPaneItem
                      key={tool.id}
                      tool={tool}
                      onOpen={openTool}
                      isFavorite={favorites.includes(tool.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </>
              )}

              {/* Show Favorites */}
              {activePane === 'favorites' && (
                <>
                  {favoriteTools.map((tool) => (
                    <ToolPaneItem
                      key={tool.id}
                      tool={tool}
                      onOpen={openTool}
                      isFavorite={true}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="content-area">
          {/* Tab Bar */}
          {tabs.length > 0 && (
            <div className="tab-bar" data-testid="tab-bar">
              {tabs.map((tab) => (
                <div
                  key={tab.tabId}
                  className={`tab ${activeTab === tab.tabId ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.tabId)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    // Show context menu options
                  }}
                  data-testid={`tab-${tab.tabId}`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                  <button
                    className="tab-close"
                    onClick={(e) => closeTab(tab.tabId, e)}
                    data-testid={`close-tab-${tab.tabId}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tool Content */}
          <div className="tool-content">
            {tabs.map((tab) => (
              <div
                key={tab.tabId}
                style={{ display: activeTab === tab.tabId ? 'block' : 'none' }}
              >
                {tab.id === 'json-beautifier' && (
                  <JSONBeautifierTool tab={tab} tabs={tabs} setTabs={setTabs} />
                )}
                {tab.id === 'json-validator' && (
                  <div className="p-8 text-center text-gray-400">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>JSON Validator - Coming Soon</p>
                  </div>
                )}
                {tab.id === 'api-tester' && (
                  <div className="p-8 text-center text-gray-400">
                    <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>API Tester - Coming Soon</p>
                  </div>
                )}
              </div>
            ))}

            {tabs.length === 0 && (
              <div className="empty-state" data-testid="empty-state">
                <Code className="w-24 h-24 mb-6 opacity-30" />
                <h2 className="text-2xl font-semibold mb-2">Welcome to DevTools Suite</h2>
                <p className="text-gray-400 mb-6">Select a tool from the sidebar to get started</p>
                <Button onClick={() => setShowToolsModal(true)} data-testid="browse-tools-empty">
                  <Search className="w-4 h-4 mr-2" />
                  Browse All Tools
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="dialog-content" data-testid="category-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCategory?.icon && <selectedCategory.icon className="w-5 h-5" />}
              {selectedCategory?.name} Tools
            </DialogTitle>
          </DialogHeader>
          <div className="tools-grid">
            {categoryTools.map((tool) => (
              <ToolCard 
                key={tool.id} 
                tool={tool} 
                onOpen={openTool}
                isFavorite={favorites.includes(tool.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* All Tools Modal */}
      <Dialog open={showToolsModal} onOpenChange={setShowToolsModal}>
        <DialogContent className="dialog-content" data-testid="tools-modal">
          <DialogHeader>
            <DialogTitle>All Tools</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              data-testid="tool-search-input"
            />
          </div>
          <div className="tools-grid">
            {filteredTools.map((tool) => (
              <ToolCard 
                key={tool.id} 
                tool={tool} 
                onOpen={openTool}
                isFavorite={favorites.includes(tool.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolCard({ tool, onOpen, isFavorite, onToggleFavorite }) {
  const Icon = tool.icon;
  
  return (
    <div className="tool-card" data-testid={`tool-card-${tool.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="tool-icon">
          <Icon className="w-6 h-6" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(tool.id);
          }}
          className={`favorite-button ${isFavorite ? 'active' : ''}`}
          data-testid={`favorite-button-${tool.id}`}
        >
          <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h3 className="text-sm font-semibold mb-1">{tool.name}</h3>
      <p className="text-xs text-gray-400 mb-3">{tool.description}</p>
      <Button 
        size="sm" 
        onClick={() => onOpen(tool)}
        className="w-full"
        data-testid={`open-tool-${tool.id}`}
      >
        Open Tool
      </Button>
    </div>
  );
}

function JSONBeautifierTool({ tab, tabs, setTabs }) {
  const [inputJSON, setInputJSON] = useState(tab.data.input || '');
  const [outputJSON, setOutputJSON] = useState(tab.data.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const beautifyJSON = async () => {
    try {
      const response = await axios.post(`${API}/tools/json-beautifier`, {
        json_string: inputJSON,
        indent: 2
      });

      setOutputJSON(response.data.beautified);
      setIsValid(response.data.valid);
      setError(response.data.error);

      // Update tab data
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { ...t, data: { input: inputJSON, output: response.data.beautified } }
          : t
      );
      setTabs(updatedTabs);

      if (response.data.valid) {
        toast.success('JSON beautified successfully!');
      } else {
        toast.error('Invalid JSON format');
      }
    } catch (err) {
      console.error('Beautify error:', err);
      toast.error('Failed to beautify JSON');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputJSON);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="json-tool" data-testid="json-beautifier">
      <div className="json-panel">
        <div className="panel-header">
          <h3>Input JSON</h3>
          <Button 
            onClick={beautifyJSON} 
            size="sm"
            data-testid="beautify-button"
          >
            <Code className="w-4 h-4 mr-2" />
            Beautify
          </Button>
        </div>
        <div className="editor-container">
          <Editor
            height="100%"
            defaultLanguage="json"
            theme="vs-dark"
            value={inputJSON}
            onChange={(value) => setInputJSON(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>
      </div>

      <div className="json-panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <h3>Output</h3>
            {!isValid && error && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </span>
            )}
          </div>
          <Button 
            onClick={copyToClipboard}
            size="sm"
            variant="outline"
            disabled={!outputJSON}
            data-testid="copy-button"
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
            theme="vs-dark"
            value={outputJSON}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
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
  );
}

export default App;