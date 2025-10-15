import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Desktop version - provide fake user data to bypass auth
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading then provide fake user
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, []);

  // Fake user data for desktop version
  const user = {
    id: 'desktop-user',
    email: 'desktop@devtools.local',
    name: 'Desktop User',
    role: 'user',
    license_type: 'basic'
  };

  const organization = {
    id: 'desktop-org',
    name: 'Desktop Organization',
    license_tier: 'basic'
  };

  const token = 'desktop-token';

  const login = async () => {
    // No-op for desktop
    return user;
  };

  const register = async () => {
    // No-op for desktop
    return user;
  };

  const logout = () => {
    // No-op for desktop
  };

  const getAuthHeader = () => {
    return {}; // No auth headers needed for desktop
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isLoading,
        login,
        register,
        logout,
        getAuthHeader,
        isAuthenticated: true, // Always authenticated in desktop
        isAdmin: false,
        isPremium: false // Basic license by default
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
