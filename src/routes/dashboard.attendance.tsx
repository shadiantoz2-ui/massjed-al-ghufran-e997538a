import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/attendance")({
  head: () => ({
    meta: [
      { title: "تسجيل الحضور اليومي — مسجد الغفران" },
      { name: "description", content: "تسجيل حضور طلاب مسجد الغفران اليومي باكراً أو متأخراً." },
      { property: "og:title", content: "تسجيل الحضور اليومي — مسجد الغفران" },
      { property: "og:description", content: "تسجيل حضور الطلاب اليومي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <DashboardShell>
      <AttendancePage />
    </DashboardShell>
  ),
});

type Status = "present" | "late";
interface S { id: string; full_name: string; father_name: string | null; nickname: string | null; teacher_id: string | null }

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function AttendancePage() {
  const { roles, user } = useAuth();
  const isManager = roles.includes("admin") || roles.includes("supervisor");
  const isHalaqah = roles.includes("halaqah");
  const [students, setStudents] = useState<S[]>([]);
  const [date, setDate] = useState(todayIso());
  const [sel, setSel] = useState<Record<string, Status>>({});
  const [recorded, setRecorded] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("students").select("id, full_name, father_name, nickname, teacher_id").order("full_name")
      .then(({ data }) => {
        let list = (data ?? []) as S[];
        if (!isManager) list = list.filter((s) => s.teacher_id === user?.id);
        setStudents(list);
      });
  }, [isManager, user?.id]);

  async function loadRecorded() {
    const { data } = await supabase.from("attendance").select("student_id, status").eq("attendance_date", date);
    const m: Record<string, string> = {};
    for (const r of data ?? []) m[r.student_id] = r.status;
    setRecorded(m);
  }
  useEffect(() => { loadRecorded(); setSel({}); }, [date]);

  const filtered = useMemo(() => {
    const t = q.trim().split(/\s+/).filter(Boolean);
    return students.filter((s) => {
      const n = `${s.full_name} ${s.father_name ?? ""} ${s.nickname ?? ""}`;
      return t.every((w) => n.includes(w));
    });
  }, [students, q]);

  function setStatus(id: string, st: Status) {
    setSel((p) => {
      const n = { ...p };
      if (n[id] === st) delete n[id]; else n[id] = st;
      return n;
    });
  }

  function markAll(st: Status) {
    const n: Record<string, Status> = {};
    for (const s of filtered) if (!recorded[s.id]) n[s.id] = st;
    setSel(n);
  }

  async function save() {
    const rows = Object.entries(sel).map(([student_id, status]) => ({
      student_id, status, attendance_date: date, created_by: user?.id,
    }));
    if (!rows.length) return toast.error("لم يتم تحديد أي طالب");
    setBusy(true);
    const { error } = await supabase.from("attendance").insert(rows);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`تم تسجيل حضور ${rows.length} طالب`);
    setSel({});
    loadRecorded();
  }

  if (!isManager && !isHalaqah) {
    return <Card className="p-6 text-center">هذه الصفحة للمشرفين والمدير ومعلمي الحلقات.</Card>;
  }

  const count = Object.keys(sel).length;

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-xl font-bold">تسجيل الحضور اليومي</h1>
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">التاريخ:</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" dir="ltr" />
        </div>
        <Input placeholder="بحث عن طالب..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => markAll("present")}>تحديد الكل باكر</Button>
          <Button size="sm" variant="outline" onClick={() => markAll("late")}>تحديد الكل متأخر</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel({})}>إلغاء التحديد</Button>
        </div>
      </Card>

      <div className="space-y-2">
        {filtered.map((s) => {
          const rec = recorded[s.id];
          const cur = sel[s.id];
          return (
            <Card key={s.id} className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{s.full_name} {s.father_name ?? ""} {s.nickname ?? ""}</div>
                {rec && (
                  <div className="text-xs text-muted-foreground">
                    مسجَّل: {rec === "present" ? "باكر" : rec === "late" ? "متأخر" : rec}
                  </div>
                )}
              </div>
              {!rec && (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant={cur === "present" ? "default" : "outline"} onClick={() => setStatus(s.id, "present")}>باكر</Button>
                  <Button size="sm" variant={cur === "late" ? "secondary" : "outline"}
                    className={cn(cur === "late" && "ring-2 ring-primary")} onClick={() => setStatus(s.id, "late")}>متأخر</Button>
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground">لا يوجد طلاب</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <span className="text-sm">المحدد: {count}</span>
          <Button onClick={save} disabled={busy || !count}>{busy ? "جاري الحفظ..." : "حفظ الحضور"}</Button>
        </div>
      </div>
    </div>
  );
}
