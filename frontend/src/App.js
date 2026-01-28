import { useState, useEffect, useRef } from 'react';
import '@/App.css';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { 
  Menu, X, ChevronRight, Search, Star, Code, FileJson, 
  Globe, FileSpreadsheet, Copy, Check, AlertCircle, Settings, User,
  LogOut, Shield, Crown, Lock, Save, Bookmark, Key, QrCode, Type, RefreshCw
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
import ToolWrapper from '@/components/ToolWrapper';
import licenseService from '@/services/licenseService';
import { applyTheme, getStoredTheme, getMonacoTheme } from '@/themes';
import { isToolRegistered } from '@/tools';
import upgradeService from '@/services/upgradeService';

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
  'QrCode': QrCode,
  'Type': Type,
  'Key': Key,
  'RefreshCw': RefreshCw,
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
  const [unsavedTabs, setUnsavedTabs] = useState(new Set()); // Track tabs with unsaved changes

  useEffect(() => {
    // Apply saved theme on startup
    const savedTheme = getStoredTheme();
    applyTheme(savedTheme);
    setCurrentTheme(savedTheme);
    setEditorTheme(getMonacoTheme(savedTheme));
    
    // Check for upgrade
    checkForUpgrade();
    
    loadFavorites();
    loadToolsConfig();
    loadLicenseAndTools();
    
    // Listen for favorites changes from tool headers
    const handleFavoritesChanged = () => {
      loadFavorites();
    };
    window.addEventListener('favoritesChanged', handleFavoritesChanged);
    
    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChanged);
    };
  }, []);

  // Keyboard shortcut handler for Ctrl/Cmd+S and Ctrl/Cmd+Shift+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab) {
          const tab = tabs.find(t => t.tabId === activeTab);
          if (tab) {
            if (e.shiftKey) {
              // Ctrl/Cmd+Shift+S: Save As (always show dialog)
              handleSaveTab(tab);
            } else {
              // Ctrl/Cmd+S: Direct save for existing items
              if (tab.savedItemId) {
                handleDirectSave(tab);
              } else {
                handleSaveTab(tab);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, tabs]);

  // Track unsaved changes for tabs with savedItemId
  useEffect(() => {
    tabs.forEach(tab => {
      if (tab.savedItemId) {
        // Compare current data and name with original
        const currentData = JSON.stringify(tab.data || {});
        const currentName = tab.customName || tab.name;
        const hasDataChanged = tab.originalData && currentData !== tab.originalData;
        const hasNameChanged = tab.savedItemName && currentName !== tab.savedItemName;
        
        if (hasDataChanged || hasNameChanged) {
          setUnsavedTabs(prev => new Set(prev).add(tab.tabId));
        } else {
          setUnsavedTabs(prev => {
            const newSet = new Set(prev);
            newSet.delete(tab.tabId);
            return newSet;
          });
        }
      }
    });
  }, [tabs]);
  
  // Check if this is an upgrade and show notification
  const checkForUpgrade = () => {
    try {
      const upgradeStatus = upgradeService.checkUpgradeStatus();
      
      if (upgradeStatus.isUpgrade) {
        // Show upgrade notification
        toast.success(
          `Upgraded to version ${upgradeStatus.currentVersion}`, 
          { 
            description: 'Your license and data have been preserved.',
            duration: 5000
          }
        );
      } else if (upgradeStatus.isFirstRun) {
        // Show welcome message for first run
        toast.info(
          'Welcome to Devvy Studio!', 
          { 
            description: 'Select a tool from the sidebar to get started.',
            duration: 5000
          }
        );
      }
    } catch (error) {
      console.error('Error checking for upgrade:', error);
    }
  };

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
      const favs = response.data.favorites || [];
      console.log('Loaded favorites:', favs);
      setFavorites(favs);
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

    // Always grant access, marking as premium if tier is premium
    return {
      hasAccess: true,
      isPremium: tool.tier === "premium",
      needsActivation: false,
    };
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
      console.log('Toggling favorite for:', toolId);
      console.log('Current favorites:', favorites);
      
      if (favorites.includes(toolId)) {
        await axios.post(`${API}/favorites/remove`, { tool_id: toolId });
        const newFavorites = favorites.filter(id => id !== toolId);
        setFavorites(newFavorites);
        console.log('Removed from favorites. New list:', newFavorites);
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/favorites/add`, { tool_id: toolId });
        const newFavorites = [...favorites, toolId];
        setFavorites(newFavorites);
        console.log('Added to favorites. New list:', newFavorites);
        toast.success('Added to favorites');
      }
      
      // Dispatch event to notify other components
      console.log('Dispatching favoritesChanged event');
      window.dispatchEvent(new CustomEvent('favoritesChanged'));
      
      // Also reload favorites to ensure sync
      setTimeout(() => loadFavorites(), 100);
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
      // Direct save for existing items, dialog for new items
      if (currentTab.savedItemId) {
        handleDirectSave(currentTab);
      } else {
        setTabToSave(currentTab);
        setShowSaveDialog(true);
      }
    } else {
      toast.error('No active tab to save');
    }
  };

  const handleSaveTab = (tab) => {
    if (!tab) return;
    setTabToSave(tab);
    setShowSaveDialog(true);
  };

  const handleDirectSave = async (tab) => {
    if (!tab || !tab.savedItemId) return;

    // For desktop mode, use 'desktop-token'
    const token = 'desktop-token';
    try {
      await axios.put(
        `${API}/saved-items/${tab.savedItemId}`,
        {
          name: tab.customName || tab.name,
          description: '',
          tool_id: tab.id,
          tool_data: tab.data || {},
          collection_id: tab.collectionId || '',
          folder_id: tab.folderId || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Saved!');
      
      // Clear unsaved flag
      setUnsavedTabs(prev => {
        const newSet = new Set(prev);
        newSet.delete(tab.tabId);
        return newSet;
      });
      
      // Update originalData and savedItemName
      setTabs(tabs.map(t => 
        t.tabId === tab.tabId 
          ? { 
              ...t, 
              originalData: JSON.stringify(t.data || {}),
              savedItemName: t.customName || t.name
            }
          : t
      ));
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save');
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
    const tool = tools.find(t => t.id === savedItem.tool_id);
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
      savedItemId: savedItem.id, // Mark this tab as opened from collection
      savedItemName: savedItem.name,
      collectionId: savedItem.collection_id,
      folderId: savedItem.folder_id,
      originalData: JSON.stringify(savedItem.tool_data || {}) // Store original for comparison
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.tabId);
    toast.success(`Opened: ${savedItem.name}`);
  }

  // Filter tools based on search query and enabled status
  // Strictly enforce the enabled flag from toolconfig.json
  const enabledTools = tools.filter(tool => tool.enabled === true);
  
  const filteredTools = searchQuery
    ? enabledTools.filter(tool => 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : enabledTools;

  const categoryTools = selectedCategory
    ? enabledTools.filter(tool => {
        const matchesCategory = tool.category === selectedCategory.id;
        const matchesSearch = !searchQuery || 
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
    : [];

  const favoriteTools = enabledTools.filter(tool => favorites.includes(tool.id));
  
  // Filter favorites based on search query
  const filteredFavorites = searchQuery
    ? favoriteTools.filter(tool =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : favoriteTools;

  // Filter out categories with no enabled tools
  const categoriesWithTools = categories.filter(category => {
    // Check if this category has any enabled tools
    return enabledTools.some(tool => tool.category === category.id);
  });
  
  // Then apply search filter if needed
  const filteredCategories = searchQuery
    ? categoriesWithTools.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categoriesWithTools;

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
              className={`icon-pane-item ${activePane === 'favorites' ? 'active' : ''}`}
              onClick={() => {
                setActivePane('favorites');
                setSelectedCategory(null);
                setSearchQuery('');
                setIsSidebarCollapsed(false);
              }}
              title={`Favorites ${favorites.length > 0 ? `(${favorites.length})` : ''}`}
              data-testid="icon-favorites"
            >
              <Star className="w-5 h-5" fill={favorites.length > 0 ? 'currentColor' : 'none'} />
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
                      : activePane === 'tools'
                      ? `Search ${enabledTools.length} tools...`
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
                    const toolCount = tools.filter(t => t.enabled && t.category === category.id).length;
                    return (
                      <button
                        key={category.id}
                        className="pane-item relative"
                        data-category={category.id}
                        onClick={() => handleCategorySelect(category)}
                        data-testid={`pane-category-${category.id}`}
                      >
                        {toolCount > 0 && (
                          <div className="absolute top-2 right-2 bg-gray-500/20 text-gray-400 text-[10px] font-normal rounded-full w-5 h-5 flex items-center justify-center z-10">
                            {toolCount}
                          </div>
                        )}
                        <div className="pane-item-icon">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="pane-item-content">
                          <div className="pane-item-name">{category.name}</div>
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
                  {filteredFavorites.length > 0 ? (
                    filteredFavorites.map((tool) => {
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
                    })
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                      <Star className="w-16 h-16 text-gray-600 mb-4" />
                      <p className="text-gray-400 mb-2">
                        {searchQuery ? 'No favorites match your search' : 'No favorites yet'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {searchQuery ? 'Try a different search term' : 'Click the star icon on any tool to add it to favorites'}
                      </p>
                    </div>
                  )}
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
                  hasUnsavedChanges={unsavedTabs.has(tab.tabId)}
                />
              ))}
            </div>
          )}

          {/* Tool Content */}
          <div className="tool-content">
            {tabs.map((tab) => (
              <div
                key={tab.tabId}
                style={{ display: activeTab === tab.tabId ? 'block' : 'none', height: '100%' }}
              >
                {/* Use ToolWrapper for tools registered in the tool registry */}
                {isToolRegistered(tab.id) ? (
                  <ToolWrapper
                    toolId={tab.id}
                    tab={tab}
                    tabs={tabs}
                    setTabs={setTabs}
                    editorTheme={editorTheme}
                  />
                ) : (
                  /* Fallback for legacy tools not yet migrated */
                  <>
                    {tab.id === 'json-validator' && (
                      <div className="p-8 text-center text-gray-400">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>JSON Validator - Coming Soon</p>
                      </div>
                    )}
                    {(tab.id === 'api-tester' || tab.id === 'rest-api-tester') && (
                      <RestApiTester tab={tab} tabs={tabs} setTabs={setTabs} />
                    )}
                    {tab.id === 'grpc-tester' && (
                      <GrpcTester tab={tab} tabs={tabs} setTabs={setTabs} />
                    )}
                    {tab.id === 'ui-recorder' && (
                      <UiRecorder tab={tab} tabs={tabs} setTabs={setTabs} />
                    )}
                    {/* Default fallback for unimplemented tools */}
                    {!['json-validator', 'api-tester', 'rest-api-tester', 'grpc-tester', 'ui-recorder'].includes(tab.id) && (
                      <div className="p-8 text-center text-gray-400">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>{tab.name} - Coming Soon</p>
                        <p className="text-xs mt-2">This tool hasn't been implemented yet</p>
                      </div>
                    )}
                  </>
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
          onClose={(saved) => {
            // Only update if actually saved (not cancelled)
            if (saved === true && tabToSave) {
              // Clear unsaved flag for this tab
              setUnsavedTabs(prev => {
                const newSet = new Set(prev);
                newSet.delete(tabToSave.tabId);
                return newSet;
              });
              // Update tab's originalData and savedItemName
              setTabs(tabs.map(t => 
                t.tabId === tabToSave.tabId 
                  ? { 
                      ...t, 
                      originalData: JSON.stringify(t.data || {}),
                      savedItemName: t.customName || t.name
                    }
                  : t
              ));
            }
            // Always close dialog
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
        tabs={tabs}
        setTabs={setTabs}
        favorites={favorites}
        setFavorites={setFavorites}
      />
    </div>
  );
}

function TabItem({ tab, isActive, onActivate, onClose, onRename, onDuplicate, onCloseOthers, onCloseToRight, onSave, hasUnsavedChanges }) {
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
            {hasUnsavedChanges && tab.savedItemId && <span style={{ color: 'var(--accent-primary)', marginRight: '4px' }}>*</span>}
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
  
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(tool.id);
  };
  
  return (
    <button
      className={`pane-item ${isLocked ? 'opacity-75' : ''} relative group`}
      data-category={tool.category}
      onClick={() => onOpen(tool)}
      data-testid={`tool-pane-item-${tool.id}`}
      title={tool.description || tool.name}
    >
      <div className="pane-item-icon">
        <Icon className="w-6 h-6" />
      </div>
      <div className="pane-item-content">
        <div className="pane-item-name flex items-center justify-center gap-1">
          <span>{tool.name}</span>
          {isPremium && (
            <Crown className="w-3 h-3 text-amber-500" />
          )}
          {isLocked && (
            <Lock className="w-3 h-3 text-gray-500" />
          )}
        </div>
      </div>
      <button
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors z-10"
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        data-testid={`favorite-btn-${tool.id}`}
      >
        <Star 
          className={`w-3.5 h-3.5 transition-all ${
            isFavorite 
              ? 'text-amber-500' 
              : 'text-gray-400 group-hover:text-amber-400'
          }`}
          fill={isFavorite ? 'currentColor' : 'none'}
        />
      </button>
    </button>
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