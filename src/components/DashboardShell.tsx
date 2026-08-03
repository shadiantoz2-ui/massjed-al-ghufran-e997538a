import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, LogOut, Home, CalendarClock } from "lucide-react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/quran-data";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavLink {
  to: string;
  label: string;
  icon: typeof Home;
  adminOnly?: boolean;
}

const links: NavLink[] = [
  { to: "/dashboard", label: "الرئيسية", icon: Home },
  { to: "/dashboard/students", label: "الطلاب", icon: GraduationCap },
  { to: "/dashboard/teachers", label: "المعلمون", icon: Users, adminOnly: true },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { session, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center" dir="rtl">جاري التحميل...</div>;
  }

  const isAdmin = roles.includes("admin");
  const primaryRole = roles[0] ?? "reciter";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logo} alt="شعار مسجد الغفران" className="h-13 w-auto dark:brightness-125" style={{ height: "3.25rem" }} />
            <div className="leading-tight">
              <div className="text-sm font-bold">مسجد الغفران</div>
              <div className="text-xs text-muted-foreground">منصة التسميعات</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {ROLE_LABELS[primaryRole]}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/", replace: true });
              }}
            >
              <LogOut className="size-4" />
              خروج
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {links
            .filter((l) => !l.adminOnly || isAdmin)
            .map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  <l.icon className="size-4" />
                  {l.label}
                </Link>
              );
            })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-bold text-primary">🌿 أهلاً وسهلاً</span>
          <span className="mr-2 text-muted-foreground">
            {session.user?.user_metadata?.full_name || session.user?.email} — بارك الله في جهودك.
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
