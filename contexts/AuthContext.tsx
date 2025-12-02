
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ViewState } from '../types';
import { db } from '../services/db';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (view: ViewState | string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    const storedPerms = localStorage.getItem('app_permissions');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        if (storedPerms) {
            setPermissions(JSON.parse(storedPerms));
        }
      } catch (e) {
        localStorage.removeItem('app_user');
        localStorage.removeItem('app_permissions');
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const result = await db.authenticate(username, password);
      if (result) {
        const { user, permissions } = result;
        setUser(user);
        setPermissions(permissions);
        localStorage.setItem('app_user', JSON.stringify(user));
        localStorage.setItem('app_permissions', JSON.stringify(permissions));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login error", e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setPermissions([]);
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_permissions');
    // window.location.reload(); // Optional: force refresh
  };

  const hasPermission = (viewId: string): boolean => {
    if (!user) return false;
    // Super admin override (usually implicit, but good to be safe for seed account)
    if (permissions.includes('ALL')) return true;
    
    return permissions.includes(viewId);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
