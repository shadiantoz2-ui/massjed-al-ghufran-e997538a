import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Check, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/registrations")({
  head: () => ({
    meta: [
      { title: "قبول الطلاب المسجلين" },
      { name: "description", content: "مراجعة طلبات تسجيل الطلاب الجدد وقبولها أو رفضها." },
    ],
  }),
  component: () => (
    <DashboardShell>
      <RegistrationsPage />
    </DashboardShell>
  ),
});

interface Reg {
  id: string;
  full_name: string;
  nickname: string | null;
  father_name: string | null;
  mother_name: string | null;
  birth_year: number | null;
  father_phone: string | null;
  mother_phone: string | null;
  contact_phone: string | null;
  father_job: string | null;
  grade_level: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface TeacherOpt { user_id: string; full_name: string }

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

function RegistrationsPage() {
  const { roles } = useAuth();
  const allowed = roles.includes("admin") || roles.includes("supervisor");
  const [regs, setRegs] = useState<Reg[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [teacherSel, setTeacherSel] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "all">("pending");

  const load = useCallback(async () => {
    const [{ data }, { data: t }] = await Promise.all([
      supabase
        .from("student_registrations")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.rpc("list_teachers"),
    ]);
    setRegs((data ?? []) as Reg[]);
    setTeachers((t ?? []) as TeacherOpt[]);
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  async function approve(r: Reg) {
    setBusyId(r.id);
    const { error } = await supabase.rpc("approve_student_registration" as any, {
      _id: r.id,
      _teacher_id: teacherSel[r.id] ?? null,
    });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("تم قبول الطالب وإضافته لقائمة الطلاب");
    load();
  }

  async function reject(r: Reg) {
    if (!confirm("رفض طلب هذا الطالب؟")) return;
    setBusyId(r.id);
    const { error } = await supabase.rpc("reject_student_registration" as any, { _id: r.id });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("تم رفض الطلب");
    load();
  }

  async function remove(r: Reg) {
    if (!confirm("حذف هذا الطلب نهائياً؟")) return;
    const { error } = await supabase.from("student_registrations").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  if (!allowed) {
    return <p className="py-10 text-center text-sm text-muted-foreground">هذه الصفحة للمدير فقط.</p>;
  }

  const pendingCount = regs.filter((r) => r.status === "pending").length;
  const shown = tab === "pending" ? regs.filter((r) => r.status === "pending") : regs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">قبول الطلاب المسجلين ({pendingCount})</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "pending" ? "default" : "outline"} onClick={() => setTab("pending")}>
            قيد المراجعة
          </Button>
          <Button size="sm" variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")}>
            كل الطلبات
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold">
                {[r.full_name, r.father_name, r.nickname].filter(Boolean).join(" ")}
              </h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {STATUS_LABELS[r.status] ?? r.status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>اسم الأم: {r.mother_name || "—"}</span>
              <span>مواليد: {r.birth_year || "—"}</span>
              <span>المرحلة: {r.grade_level || "—"}</span>
              <span>عمل الأب: {r.father_job || "—"}</span>
              <span dir="ltr">أب: {r.father_phone || "—"}</span>
              <span dir="ltr">أم: {r.mother_phone || "—"}</span>
              <span dir="ltr">واتساب: {r.contact_phone || "—"}</span>
              <span className="col-span-2">السكن: {r.address || "—"}</span>
              {r.notes && <span className="col-span-2">ملاحظات: {r.notes}</span>}
            </div>

            {r.status === "pending" ? (
              <div className="mt-3 space-y-2">
                <Select
                  value={teacherSel[r.id] ?? ""}
                  onValueChange={(v) => setTeacherSel((s) => ({ ...s, [r.id]: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="أستاذ الحلقة (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.user_id} value={t.user_id}>{t.full_name || "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => approve(r)} disabled={busyId === r.id}>
                    <Check className="size-4" /> قبول
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(r)} disabled={busyId === r.id}>
                    <X className="size-4" /> رفض
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                  <Trash2 className="size-3.5 text-destructive" /> حذف الطلب
                </Button>
              </div>
            )}
          </Card>
        ))}
        {shown.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            لا توجد طلبات تسجيل.
          </p>
        )}
      </div>
    </div>
  );
}
