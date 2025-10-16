import { useState, useEffect, useRef } from 'react';
import '@/App.css';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { 
  Menu, X, ChevronRight, Search, Star, Code, FileJson, 
  Globe, FileSpreadsheet, Copy, Check, AlertCircle, Settings, User,
  LogOut, Shield, Crown, Lock, Save, Bookmark, Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/AuthContextDesktop';
import CollectionsPanel from '@/components/CollectionsPanel';
import SaveToCollectionDialog from '@/components/SaveToCollectionDialog';
import RestApiTester from '@/components/RestApiTester';
import GrpcTester from '@/components/GrpcTester';
import UiRecorder from '@/components/UiRecorder';
import ActivationDialog from '@/components/ActivationDialog';
import SettingsModal from '@/components/SettingsModal';
import licenseService from '@/services/licenseService';
import { applyTheme, getStoredTheme, getMonacoTheme } from '@/themes';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Icon mapping for dynamic tool loading
const ICON_MAP = {
  'Braces': FileJson,
  'Globe': Globe,
  'Network': Globe,
  'GitBranch': Code,
  'Radio': Globe,
  'Binary': Code,
  'Link': Globe,
  'Shield': Shield,
  'Hash': Code,
  'Fingerprint': Star,
  'Search': Search,
  'GitCompare': Code,
  'FileText': FileJson,
  'Database': FileSpreadsheet,
  'Code': Code,
  'FileCode': FileJson,
  'Palette': Star,
  'Image': FileSpreadsheet,
  'Clock': Settings,
  'Zap': Globe,
  'Sparkles': Star,
  'FileJson': FileJson,
  'FileSpreadsheet': FileSpreadsheet,
};

function MainApp() {
  // Desktop version - no authentication needed
  const user = { name: 'Desktop User' };
  const isAdmin = false;
  const [activePane, setActivePane] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [toolsConfig, setToolsConfig] = useState({});
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [tabToSave, setTabToSave] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // License system state
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [licenseConfig, setLicenseConfig] = useState(null);
  const [isActivated, setIsActivated] = useState(false);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [isLoadingLicense, setIsLoadingLicense] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getStoredTheme());
  const [editorTheme, setEditorTheme] = useState(getMonacoTheme(getStoredTheme()));

  useEffect(() => {
    // Apply saved theme on startup
    const savedTheme = getStoredTheme();
    applyTheme(savedTheme);
    setCurrentTheme(savedTheme);
    setEditorTheme(getMonacoTheme(savedTheme));
    
    loadFavorites();
    loadToolsConfig();
    loadLicenseAndTools();
  }, []);

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      const newTheme = getStoredTheme();
      setCurrentTheme(newTheme);
      setEditorTheme(getMonacoTheme(newTheme));
    };

    // Check for theme changes every 100ms (when settings modal updates theme)
    const interval = setInterval(handleThemeChange, 100);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut for save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab) {
          handleSaveCurrentTab();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, tabs]);

  const loadFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites/list`);
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const loadToolsConfig = async () => {
    try {
      const response = await axios.get(`${API}/tools/config`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      const configMap = {};
      response.data.tools.forEach(tool => {
        configMap[tool.tool_id] = tool;
      });
      setToolsConfig(configMap);
    } catch (error) {
      console.error('Failed to load tools config:', error);
    }
  };

  const loadLicenseAndTools = async () => {
    try {
      setIsLoadingLicense(true);
      console.log('🔄 Loading license and tools...');
      
      // Get license configuration
      const result = await licenseService.getLicenseConfig();
      console.log('📦 License result:', result);
      
      if (result.success && result.toolConfig) {
        const config = result.toolConfig;
        setLicenseConfig(config);
        setIsActivated(result.isActivated || false);
        
        // Load tools from config
        if (config.tools && config.tools.length > 0) {
          const toolsWithIcons = config.tools.map(tool => ({
            ...tool,
            icon: ICON_MAP[tool.icon] || FileJson,
          }));
          setTools(toolsWithIcons);
          console.log(`✅ Loaded ${toolsWithIcons.length} tools`);
        } else {
          console.warn('⚠️ No tools found in config');
        }
        
        // Load categories from config
        if (config.categories && config.categories.length > 0) {
          const categoriesWithIcons = config.categories.map(cat => ({
            ...cat,
            icon: ICON_MAP[cat.icon] || FileJson,
          }));
          setCategories(categoriesWithIcons);
          console.log(`✅ Loaded ${categoriesWithIcons.length} categories`);
        } else {
          console.warn('⚠️ No categories found in config');
        }
        
        console.log('✅ License loaded:', {
          isActivated: result.isActivated,
          licenseType: config.licenseType || 'free',
          toolsCount: config.tools?.length || 0,
          categoriesCount: config.categories?.length || 0,
        });
      } else {
        console.error('❌ Failed to load config:', result);
        toast.error('Failed to load tool configuration');
      }
    } catch (error) {
      console.error('❌ Failed to load license and tools:', error);
      toast.error('Failed to load tool configuration: ' + error.message);
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const checkToolAccess = (tool) => {
    if (!tool) return { hasAccess: false, isPremium: false, needsActivation: false };
    
    // Free tools are always accessible
    if (tool.tier === 'free') {
      return { hasAccess: true, isPremium: false, needsActivation: false };
    }
    
    // Premium tools require activation
    if (tool.tier === 'premium') {
      if (isActivated && licenseConfig) {
        // Check if this specific tool is activated
        const activatedTools = licenseConfig.activatedTools || [];
        const hasAccess = activatedTools.includes('all') || activatedTools.includes(tool.id);
        return { hasAccess, isPremium: true, needsActivation: !hasAccess };
      }
      return { hasAccess: false, isPremium: true, needsActivation: true };
    }
    
    return { hasAccess: true, isPremium: false, needsActivation: false };
  };

  const handleActivateLicense = async (activationKey) => {
    try {
      const result = await licenseService.activateLicense(activationKey);
      
      if (result.success) {
        toast.success(result.message || 'License activated successfully!');
        // Reload tools and license
        await loadLicenseAndTools();
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error('Activation error:', error);
      return {
        success: false,
        message: 'Failed to activate license. Please try again.',
      };
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
    // Check if user has access to this tool
    const access = checkToolAccess(tool);
    
    if (access.needsActivation) {
      toast.error('This is a Premium feature. Please activate your license to access.');
      setShowActivationDialog(true);
      return;
    }

    // Allow multiple instances of the same tool
    const newTab = {
      tabId: `${tool.id}-${Date.now()}`,
      ...tool,
      customName: null,
      data: {}
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.tabId);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
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

  const renameTab = (tabId, newName) => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tabId 
        ? { ...t, customName: newName.trim() || null }
        : t
    );
    setTabs(updatedTabs);
  };

  const duplicateTab = (tabId) => {
    const tabToDuplicate = tabs.find(t => t.tabId === tabId);
    if (tabToDuplicate) {
      const newTab = {
        ...tabToDuplicate,
        tabId: `${tabToDuplicate.id}-${Date.now()}`,
        customName: tabToDuplicate.customName ? `${tabToDuplicate.customName} (Copy)` : null,
        data: { ...tabToDuplicate.data }
      };
      const tabIndex = tabs.findIndex(t => t.tabId === tabId);
      const newTabs = [...tabs.slice(0, tabIndex + 1), newTab, ...tabs.slice(tabIndex + 1)];
      setTabs(newTabs);
      setActiveTab(newTab.tabId);
    }
  };

  const handleSaveCurrentTab = () => {
    const currentTab = tabs.find(t => t.tabId === activeTab);
    if (currentTab) {
      setTabToSave(currentTab);
      setShowSaveDialog(true);
    } else {
      toast.error('No active tab to save');
    }
  };

  const handleOpenSavedItem = (savedItem) => {
    // Check if this saved item is already open
    const existingTab = tabs.find(t => t.savedItemId === savedItem.id);
    if (existingTab) {
      // Switch to existing tab instead of opening new one
      setActiveTab(existingTab.tabId);
      toast.success(`Switched to: ${savedItem.name}`);
      return;
    }

    // Find the tool definition
    const tool = TOOLS.find(t => t.id === savedItem.tool_id);
    if (!tool) {
      toast.error('Tool not found');
      return;
    }

    // Create a new tab with saved data and savedItemId
    const newTab = {
      tabId: `saved-${savedItem.id}-${Date.now()}`,
      ...tool,
      customName: savedItem.name,
      data: savedItem.tool_data || {},
      savedItemId: savedItem.id // Mark this tab as opened from collection
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.tabId);
    toast.success(`Opened: ${savedItem.name}`);
  };

  const filteredTools = searchQuery
    ? tools.filter(tool => 
        tool.enabled &&
        (tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tools.filter(tool => tool.enabled);

  const categoryTools = selectedCategory
    ? tools.filter(tool => {
        const matchesCategory = tool.category === selectedCategory.id;
        const matchesSearch = !searchQuery || 
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        return tool.enabled && matchesCategory && matchesSearch;
      })
    : [];

  const favoriteTools = tools.filter(tool => tool.enabled && favorites.includes(tool.id));

  const filteredCategories = searchQuery
    ? categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  return (
    <div className="App" data-testid="productivity-app">
      <Toaster position="top-right" richColors />
      
      {/* Top Bar */}
      <div className="top-bar" data-testid="top-bar">
        <div className="flex items-center gap-3">
          <Code className="w-6 h-6" />
          <span className="text-lg font-semibold">Devvy Studio</span>
        </div>
        <div className="flex items-center gap-3">
          {/* License Badge */}
          {isActivated && licenseConfig ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400 uppercase">
                {licenseConfig.licenseType === 'pro' ? 'Pro' : 'Premium'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
              <span className="text-sm text-[var(--text-tertiary)]">Community</span>
            </div>
          )}
          
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--border-focus)] transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="main-container">
        {/* Two-Pane Sidebar */}
        <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} data-testid="sidebar">
          {/* First Level - Icon Pane */}
          <div className="icon-pane">
            <button
              className={`icon-pane-item ${activePane === 'categories' ? 'active' : ''}`}
              onClick={() => {
                setActivePane('categories');
                setSelectedCategory(null);
                setSearchQuery('');
                setIsSidebarCollapsed(false);
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
                setIsSidebarCollapsed(false);
              }}
              title="All Tools"
              data-testid="icon-tools"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              className={`icon-pane-item ${activePane === 'collections' ? 'active' : ''}`}
              onClick={() => {
                setActivePane('collections');
                setSelectedCategory(null);
                setSearchQuery('');
                setIsSidebarCollapsed(false);
              }}
              title="Collections"
              data-testid="icon-collections"
            >
              <Bookmark className="w-5 h-5" />
            </button>
            {favorites.length > 0 && (
              <button
                className={`icon-pane-item ${activePane === 'favorites' ? 'active' : ''}`}
                onClick={() => {
                  setActivePane('favorites');
                  setSelectedCategory(null);
                  setSearchQuery('');
                  setIsSidebarCollapsed(false);
                }}
                title="Favorites"
                data-testid="icon-favorites"
              >
                <Star className="w-5 h-5" />
              </button>
            )}
            
            {/* Spacer */}
            <div className="flex-1"></div>
            
            {/* Activate License Button */}
            {!isActivated && (
              <button
                className="icon-pane-item"
                onClick={() => setShowActivationDialog(true)}
                title="Activate License"
                data-testid="icon-activate"
              >
                <Key className="w-5 h-5 text-emerald-500" />
              </button>
            )}
            
            {/* License Status Indicator */}
            {isActivated && (
              <button
                className="icon-pane-item"
                onClick={() => toast.success(`License Active: ${licenseConfig?.licenseType || 'Unknown'}`)}
                title={`License Active: ${licenseConfig?.licenseType || 'Unknown'}`}
                data-testid="icon-license-status"
              >
                <Shield className="w-5 h-5 text-emerald-500" />
              </button>
            )}
          </div>

          {/* Second Level - Content Pane */}
          <div className="content-pane">
            {/* Collapse Toggle */}
            <button
              onClick={toggleSidebar}
              className="sidebar-toggle"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
            
            {activePane !== 'collections' && (
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
                  placeholder={
                    activePane === 'categories' && selectedCategory
                      ? `Search ${selectedCategory.name} tools...`
                      : `Search ${activePane}...`
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  data-testid="pane-search-input"
                />
              </div>
            )}

            <div className={`content-pane-body ${activePane !== 'collections' ? 'grid-layout' : ''}`}>
              {/* Show Collections Panel */}
              {activePane === 'collections' && (
                <CollectionsPanel onOpenItem={handleOpenSavedItem} />
              )}
              {/* Show Categories */}
              {activePane === 'categories' && !selectedCategory && (
                <>
                  {filteredCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        className="pane-item"
                        data-category={category.id}
                        onClick={() => handleCategorySelect(category)}
                        data-testid={`pane-category-${category.id}`}
                      >
                        <div className="pane-item-icon">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="pane-item-content">
                          <div className="pane-item-name">{category.name}</div>
                          <div className="pane-item-desc">
                            {tools.filter(t => t.enabled && t.category === category.id).length} tools
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Show Tools in Selected Category */}
              {activePane === 'categories' && selectedCategory && (
                <>
                  {categoryTools.map((tool) => {
                    const access = checkToolAccess(tool);
                    return (
                      <ToolPaneItem
                        key={tool.id}
                        tool={tool}
                        onOpen={openTool}
                        isFavorite={favorites.includes(tool.id)}
                        onToggleFavorite={toggleFavorite}
                        isPremium={access.isPremium}
                        isLocked={access.needsActivation}
                      />
                    );
                  })}
                </>
              )}

              {/* Show All Tools */}
              {activePane === 'tools' && (
                <>
                  {filteredTools.map((tool) => {
                    const access = checkToolAccess(tool);
                    return (
                      <ToolPaneItem
                        key={tool.id}
                        tool={tool}
                        onOpen={openTool}
                        isFavorite={favorites.includes(tool.id)}
                        onToggleFavorite={toggleFavorite}
                        isPremium={access.isPremium}
                        isLocked={access.needsActivation}
                      />
                    );
                  })}
                </>
              )}

              {/* Show Favorites */}
              {activePane === 'favorites' && (
                <>
                  {favoriteTools.map((tool) => {
                    const access = checkToolAccess(tool);
                    return (
                      <ToolPaneItem
                        key={tool.id}
                        tool={tool}
                        onOpen={openTool}
                        isFavorite={true}
                        onToggleFavorite={toggleFavorite}
                        isPremium={access.isPremium}
                        isLocked={access.needsActivation}
                      />
                    );
                  })}
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
                <TabItem
                  key={tab.tabId}
                  tab={tab}
                  isActive={activeTab === tab.tabId}
                  onActivate={() => setActiveTab(tab.tabId)}
                  onClose={(e) => closeTab(tab.tabId, e)}
                  onRename={(newName) => renameTab(tab.tabId, newName)}
                  onDuplicate={() => duplicateTab(tab.tabId)}
                  onCloseOthers={() => closeOtherTabs(tab.tabId)}
                  onCloseToRight={() => closeTabsToRight(tab.tabId)}
                  onSave={handleSaveCurrentTab}
                />
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
                  <JSONBeautifierTool tab={tab} tabs={tabs} setTabs={setTabs} editorTheme={editorTheme} />
                )}
                {tab.id === 'json-validator' && (
                  <div className="p-8 text-center text-gray-400">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>JSON Validator - Coming Soon</p>
                  </div>
                )}
                {tab.id === 'api-tester' && (
                  <RestApiTester tab={tab} tabs={tabs} setTabs={setTabs} />
                )}
                {tab.id === 'grpc-tester' && (
                  <GrpcTester tab={tab} tabs={tabs} setTabs={setTabs} />
                )}
                {tab.id === 'ui-recorder' && (
                  <UiRecorder tab={tab} tabs={tabs} setTabs={setTabs} />
                )}
              </div>
            ))}

            {tabs.length === 0 && (
              <div className="empty-state" data-testid="empty-state">
                <Code className="w-24 h-24 mb-6 opacity-30" />
                <h2 className="text-2xl font-semibold mb-2">Welcome to Devvy Studio</h2>
                <p className="text-gray-400 mb-6">Select a tool from the sidebar to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save to Collection Dialog */}
      {showSaveDialog && tabToSave && (
        <SaveToCollectionDialog
          open={showSaveDialog}
          onClose={() => {
            setShowSaveDialog(false);
            setTabToSave(null);
          }}
          tab={tabToSave}
        />
      )}

      {/* Activation Dialog */}
      <ActivationDialog
        isOpen={showActivationDialog}
        onClose={() => setShowActivationDialog(false)}
        onActivate={handleActivateLicense}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

function TabItem({ tab, isActive, onActivate, onClose, onRename, onDuplicate, onCloseOthers, onCloseToRight, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditName(tab.customName || tab.name);
    setIsEditing(true);
  };

  const handleRename = () => {
    if (editName.trim()) {
      onRename(editName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  return (
    <>
      <div
        className={`tab ${isActive ? 'active' : ''}`}
        onClick={onActivate}
        onContextMenu={handleContextMenu}
        data-testid={`tab-${tab.tabId}`}
      >
        <tab.icon className="w-4 h-4 flex-shrink-0" />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="tab-name-input"
            onClick={(e) => e.stopPropagation()}
            data-testid={`tab-rename-input-${tab.tabId}`}
          />
        ) : (
          <span 
            onDoubleClick={handleDoubleClick}
            className="tab-name"
            title={tab.customName || tab.name}
          >
            {tab.customName || tab.name}
          </span>
        )}
        {isActive && onSave && (
          <button
            className="tab-action"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            title="Save to Collection (Cmd+S)"
            data-testid={`save-tab-${tab.tabId}`}
          >
            <Bookmark className="w-3.5 h-3.5 text-gray-400 hover:text-emerald-500" />
          </button>
        )}
        <button
          className="tab-close"
          onClick={onClose}
          data-testid={`close-tab-${tab.tabId}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {showContextMenu && (
        <div 
          className="context-menu"
          style={{ 
            position: 'fixed', 
            top: contextMenuPos.y, 
            left: contextMenuPos.x,
            zIndex: 1000
          }}
          data-testid={`context-menu-${tab.tabId}`}
        >
          <button 
            className="context-menu-item"
            onClick={() => {
              setEditName(tab.customName || tab.name);
              setIsEditing(true);
              setShowContextMenu(false);
            }}
            data-testid="context-menu-rename"
          >
            Rename Tab
          </button>
          <button 
            className="context-menu-item"
            onClick={() => {
              onDuplicate();
              setShowContextMenu(false);
            }}
            data-testid="context-menu-duplicate"
          >
            Duplicate Tab
          </button>
          <div className="context-menu-divider" />
          <button 
            className="context-menu-item"
            onClick={() => {
              onClose();
              setShowContextMenu(false);
            }}
            data-testid="context-menu-close"
          >
            Close
          </button>
          <button 
            className="context-menu-item"
            onClick={() => {
              onCloseOthers();
              setShowContextMenu(false);
            }}
            data-testid="context-menu-close-others"
          >
            Close Others
          </button>
          <button 
            className="context-menu-item"
            onClick={() => {
              onCloseToRight();
              setShowContextMenu(false);
            }}
            data-testid="context-menu-close-right"
          >
            Close to the Right
          </button>
        </div>
      )}
    </>
  );
}

function ToolPaneItem({ tool, onOpen, isFavorite, onToggleFavorite, isPremium, isLocked }) {
  const Icon = tool.icon;
  
  return (
    <button
      className={`pane-item ${isLocked ? 'opacity-75' : ''}`}
      data-category={tool.category}
      onClick={() => onOpen(tool)}
      data-testid={`tool-pane-item-${tool.id}`}
    >
      <div className="pane-item-icon">
        <Icon className="w-6 h-6" />
      </div>
      <div className="pane-item-content">
        <div className="pane-item-name flex items-center gap-1">
          <span>{tool.name}</span>
          {isPremium && (
            <Crown className="w-3 h-3 text-amber-500" />
          )}
          {isLocked && (
            <Lock className="w-3 h-3 text-gray-500" />
          )}
        </div>
        {tool.description && (
          <div className="pane-item-desc">{tool.description}</div>
        )}
      </div>
      {isFavorite && (
        <Star className="w-3 h-3 text-amber-500 absolute top-2 right-2" fill="currentColor" />
      )}
    </button>
  );
}

function JSONBeautifierTool({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [inputJSON, setInputJSON] = useState(tab.data.input || '');
  const [outputJSON, setOutputJSON] = useState(tab.data.output || '');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const beautifyJSON = async () => {
    try {
      const response = await axios.post(`${API}/beautify`, {
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
            theme={editorTheme}
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
            theme={editorTheme}
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

// Main App with Auth Provider
export default function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}

function AuthWrapper() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <Code className="w-16 h-16 animate-pulse text-emerald-500" />
        <p className="mt-4 text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <MainApp />;
}