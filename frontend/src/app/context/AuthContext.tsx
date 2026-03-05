import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  signup as apiSignup,
} from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateLastActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check for existing session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const storedLastActivity = localStorage.getItem('lastActivity');
        if (storedLastActivity) {
          const timeSinceLastActivity = Date.now() - parseInt(storedLastActivity, 10);
          if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
            await apiLogout().catch(() => {});
            localStorage.removeItem('lastActivity');
            setUser(null);
            setIsLoading(false);
            return;
          }
        }

        const currentUser = await apiMe();
        setUser(currentUser);
        const now = Date.now();
        setLastActivity(now);
        localStorage.setItem('lastActivity', now.toString());
      } catch {
        setUser(null);
        localStorage.removeItem('lastActivity');
      } finally {
        setIsLoading(false);
      }
    };

    void initSession();
  }, []);

  // Monitor inactivity
  useEffect(() => {
    if (!user) return;

    const checkInactivity = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        void logout();
        alert('Your session has expired due to inactivity. Please log in again.');
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInactivity);
  }, [user, lastActivity]);

  // Update last activity on user interaction
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      localStorage.setItem('lastActivity', now.toString());
    };

    // Listen for user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [user]);

  const updateLastActivity = () => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem('lastActivity', now.toString());
  };

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      await apiLogin(username, password);
      const currentUser = await apiMe();
      setUser(currentUser);
      const now = Date.now();
      localStorage.setItem('lastActivity', now.toString());
      setLastActivity(now);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      return { success: false, message };
    }
  };

  const signup = async (
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      await apiSignup(username, email, password);
      await apiLogin(username, password);
      const currentUser = await apiMe();
      setUser(currentUser);
      const now = Date.now();
      localStorage.setItem('lastActivity', now.toString());
      setLastActivity(now);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    await apiLogout().catch(() => {});
    setUser(null);
    localStorage.removeItem('lastActivity');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading, updateLastActivity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
