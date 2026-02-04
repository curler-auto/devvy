import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TabItem from './components/TabItem';
import ToolPaneItem from './components/ToolPaneItem';
import { FileJson } from 'lucide-react';

// Mock console.error to avoid jsdom noise if any (optional)
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('Accessibility Tests', () => {
  describe('TabItem', () => {
    const mockTab = {
      tabId: 'tab-1',
      name: 'Test Tab',
      customName: null,
      icon: FileJson
    };
    const mockOnClose = jest.fn();
    const mockOnActivate = jest.fn();
    // other props to avoid warnings
    const noop = () => {};

    it('close button has correct aria-label and title', () => {
      render(
        <TabItem
          tab={mockTab}
          isActive={true}
          onClose={mockOnClose}
          onActivate={mockOnActivate}
          onRename={noop}
          onDuplicate={noop}
          onCloseOthers={noop}
          onCloseToRight={noop}
        />
      );

      const closeButton = screen.getByTestId('close-tab-tab-1');
      expect(closeButton).toHaveAttribute('aria-label', 'Close Test Tab');
      expect(closeButton).toHaveAttribute('title', 'Close tab');
    });

    it('uses custom name in aria-label', () => {
      const customTab = { ...mockTab, customName: 'Custom Name' };
      render(
        <TabItem
          tab={customTab}
          isActive={true}
          onClose={mockOnClose}
          onActivate={mockOnActivate}
          onRename={noop}
          onDuplicate={noop}
          onCloseOthers={noop}
          onCloseToRight={noop}
        />
      );

      const closeButton = screen.getByTestId('close-tab-tab-1');
      expect(closeButton).toHaveAttribute('aria-label', 'Close Custom Name');
    });
  });

  describe('ToolPaneItem', () => {
    const mockTool = {
      id: 'tool-1',
      name: 'Test Tool',
      description: 'A test tool',
      icon: FileJson,
      category: 'test-category'
    };
    const mockOnOpen = jest.fn();
    const mockOnToggleFavorite = jest.fn();

    it('favorite button has correct aria-label when not favorite', () => {
      render(
        <ToolPaneItem
          tool={mockTool}
          onOpen={mockOnOpen}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const favButton = screen.getByTestId('favorite-btn-tool-1');
      expect(favButton).toHaveAttribute('aria-label', 'Add to favorites');
    });

    it('favorite button has correct aria-label when favorite', () => {
      render(
        <ToolPaneItem
          tool={mockTool}
          onOpen={mockOnOpen}
          isFavorite={true}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const favButton = screen.getByTestId('favorite-btn-tool-1');
      expect(favButton).toHaveAttribute('aria-label', 'Remove from favorites');
    });
  });
});
