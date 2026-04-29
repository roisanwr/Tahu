"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { createBrowserClient } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  token: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  token: null,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Gunakan ref agar Supabase client tidak dibuat ulang setiap render
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createBrowserClient();
  }
  const supabase = supabaseRef.current;

  useEffect(() => {
    // 1. Cek session yang sudah ada (misal dari cookie setelah OAuth callback)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name:
            session.user.user_metadata?.full_name ??
            session.user.email ??
            "User",
          email: session.user.email!,
          avatarUrl: session.user.user_metadata?.avatar_url,
        });
        setToken(session.access_token);
      }
    });

    // 2. Listen perubahan auth state (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name:
            session.user.user_metadata?.full_name ??
            session.user.email ??
            "User",
          email: session.user.email!,
          avatarUrl: session.user.user_metadata?.avatar_url,
        });
        setToken(session.access_token);
      } else {
        setUser(null);
        setToken(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async () => {
    // redirectTo: arahkan ke /chat setelah login Google berhasil
    // sehingga Supabase tahu harus redirect ke mana dan token diproses oleh middleware
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/chat`,
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("skorinaja_last_session");
    localStorage.removeItem("skorinaja_last_business");
    localStorage.removeItem("skorinaja_last_assessment");
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
