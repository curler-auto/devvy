import { applyTheme, getStoredTheme } from './themes';

describe('theme system', () => {
  beforeEach(() => {
    // Clear localStorage and mocks
    localStorage.clear();
    jest.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('applyTheme dispatches themeChanged event', () => {
    applyTheme('light-default');

    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));

    const event = window.dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe('themeChanged');
    expect(event.detail).toEqual({ themeId: 'light-default' });

    expect(localStorage.getItem('devvy-theme')).toBe('light-default');
  });
});
