import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

/** Oturum durumu: `undefined` = henüz okunuyor, `null` = giriş yapılmamış. */
const AuthContext = createContext<Session | null | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

export const useSession = () => useContext(AuthContext);
