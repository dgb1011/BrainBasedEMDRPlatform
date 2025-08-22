import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '@/lib/supabase';
import { useLocation } from 'wouter';
import { clearQueryCache } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'consultant' | 'admin';
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Deprecated: fetching profile from client-side Supabase requires anon envs.
  // We derive user directly from our server's /api/auth/me response.

  const refreshUser = async () => {
    try {
      const { user: authUser, error } = await auth.getCurrentUser();
      
      if (error || !authUser) {
        setUser(null);
        return;
      }
      // authUser already contains firstName/lastName/role from server
      setUser({
        id: authUser.id,
        email: authUser.email,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        role: authUser.role,
        profileImageUrl: authUser.profileImageUrl,
      });
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔄 Starting signIn process...', { email });
      
      // Clear previous user state and query cache only
      console.log('🧹 Clearing previous user state...');
      setUser(null);
      clearQueryCache(); // Clear React Query cache
      
      const { data, error } = await auth.signIn(email, password);
      console.log('📡 Login response:', { data: data ? 'received' : 'null', error });
      
      if (error) {
        console.log('❌ Login error:', error);
        return { error: error.message };
      }

      if (data.user) {
        console.log('✅ Setting fresh user from login:', data.user);
        // Set fresh user data
        const freshUser = {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
        };
        setUser(freshUser);
        
        console.log('🧭 Navigating to dashboard with fresh user data...');
        // Force page reload to ensure clean state
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }

      return {};
    } catch (error) {
      console.log('💥 Login error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log('🔄 Starting signUp process...', { email, userData });
      
      // Clear previous user state and query cache only
      console.log('🧹 Clearing previous user state...');
      setUser(null);
      clearQueryCache(); // Clear React Query cache
      
      const { data, error } = await auth.signUp(email, password, userData);
      console.log('📡 Registration response:', { data, error });
      
      if (error) {
        console.log('❌ Registration error:', error);
        return { error: error.message };
      }

      if (data.user) {
        console.log('✅ Setting fresh user from registration:', data.user);
        // Set fresh user data
        const freshUser = {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
        };
        setUser(freshUser);
        
        console.log('🧭 Navigating to dashboard with fresh user data...');
        // Force page reload to ensure clean state
        setTimeout(() => {
          window.location.href = '/';
        }, 1500); // Longer delay for registration to show success message
      }

      return {};
    } catch (error) {
      console.log('💥 Registration error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setLocation('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if logout fails on server, clear local state
      setUser(null);
      setLocation('/');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🚀 Initializing authentication...');
      
      try {
        // Check if we have a token in localStorage
        const token = localStorage.getItem('token');
        console.log('🔍 Token in localStorage:', token ? `${token.substring(0, 20)}...` : 'None');
        
        if (token) {
          // If we have a token, try to get current user
          console.log('🔄 Refreshing user with existing token...');
          await refreshUser();
        } else {
          console.log('❌ No token found, user not authenticated');
          setUser(null);
        }
      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        // If there's an error with the token, remove only the invalid token
        console.log('🧹 Removing invalid token...');
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
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