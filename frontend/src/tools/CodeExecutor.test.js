import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CodeExecutor from './CodeExecutor';

// Mock dependencies
jest.mock('axios');
jest.mock('@monaco-editor/react', () => {
  return function MockEditor(props) {
    return <div data-testid="monaco-editor" data-value={props.value} onChange={(e) => props.onChange(e.target.value)}>Mock Editor</div>;
  };
});
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('CodeExecutor Accessibility', () => {
  const mockTab = { data: {} };
  const mockSetTabs = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('interactive elements have accessible names', () => {
    render(
      <CodeExecutor
        tab={mockTab}
        tabs={[]}
        setTabs={mockSetTabs}
      />
    );

    // This checks for the "Select Environment" dropdown
    // Currently likely to fail because it lacks a label
    expect(screen.getByRole('combobox', { name: /select execution environment/i })).toBeInTheDocument();

    // This checks for the "Select Language" dropdown (inferred name or label)
    // Currently likely to fail
    expect(screen.getByRole('combobox', { name: /select programming language/i })).toBeInTheDocument();

    // Check for stdin textarea
    expect(screen.getByRole('textbox', { name: /standard input/i })).toBeInTheDocument();

    // Check for terminal input
    expect(screen.getByRole('textbox', { name: /terminal command/i })).toBeInTheDocument();
  });

  test('icon-only buttons have accessible names', () => {
    // We need some output to enable the output buttons
    // Since we can't easily force state without a real execution or inspecting internal state,
    // we might need to rely on the fact that buttons exist but might be disabled.
    // However, disabled buttons are still queryable by accessible name.

    // But wait, the component renders buttons like this:
    // <Button disabled={!output} ...>

    // We can simulate output by mocking the axios response if we were running it,
    // but for unit testing React components, we can't easily set internal state `output` from outside.
    // BUT, we can inspect if the buttons are present in the DOM.

    // Actually, I can render the component. The buttons are always rendered, just disabled.

    render(
      <CodeExecutor
        tab={mockTab}
        tabs={[]}
        setTabs={mockSetTabs}
      />
    );

    // Copy Output button
    expect(screen.getByRole('button', { name: /copy output/i })).toBeInTheDocument();

    // Download Output button
    expect(screen.getByRole('button', { name: /download output/i })).toBeInTheDocument();

    // Clear Output button
    expect(screen.getByRole('button', { name: /clear output/i })).toBeInTheDocument();

    // Clear Terminal button
    expect(screen.getByRole('button', { name: /clear terminal/i })).toBeInTheDocument();
  });
});
