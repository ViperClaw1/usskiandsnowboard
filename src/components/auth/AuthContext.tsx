import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // ==============================
  // Bootstrap from Supabase's local cache synchronously.
  // supabase.auth.session() (the legacy getter) isn't available in v2, but we
  // can read the persisted session from localStorage via getSession — however
  // that is async. Instead we rely entirely on onAuthStateChange which in
  // Supabase v2 fires INITIAL_SESSION synchronously from the local cache when
  // a session already exists, meaning `loading` is resolved in the same tick
  // on repeated visits without any network round-trip.
  // ==============================
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // NOTE: getSession() has been intentionally removed.
    //
    // In Supabase Auth v2, onAuthStateChange fires an INITIAL_SESSION event
    // immediately on subscription using the locally-persisted token — no
    // network request needed. Calling getSession() on top of that caused:
    //   1. A redundant async round-trip on every AuthProvider mount.
    //   2. A double setState (once from onAuthStateChange, once from
    //      getSession) producing an unnecessary extra render.
    //
    // onAuthStateChange alone is the canonical, sufficient source of truth.

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, session, loading }}>{children}</AuthContext.Provider>;
};
