import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  useEffect(() => {
    if (token) {
      fetchUserInfo();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
      setOrganization(response.data.organization);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('auth_token', access_token);
    setToken(access_token);
    setUser(userData);
    
    // Fetch full user info including organization
    await fetchUserInfo();
    
    return userData;
  };

  const register = async (email, password) => {
    const response = await axios.post(`${API}/auth/register`, { email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('auth_token', access_token);
    setToken(access_token);
    setUser(userData);
    
    await fetchUserInfo();
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
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
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin' || user?.role === 'org_admin',
        isPremium: organization?.license_tier === 'premium'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
