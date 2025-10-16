import React, { useState, useEffect } from 'react';
import { X, Palette, Check } from 'lucide-react';
import { THEMES, applyTheme, getStoredTheme } from '../themes';

const SettingsModal = ({ isOpen, onClose }) => {
  const [selectedTheme, setSelectedTheme] = useState(getStoredTheme());

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
              <p className="text-sm text-[var(--text-tertiary)]">Customize your Devvy Studio experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Theme Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Appearance</h3>
              <p className="text-sm text-[var(--text-tertiary)]">Choose your preferred color theme</p>
            </div>

            {/* Dark Themes */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">Dark Themes</h4>
              <div className="grid grid-cols-1 gap-3">
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
            <div className="space-y-3 mt-6">
              <h4 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">Light Themes</h4>
              <div className="grid grid-cols-1 gap-3">
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--border-primary)]">
          <p className="text-xs text-[var(--text-tertiary)]">
            Theme preferences are saved automatically
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
        relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all
        ${isSelected 
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' 
          : 'border-[var(--border-primary)] hover:border-[var(--border-focus)] bg-[var(--bg-tertiary)]'
        }
      `}
    >
      {/* Color Preview */}
      <div className="flex gap-1">
        <div 
          className="w-8 h-8 rounded border border-[var(--border-primary)]" 
          style={{ backgroundColor: theme.colors['--bg-primary'] }}
        />
        <div 
          className="w-8 h-8 rounded border border-[var(--border-primary)]" 
          style={{ backgroundColor: theme.colors['--bg-tertiary'] }}
        />
        <div 
          className="w-8 h-8 rounded border border-[var(--border-primary)]" 
          style={{ backgroundColor: theme.colors['--accent-primary'] }}
        />
      </div>

      {/* Theme Info */}
      <div className="flex-1 text-left">
        <div className="font-medium text-[var(--text-primary)]">{theme.name}</div>
        <div className="text-xs text-[var(--text-tertiary)] capitalize">{theme.type} theme</div>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </button>
  );
};

export default SettingsModal;
