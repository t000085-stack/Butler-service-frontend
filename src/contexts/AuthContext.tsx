import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import * as authApi from '../api/auth';
import { getToken, setToken, removeToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string, coreValues?: string[]) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token on mount
  useEffect(() => {
    async function loadToken() {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          setTokenState(storedToken);
          // Fetch user profile
          const userProfile = await authApi.getProfile();
          setUser(userProfile);
        }
      } catch (error) {
        // Token invalid or expired, clear it
        await removeToken();
        setTokenState(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadToken();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    await setToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
  }, []);

  const signUp = useCallback(async (
    username: string,
    email: string,
    password: string,
    coreValues?: string[]
  ) => {
    const response = await authApi.register({
      username,
      email,
      password,
      core_values: coreValues,
    });
    await setToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    await removeToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

