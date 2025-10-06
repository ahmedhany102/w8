import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser, AuthContextType } from '@/types/auth';
import { useAuthValidation } from '@/hooks/useAuthValidation';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { fetchUserProfile } from '@/utils/authUtils';

// ✅ إنشاء الـ Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ Hook للاستخدام داخل المكونات
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ✅ المزود الرئيسي (Provider)
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const { validateSessionAndUser } = useAuthValidation();
  const { login, adminLogin, signup, logout } = useAuthOperations();

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data?.session || null);
        setUser(data?.session?.user ? { 
          id: data.session.user.id,
          email: data.session.user.email!,
          name: data.session.user.email?.split('@')[0] || 'User',
          role: 'USER'
        } : null);
      } catch (err) {
        console.error('❌ Error getting session:', err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth event:', event);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          try {
            // 🔐 تحقق من إذا كان المستخدم محظور
            const { data: canAuth, error: authCheckError } = await supabase.rpc('can_user_authenticate', {
              _user_id: session.user.id
            });

            if (authCheckError) console.error('Auth check error:', authCheckError);

            if (!canAuth) {
              console.warn('🚫 Banned user detected:', session.user.email);
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setLoading(false);
              toast.error('تم حظر حسابك. تم تسجيل الخروج تلقائياً');
              return;
            }

            // ✅ تحميل بيانات المستخدم
            setSession(session);
            const userData = await fetchUserProfile(session.user.id, session.user.email!);
            setUser(userData);
          } catch (error) {
            console.error('❌ Failed to load profile:', error);
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: session.user.email?.split('@')[0] || 'User',
              role: 'USER'
            });
          } finally {
            setLoading(false);
          }
        }
      }
    });

    return () => {
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  // ✅ القيمة المصدّرة للـ Context
  const contextValue: AuthContextType = {
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

  console.log('🏪 Auth Context State:', {
    user: user?.email || 'No user',
    session: !!session,
    loading,
    isAdmin: user?.role === 'ADMIN',
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
