import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsModal from './SettingsModal';

// Mock dependencies
jest.mock('lucide-react', () => ({
  X: () => <svg data-testid="icon-x" />,
  Palette: () => <svg />,
  Check: () => <svg />,
  Settings: () => <svg />,
  Bell: () => <svg />,
  Shield: () => <svg />,
  Database: () => <svg />,
  Server: () => <svg />,
  Plus: () => <svg />,
  Trash2: () => <svg data-testid="icon-trash" />,
  Edit2: () => <svg data-testid="icon-edit" />,
  Save: () => <svg />,
}));

jest.mock('../themes', () => ({
  THEMES: {
    dark: { id: 'dark', type: 'dark', name: 'Dark', colors: {} }
  },
  getStoredTheme: () => 'dark',
  applyTheme: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('./DataExportImport', () => () => <div>DataExportImport</div>);

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    clear: function() {
      store = {};
    },
    removeItem: function(key) {
      delete store[key];
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SettingsModal Accessibility', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    tabs: [],
    setTabs: jest.fn(),
    favorites: [],
    setFavorites: jest.fn(),
  };

  test('close button should have accessible name', () => {
    render(<SettingsModal {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /close settings/i });
    expect(closeButton).toBeInTheDocument();
  });

  test('environment config buttons should have dynamic accessible names', () => {
    render(<SettingsModal {...defaultProps} />);

    // Switch to Environment tab
    const envTab = screen.getByText(/Environment/i);
    fireEvent.click(envTab);

    // Switch to Git Repositories
    const gitTab = screen.getByText(/Git Repositories/i);
    fireEvent.click(gitTab);

    // Add a new item
    const addButton = screen.getByText(/Add New/i);
    fireEvent.click(addButton);

    // Fill required fields
    const nameInput = screen.getByPlaceholderText('Name');
    fireEvent.change(nameInput, { target: { value: 'Test Repo' } });

    // Save the item
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Verify dynamic labels
    const editButton = screen.getByRole('button', { name: 'Edit Test Repo' });
    expect(editButton).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete Test Repo' });
    expect(deleteButton).toBeInTheDocument();
  });

  test('theme options should have accessible names and state', () => {
    render(<SettingsModal {...defaultProps} />);
    // Default is appearance tab
    const darkThemeButton = screen.getByRole('button', { name: /Select Dark theme/i });
    expect(darkThemeButton).toBeInTheDocument();
    expect(darkThemeButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('environment config inputs should have accessible names', () => {
    render(<SettingsModal {...defaultProps} />);

    // Switch to Environment tab
    const envTab = screen.getByText(/Environment/i);
    fireEvent.click(envTab);

    // Switch to Git Repositories
    const gitTab = screen.getByText(/Git Repositories/i);
    fireEvent.click(gitTab);

    // Add a new item
    const addButton = screen.getByText(/Add New/i);
    fireEvent.click(addButton);

    // Check for labelled inputs
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    expect(nameInput).toBeInTheDocument();

    const ownerInput = screen.getByRole('textbox', { name: 'Owner' });
    expect(ownerInput).toBeInTheDocument();
  });

  test('should close on Escape key press', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('should have dialog role and accessibility attributes', () => {
    render(<SettingsModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'settings-modal-title');

    // Check if the title has the corresponding ID
    const title = screen.getByText('Settings');
    expect(title).toHaveAttribute('id', 'settings-modal-title');
  });

  test('tabs should have correct ARIA roles and states', () => {
    render(<SettingsModal {...defaultProps} />);

    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);

    // "Appearance" is the default active tab
    const appearanceTab = tabs.find(tab => tab.textContent.includes('Appearance'));
    expect(appearanceTab).toHaveAttribute('aria-selected', 'true');
    expect(appearanceTab).toHaveAttribute('aria-controls', 'panel-appearance');
    expect(appearanceTab).toHaveAttribute('id', 'tab-appearance');

    // Switch tab and check selection state
    const environmentTab = tabs.find(tab => tab.textContent.includes('Environment'));
    expect(environmentTab).toHaveAttribute('aria-selected', 'false');
    expect(environmentTab).toHaveAttribute('aria-controls', 'panel-environment');
    expect(environmentTab).toHaveAttribute('id', 'tab-environment');

    fireEvent.click(environmentTab);
    expect(environmentTab).toHaveAttribute('aria-selected', 'true');
    expect(appearanceTab).toHaveAttribute('aria-selected', 'false');
  });

  test('panels should have correct role and aria-labelledby', () => {
    render(<SettingsModal {...defaultProps} />);

    // Check Appearance panel (default)
    const appearancePanel = screen.getByRole('tabpanel');
    expect(appearancePanel).toBeInTheDocument();
    expect(appearancePanel).toHaveAttribute('id', 'panel-appearance');
    expect(appearancePanel).toHaveAttribute('aria-labelledby', 'tab-appearance');

    // Switch to Environment tab
    const environmentTab = screen.getByText(/Environment/i);
    fireEvent.click(environmentTab);

    // Check Environment panel
    const environmentPanel = screen.getByRole('tabpanel');
    expect(environmentPanel).toBeInTheDocument();
    expect(environmentPanel).toHaveAttribute('id', 'panel-environment');
    expect(environmentPanel).toHaveAttribute('aria-labelledby', 'tab-environment');
  });
});
