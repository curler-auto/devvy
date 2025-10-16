import React, { useState, useEffect } from 'react';
import { X, Palette, Check, Settings as SettingsIcon, Bell, Shield } from 'lucide-react';
import { THEMES, applyTheme, getStoredTheme } from '../themes';

const SettingsModal = ({ isOpen, onClose }) => {
  const [selectedTheme, setSelectedTheme] = useState(getStoredTheme());
  const [activeTab, setActiveTab] = useState('appearance');

  useEffect(() => {
    setSelectedTheme(getStoredTheme());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleThemeChange = (themeId) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
  };

  const darkThemes = Object.values(THEMES).filter(t => t.type === 'dark');
  const lightThemes = Object.values(THEMES).filter(t => t.type === 'light');

  const tabs = [
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
            <p className="text-sm text-[var(--text-tertiary)]">Customize your Devvy Studio experience</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs and Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-[var(--border-primary)] p-4 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === tab.id
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Theme</h3>
                  <p className="text-sm text-[var(--text-tertiary)]">Choose your preferred color theme</p>
                </div>

                {/* Dark Themes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Dark Themes</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {darkThemes.map((theme) => (
                      <ThemeOption
                        key={theme.id}
                        theme={theme}
                        isSelected={selectedTheme === theme.id}
                        onSelect={() => handleThemeChange(theme.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Light Themes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Light Themes</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {lightThemes.map((theme) => (
                      <ThemeOption
                        key={theme.id}
                        theme={theme}
                        isSelected={selectedTheme === theme.id}
                        onSelect={() => handleThemeChange(theme.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">General Settings</h3>
                  <p className="text-sm text-[var(--text-tertiary)]">Configure general application settings</p>
                </div>
                <div className="text-sm text-[var(--text-tertiary)] p-8 text-center">
                  Coming soon...
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Notifications</h3>
                  <p className="text-sm text-[var(--text-tertiary)]">Manage notification preferences</p>
                </div>
                <div className="text-sm text-[var(--text-tertiary)] p-8 text-center">
                  Coming soon...
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Security & Privacy</h3>
                  <p className="text-sm text-[var(--text-tertiary)]">Manage security and privacy settings</p>
                </div>
                <div className="text-sm text-[var(--text-tertiary)] p-8 text-center">
                  Coming soon...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border-primary)]">
          <p className="text-xs text-[var(--text-tertiary)]">
            Settings are saved automatically
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const ThemeOption = ({ theme, isSelected, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={`
        relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all
        ${isSelected 
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' 
          : 'border-[var(--border-primary)] hover:border-[var(--border-focus)] bg-[var(--bg-tertiary)]'
        }
      `}
    >
      {/* Color Preview */}
      <div className="flex gap-1">
        <div 
          className="w-6 h-6 rounded border border-[var(--border-primary)]" 
          style={{ backgroundColor: theme.colors['--bg-primary'] }}
        />
        <div 
          className="w-6 h-6 rounded border border-[var(--border-primary)]" 
          style={{ backgroundColor: theme.colors['--bg-tertiary'] }}
        />
        <div 
          className="w-6 h-6 rounded border border-[var(--border-primary)]" 
          style={{ backgroundColor: theme.colors['--accent-primary'] }}
        />
      </div>

      {/* Theme Info */}
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-[var(--text-primary)]">{theme.name}</div>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
};

export default SettingsModal;
