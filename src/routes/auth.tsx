import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "دخول المعلمين" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب");
        // First-ever signup becomes admin via trigger. Try direct sign-in (email confirmation may be off).
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (!e2) navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-4" />
          العودة
        </Link>
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <BookOpen className="size-6 text-primary" />
            <h1 className="text-xl font-bold">
              {mode === "signin" ? "دخول المعلمين" : "إنشاء حساب"}
            </h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                dir="ltr"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "جاري..." : mode === "signin" ? "دخول" : "إنشاء حساب"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                ليس لديك حساب؟{" "}
                <button onClick={() => setMode("signup")} className="font-medium text-primary hover:underline">
                  إنشاء حساب
                </button>
              </>
            ) : (
              <>
                لديك حساب؟{" "}
                <button onClick={() => setMode("signin")} className="font-medium text-primary hover:underline">
                  تسجيل الدخول
                </button>
              </>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            ملاحظة: أول حساب يُسجَّل يصبح المدير تلقائياً.
          </p>
        </Card>
      </div>
    </div>
  );
}
