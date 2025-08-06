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

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: userData, error } = await db.getUserProfile(userId);
      
      if (error || !userData) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role,
        profileImageUrl: userData.profile_image_url
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const refreshUser = async () => {
    try {
      const { user: authUser, error } = await auth.getCurrentUser();
      
      if (error || !authUser) {
        setUser(null);
        return;
      }

      const userProfile = await fetchUserProfile(authUser.id);
      setUser(userProfile);
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

      if (data.user) {
        await refreshUser();
      }

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
        await refreshUser();
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
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Listen for auth state changes
        const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          if (event === 'SIGNED_IN' && session?.user) {
            await refreshUser();
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
          setLoading(false);
        });

        // Initial load with timeout protection
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout')), 5000)
        );

        await Promise.race([
          refreshUser(),
          timeoutPromise
        ]);

        if (mounted) {
          setLoading(false);
        }

        return () => subscription.unsubscribe();
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