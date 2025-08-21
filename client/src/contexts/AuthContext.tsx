import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '@/lib/supabase';

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
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        return { error: error.message };
      }

      await refreshUser();

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await auth.signUp(email, password, userData);
      
      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Set user immediately from registration response
        setUser({
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
        });
        
        // Navigate to appropriate dashboard based on role  
        const path = data.user.role === 'admin' ? '/admin' : '/';
        window.location.href = path;
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      // Force reload to clear any cached state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if logout fails on server, clear local state
      setUser(null);
      window.location.href = '/';
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Listen for auth state changes
        const unsubscribe = auth.onAuthStateChange(async () => {
          if (!mounted) return;
          try {
            await refreshUser();
          } catch (error) {
            console.error('Auth state change error:', error);
            setUser(null);
          } finally {
            setLoading(false);
          }
        });

        // Initial load - only if we have a valid session
        try {
          await refreshUser();
        } catch (error) {
          // If refreshUser fails, clear any stale state
          console.log('Initial auth check failed, clearing state');
          setUser(null);
        }
        if (mounted) setLoading(false);

        return () => unsubscribe();
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
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