import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "supervisor" | "reciter";

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRoles(userId: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  }

  useEffect(() => {
    let currentUserId: string | null = null;
    // Listener FIRST — only react to identity transitions
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(s);
      const nextId = s?.user?.id ?? null;
      if (nextId && nextId !== currentUserId) {
        currentUserId = nextId;
        setTimeout(() => loadRoles(nextId), 0);
      } else if (!nextId) {
        currentUserId = null;
        setRoles([]);
      }
    });
    // Then initial
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        currentUserId = s.user.id;
        loadRoles(s.user.id).finally(() => setLoading(false));
      } else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRoles = async () => {
    if (session?.user) await loadRoles(session.user.id);
  };

  return (
    <AuthCtx.Provider
      value={{ session, user: session?.user ?? null, roles, loading, signOut, refreshRoles }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function hasRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

export function canManageTeachers(roles: AppRole[]): boolean {
  return roles.includes("admin");
}
export function canManageStudents(roles: AppRole[]): boolean {
  return roles.includes("admin") || roles.includes("supervisor");
}
export function canEditAnyRecitation(roles: AppRole[]): boolean {
  return roles.includes("admin") || roles.includes("supervisor");
}
