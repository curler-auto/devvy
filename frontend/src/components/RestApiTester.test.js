import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RestApiTester from './RestApiTester';

// Mock dependencies
jest.mock('lucide-react', () => ({
  Plus: () => <svg data-testid="icon-plus" />,
  X: () => <svg data-testid="icon-x" />,
  Send: () => <svg data-testid="icon-send" />,
  Trash2: () => <svg data-testid="icon-trash" />,
  Copy: () => <svg data-testid="icon-copy" />,
  Check: () => <svg data-testid="icon-check" />,
}));

jest.mock('@monaco-editor/react', () => {
  return function MockEditor(props) {
    return (
      <textarea
        data-testid="monaco-editor"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    );
  };
});

jest.mock('axios');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock UI components if necessary, but we can try using the real ones first
// if they are simple enough. Usually button/input/tabs are fine.

describe('RestApiTester Accessibility', () => {
  const defaultProps = {
    tab: {
      tabId: '1',
      data: {
        method: 'GET',
        url: 'https://api.example.com',
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        params: [{ key: 'page', value: '1', enabled: true }],
        response: {
            status: 200,
            statusText: 'OK',
            data: { message: 'success' },
            headers: {},
            time: 100,
            size: 50
        }
      }
    },
    tabs: [],
    setTabs: jest.fn(),
  };

  test('interactive elements should have accessible names', () => {
    render(<RestApiTester {...defaultProps} />);

    // Check Params tab content (default)
    const paramCheckbox = screen.getByRole('checkbox', { name: /Enable parameter/i });
    expect(paramCheckbox).toBeInTheDocument();

    const deleteParamButton = screen.getByRole('button', { name: /Remove parameter/i });
    expect(deleteParamButton).toBeInTheDocument();
  });

  test('headers tab interactive elements should have accessible names', async () => {
    const user = userEvent.setup();
    render(<RestApiTester {...defaultProps} />);

    // Switch to Headers tab (request section)
    const headersTabs = screen.getAllByText('Headers');
    await user.click(headersTabs[0]);

    // Wait for the tab to switch
    const headerCheckbox = await screen.findByRole('checkbox', { name: /Enable header/i });
    expect(headerCheckbox).toBeInTheDocument();

    const deleteHeaderButton = screen.getByRole('button', { name: /Remove header/i });
    expect(deleteHeaderButton).toBeInTheDocument();
  });

  test('copy response button should have accessible name', () => {
      render(<RestApiTester {...defaultProps} />);

      // The response section is rendered because we passed response data in props
      const copyButton = screen.getByRole('button', { name: /Copy response/i });
      expect(copyButton).toBeInTheDocument();
  });
});
