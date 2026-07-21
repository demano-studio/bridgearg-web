import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

if (import.meta.env.DEV && !isSupabaseConfigured) {
  console.info(
    "[Supabase] No configurado: definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env y reiniciá el dev server."
  );
}

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  isConfigured: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<Error | null>(null);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s }, error: e }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (e) setError(e);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setError(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      session,
      loading,
      error,
      isConfigured: isSupabaseConfigured,
      signOut,
    }),
    [user, session, loading, error, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within SupabaseAuthProvider");
  }
  return ctx;
}

/** Safe hook: returns null if provider is not mounted or Supabase is not configured. */
export function useAuthOptional(): AuthState | null {
  return useContext(AuthContext);
}
