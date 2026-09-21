import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPartner: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPartner, setIsPartner] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      checkPartnerStatus(session?.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkPartnerStatus(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkPartnerStatus(userId?: string) {
    if (!userId) {
      setIsPartner(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('name, phone_number')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking partner status:', error);
      }

      setIsPartner(!!(data && data.name && data.phone_number));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getURL = () => {
    let url =
      import.meta.env.VITE_SITE_URL ?? // Set this to your site URL in production env.
      import.meta.env.VITE_VERCEL_URL ?? // Automatically set by Vercel.
      'http://localhost:3000/';
    
    // Make sure to include `https://` when not localhost.
    url = url.startsWith('http') ? url : `https://${url}`;
    
    // Make sure it does not end with a slash yet, because BASE_URL usually starts with a slash
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    return url + import.meta.env.BASE_URL;
  };

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getURL(),
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, isPartner, signInWithGoogle, signOut }}>
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
