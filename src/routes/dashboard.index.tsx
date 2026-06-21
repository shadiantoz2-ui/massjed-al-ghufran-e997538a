import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { GraduationCap, BookMarked, CalendarClock, Search } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "لوحة التحكم" }] }),
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <DashboardShell>
      <Home />
    </DashboardShell>
  );
}

function Home() {
  const { roles } = useAuth();
  const [studentsCount, setStudentsCount] = useState<number | null>(null);
  const [recitationsCount, setRecitationsCount] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string }[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ count: sc }, { count: rc }, { data: settings }] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("recitations").select("id", { count: "exact", head: true }).eq("archived", false),
        supabase.from("app_settings").select("current_academic_year").eq("id", 1).maybeSingle(),
      ]);
      setStudentsCount(sc ?? 0);
      setRecitationsCount(rc ?? 0);
      setYear(settings?.current_academic_year ?? null);
    })();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const { data } = await supabase.rpc("search_students_by_name", { _query: query.trim() });
    setResults((data ?? []) as any);
  }

  async function startNewYear() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    const { error } = await supabase.rpc("start_new_academic_year");
    if (error) return toast.error(error.message);
    toast.success("تم بدء السنة الدراسية الجديدة");
    setConfirming(false);
    const { data: settings } = await supabase
      .from("app_settings").select("current_academic_year").eq("id", 1).maybeSingle();
    setYear(settings?.current_academic_year ?? null);
    setRecitationsCount(0);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={GraduationCap} label="عدد الطلاب" value={studentsCount} />
        <StatCard icon={BookMarked} label="تسميعات السنة الحالية" value={recitationsCount} />
        <StatCard icon={CalendarClock} label="السنة الدراسية" value={year} />
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-bold">تسجيل تسميع لطالب</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input placeholder="ابحث باسم الطالب..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="submit"><Search className="size-4" /> بحث</Button>
        </form>
        {results.length > 0 && (
          <ul className="mt-4 divide-y rounded-lg border">
            {results.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-2">
                <span className="font-medium">{s.full_name}</span>
                <Button asChild size="sm">
                  <Link to="/dashboard/recite/$studentId" params={{ studentId: s.id }}>
                    فتح
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {roles.includes("admin") && (
        <Card className="p-5 border-amber-400/40 bg-amber-50/60">
          <h2 className="font-bold">إنهاء السنة الدراسية</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            عند البدء بسنة جديدة سيتم تحويل جميع التسميعات الحالية إلى أرشيف (اللون الأصفر) والبدء من جديد باللون الأخضر.
          </p>
          <Button
            variant={confirming ? "destructive" : "outline"}
            className="mt-3"
            onClick={startNewYear}
          >
            {confirming ? "اضغط مرة أخرى للتأكيد" : "بدء سنة دراسية جديدة"}
          </Button>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | null }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-3 text-primary">
        <Icon className="size-6" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value ?? "—"}</div>
      </div>
    </Card>
  );
}
