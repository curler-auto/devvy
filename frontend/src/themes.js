/**
 * Theme Configuration
 * Professional themes for Devvy Studio
 */

export const THEMES = {
  'dark-default': {
    id: 'dark-default',
    name: 'Dark (Default)',
    type: 'dark',
    colors: {
      // Background colors
      '--bg-primary': '#0a0a0a',
      '--bg-secondary': '#0f0f0f',
      '--bg-tertiary': '#1a1a1a',
      '--bg-elevated': '#1f1f1f',
      '--bg-hover': '#2a2a2a',
      
      // Text colors
      '--text-primary': '#e5e5e5',
      '--text-secondary': '#a3a3a3',
      '--text-tertiary': '#737373',
      '--text-muted': '#525252',
      
      // Border colors
      '--border-primary': '#2a2a2a',
      '--border-secondary': '#1f1f1f',
      '--border-focus': '#10b981',
      
      // Accent colors
      '--accent-primary': '#10b981',
      '--accent-secondary': '#059669',
      '--accent-hover': '#047857',
      
      // Status colors
      '--status-success': '#10b981',
      '--status-error': '#ef4444',
      '--status-warning': '#f59e0b',
      '--status-info': '#3b82f6',
    }
  },
  
  'dark-midnight': {
    id: 'dark-midnight',
    name: 'Midnight Blue',
    type: 'dark',
    colors: {
      '--bg-primary': '#0c1222',
      '--bg-secondary': '#111827',
      '--bg-tertiary': '#1e293b',
      '--bg-elevated': '#334155',
      '--bg-hover': '#475569',
      
      '--text-primary': '#f1f5f9',
      '--text-secondary': '#cbd5e1',
      '--text-tertiary': '#94a3b8',
      '--text-muted': '#64748b',
      
      '--border-primary': '#334155',
      '--border-secondary': '#1e293b',
      '--border-focus': '#3b82f6',
      
      '--accent-primary': '#3b82f6',
      '--accent-secondary': '#2563eb',
      '--accent-hover': '#1d4ed8',
      
      '--status-success': '#10b981',
      '--status-error': '#ef4444',
      '--status-warning': '#f59e0b',
      '--status-info': '#3b82f6',
    }
  },
  
  'dark-purple': {
    id: 'dark-purple',
    name: 'Purple Haze',
    type: 'dark',
    colors: {
      '--bg-primary': '#0f0a1a',
      '--bg-secondary': '#1a0f2e',
      '--bg-tertiary': '#2d1b4e',
      '--bg-elevated': '#3d2b5f',
      '--bg-hover': '#4d3b6f',
      
      '--text-primary': '#f3e8ff',
      '--text-secondary': '#d8b4fe',
      '--text-tertiary': '#c084fc',
      '--text-muted': '#a855f7',
      
      '--border-primary': '#3d2b5f',
      '--border-secondary': '#2d1b4e',
      '--border-focus': '#a855f7',
      
      '--accent-primary': '#a855f7',
      '--accent-secondary': '#9333ea',
      '--accent-hover': '#7e22ce',
      
      '--status-success': '#10b981',
      '--status-error': '#ef4444',
      '--status-warning': '#f59e0b',
      '--status-info': '#a855f7',
    }
  },
  
  'light-default': {
    id: 'light-default',
    name: 'Light (Clean)',
    type: 'light',
    colors: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f9fafb',
      '--bg-tertiary': '#f3f4f6',
      '--bg-elevated': '#e5e7eb',
      '--bg-hover': '#d1d5db',
      
      '--text-primary': '#111827',
      '--text-secondary': '#374151',
      '--text-tertiary': '#6b7280',
      '--text-muted': '#9ca3af',
      
      '--border-primary': '#e5e7eb',
      '--border-secondary': '#d1d5db',
      '--border-focus': '#10b981',
      
      '--accent-primary': '#10b981',
      '--accent-secondary': '#059669',
      '--accent-hover': '#047857',
      
      '--status-success': '#10b981',
      '--status-error': '#dc2626',
      '--status-warning': '#d97706',
      '--status-info': '#2563eb',
    }
  },
  
  'light-warm': {
    id: 'light-warm',
    name: 'Light (Warm)',
    type: 'light',
    colors: {
      '--bg-primary': '#fefcf9',
      '--bg-secondary': '#faf8f5',
      '--bg-tertiary': '#f5f3f0',
      '--bg-elevated': '#e8e6e3',
      '--bg-hover': '#dbd9d6',
      
      '--text-primary': '#1c1917',
      '--text-secondary': '#44403c',
      '--text-tertiary': '#78716c',
      '--text-muted': '#a8a29e',
      
      '--border-primary': '#e7e5e4',
      '--border-secondary': '#d6d3d1',
      '--border-focus': '#ea580c',
      
      '--accent-primary': '#ea580c',
      '--accent-secondary': '#c2410c',
      '--accent-hover': '#9a3412',
      
      '--status-success': '#16a34a',
      '--status-error': '#dc2626',
      '--status-warning': '#d97706',
      '--status-info': '#2563eb',
    }
  },
  
  'light-blue': {
    id: 'light-blue',
    name: 'Light (Sky)',
    type: 'light',
    colors: {
      '--bg-primary': '#f8fafc',
      '--bg-secondary': '#f1f5f9',
      '--bg-tertiary': '#e2e8f0',
      '--bg-elevated': '#cbd5e1',
      '--bg-hover': '#94a3b8',
      
      '--text-primary': '#0f172a',
      '--text-secondary': '#1e293b',
      '--text-tertiary': '#475569',
      '--text-muted': '#64748b',
      
      '--border-primary': '#e2e8f0',
      '--border-secondary': '#cbd5e1',
      '--border-focus': '#0ea5e9',
      
      '--accent-primary': '#0ea5e9',
      '--accent-secondary': '#0284c7',
      '--accent-hover': '#0369a1',
      
      '--status-success': '#10b981',
      '--status-error': '#dc2626',
      '--status-warning': '#d97706',
      '--status-info': '#0ea5e9',
    }
  }
};

// Monaco Editor theme mapping
export const getMonacoTheme = (themeId) => {
  const theme = THEMES[themeId];
  if (!theme) return 'vs-dark';
  
  // Map our themes to Monaco's built-in themes
  if (theme.type === 'light') {
    return 'vs'; // Monaco's light theme
  } else {
    return 'vs-dark'; // Monaco's dark theme
  }
};

export const applyTheme = (themeId) => {
  const theme = THEMES[themeId];
  if (!theme) return;
  
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Store theme preference
  localStorage.setItem('devvy-theme', themeId);
};

export const getStoredTheme = () => {
  return localStorage.getItem('devvy-theme') || 'dark-default';
};
