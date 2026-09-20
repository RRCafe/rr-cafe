import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isOwner: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      checkOwner(u?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      checkOwner(u?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkOwner(userId?: string) {
    if (!userId) {
      setIsOwner(false);
      setLoading(false);
      return;
    }
    setLoading(true); // Ensure loading is true while checking
    try {
      const { data, error } = await supabase.from('owner').select('id').eq('id', userId).maybeSingle();
      if (error) console.error("checkOwner error:", error);
      setIsOwner(!!data);
    } catch (err) {
      console.error("checkOwner catch:", err);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  }

  return <AuthContext.Provider value={{ user, loading, isOwner }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
