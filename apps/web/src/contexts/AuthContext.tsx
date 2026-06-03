import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { isScreenshotMode } from "../lib/screenshotMode";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingOut: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string, redirectTo?: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const COMPLIANCE_CACHE_KEY = "compliance_guard_data";

function getAuthRedirectUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

function formatAuthError(message?: string): string | null {
  if (!message) return null;
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return "Email not confirmed. Please check your email or resend the confirmation link.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password. If you just signed up, confirm your email before signing in.";
  }
  if (lower.includes("expired") || lower.includes("invalid") && lower.includes("token")) {
    return "This confirmation link is invalid or expired. Please request a new confirmation email.";
  }
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const clearLocalAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setLoading(false);
    try {
      localStorage.removeItem(COMPLIANCE_CACHE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (isScreenshotMode()) {
      setSession(null);
      setUser({
        id: "haseen-plus-demo-user",
        email: "report-demo@haseenplus.sa",
        user_metadata: { full_name: "Haseen Plus+ Demo User" },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    if (isScreenshotMode()) {
      return { error: null, needsConfirmation: false };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || "" },
        emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
      },
    });
    return {
      error: formatAuthError(error?.message),
      needsConfirmation: !data.session,
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isScreenshotMode()) {
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: formatAuthError(error?.message) };
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    if (isScreenshotMode()) {
      return { error: null };
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
      },
    });

    return { error: formatAuthError(error?.message) };
  }, []);

  const requestPasswordReset = useCallback(async (email: string, redirectTo?: string) => {
    if (isScreenshotMode()) {
      return { error: null };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? getAuthRedirectUrl("/auth/reset-password"),
    });

    return { error: formatAuthError(error?.message) };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (isScreenshotMode()) {
      return { error: null };
    }

    const { error } = await supabase.auth.updateUser({ password });
    return { error: formatAuthError(error?.message) };
  }, []);

  const signOut = useCallback(async () => {
    if (import.meta.env.DEV) console.info("[auth] logout start", { userId: user?.id });
    setSigningOut(true);
    if (isScreenshotMode()) {
      clearLocalAuthState();
      setSigningOut(false);
      return;
    }
    try {
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Supabase signOut timed out")), 8000);
      });
      await Promise.race([signOutPromise, timeoutPromise]);
      if (import.meta.env.DEV) console.info("[auth] logout success");
    } catch (error) {
      if (import.meta.env.DEV) console.error("[auth] logout failure", error);
    } finally {
      clearLocalAuthState();
      setSigningOut(false);
    }
  }, [clearLocalAuthState, user?.id]);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signingOut, signUp, signIn, resendConfirmation, requestPasswordReset, updatePassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
