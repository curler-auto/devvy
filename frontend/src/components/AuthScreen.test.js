import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthScreen from './AuthScreen';
import { useAuth } from '@/AuthContext';

// Mock dependencies
jest.mock('@/AuthContext');
jest.mock('lucide-react', () => ({
  Code: () => <div data-testid="icon-code" />,
  Lock: () => <div data-testid="icon-lock" />,
  Mail: () => <div data-testid="icon-mail" />,
}));
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock UI components if necessary, but standard inputs should be fine
// Since we are testing DOM interaction, we want real inputs

describe('AuthScreen Accessibility', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      login: jest.fn(),
      register: jest.fn(),
    });
  });

  test('clicking email label focuses email input', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    // Use accessible query to find label, but since it's not associated yet,
    // we might need to find by text.
    // Ideally getByLabelText should fail if not associated.

    // Let's try to find the label by text
    const emailLabel = screen.getByText(/Email Address/i);
    const emailInput = screen.getByTestId('email-input');

    await user.click(emailLabel);

    expect(emailInput).toHaveFocus();
  });

  test('clicking password label focuses password input', async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    const passwordLabel = screen.getByText(/Password/i);
    const passwordInput = screen.getByTestId('password-input');

    await user.click(passwordLabel);

    expect(passwordInput).toHaveFocus();
  });
});
