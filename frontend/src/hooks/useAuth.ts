import { useState, useEffect } from 'react';
import { authApi, type UserInfo } from '../services/auth';

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('smarttodo_token');
    if (savedToken) {
      // Why: Validate current session by calling authApi.getMe(). Clear token if it has expired.
      authApi.getMe()
        .then(userData => {
          setToken(savedToken);
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('smarttodo_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Why: Authenticate with username and password, save JWT token and set active user state.
  const handleLogin = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    localStorage.setItem('smarttodo_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  // Why: Sign up a new user, return success message and user needs to sign in subsequently.
  const handleRegister = async (username: string, password: string) => {
    await authApi.register(username, password);
  };

  const logout = () => {
    localStorage.removeItem('smarttodo_token');
    setToken(null);
    setUser(null);
  };

  return {
    isAuthenticated: !!token,
    token,
    user,
    loading,
    login: handleLogin,
    register: handleRegister,
    logout,
    setUser,
  };
};
