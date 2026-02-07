import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Code, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { toast } from 'sonner';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        await register(email, password);
        toast.success('Account created successfully!');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-screen" data-testid="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <Code className="w-12 h-12 text-emerald-500" />
          <h1 className="text-3xl font-bold mt-4">DevTools Suite</h1>
          <p className="text-gray-400 mt-2">Professional Developer Productivity Platform</p>
        </div>

        <Card className="auth-card">
          <div className="auth-card-header">
            <h2 className="text-xl font-semibold">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {isLogin ? 'Welcome back to DevTools Suite' : 'Get started with free tier'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                data-testid="email-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="auth-input"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full auth-button"
              disabled={isLoading}
              data-testid="submit-button"
            >
              {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="auth-footer">
            <span className="text-sm text-gray-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="auth-switch-button"
              data-testid="switch-auth-mode"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          {!isLogin && (
            <div className="auth-note">
              <p className="text-xs text-gray-500">
                Free tier includes access to all basic tools. Upgrade to Premium for advanced features.
              </p>
            </div>
          )}
        </Card>

        <div className="auth-demo-credentials">
          <p className="text-xs text-gray-500">Demo Admin: admin@devtools.com / admin123</p>
        </div>
      </div>
    </div>
  );
}
