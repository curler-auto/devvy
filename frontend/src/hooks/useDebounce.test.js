import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import useDebounce from './useDebounce';

describe('useDebounce', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
    jest.useRealTimers();
  });

  it('should debounce value', () => {
    const callback = jest.fn();

    function TestComponent({ value, delay }) {
      const debouncedValue = useDebounce(value, delay);

      React.useEffect(() => {
        callback(debouncedValue);
      }, [debouncedValue]);

      return null;
    }

    // Initial render
    act(() => {
      root.render(<TestComponent value="initial" delay={500} />);
    });

    // Should result in initial value immediately (on mount)
    expect(callback).toHaveBeenLastCalledWith('initial');
    callback.mockClear();

    // Update value
    act(() => {
      root.render(<TestComponent value="updated" delay={500} />);
    });

    // Should not have updated yet
    expect(callback).not.toHaveBeenCalled();

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should have updated now
    expect(callback).toHaveBeenCalledWith('updated');
  });
});
