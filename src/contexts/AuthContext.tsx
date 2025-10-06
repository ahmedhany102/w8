import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AuthUser } from '@/types/auth';
import { useAuthValidation } from '@/hooks/useAuthValidation';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { fetchUserProfile } from '@/utils/authUtils';

type AuthContextType = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const { validateSessionAndUser } = useAuthValidation();
  const { login, adminLogin, signup, logout } = useAuthOperations();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        try {
          const userData = await fetchUserProfile(session.user.id, session.user.email!);
          setUser(userData);
        } catch (error) {
          console.error('Failed to load profile:', error);
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.email?.split('@')[0] || 'User',
            role: 'USER',
          });
        }
        setSession(session);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const contextValue = {
    user,
    session,
    login,
    adminLogin,
    signup,
    logout,
    loading,
    isAdmin: user?.role === 'ADMIN',
    checkAuthStatus: validateSessionAndUser,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
