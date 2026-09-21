import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUser = async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser) {
        await supabase.from('customer').upsert({
          id: currentUser.id,
          email: currentUser.email || '',
          name: currentUser.user_metadata?.full_name || '',
          avatar_url: currentUser.user_metadata?.avatar_url || ''
        }, { onConflict: 'id' });
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getURL = () => {
    let url =
      import.meta.env.VITE_SITE_URL ?? // Set this to your site URL in production env.
      import.meta.env.VITE_VERCEL_URL ?? // Automatically set by Vercel.
      'http://localhost:3000/';
    
    // Make sure to include `https://` when not localhost.
    url = url.startsWith('http') ? url : `https://${url}`;
    // Make sure to include a trailing `/`.
    url = url.endsWith('/') ? url : `${url}/`;
    return url;
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getURL() },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
