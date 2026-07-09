import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { GraduationCap, CalendarClock, Search, Pencil, Trash2 } from "lucide-react";

type CourseRow = { id: string; name: string; year: number; is_current: boolean; started_at: string; ended_at: string | null };

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
  const { roles, user } = useAuth();
  const [studentsCount, setStudentsCount] = useState<number | null>(null);
  const [course, setCourse] = useState<{ id: string; name: string; year: number } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string }[]>([]);

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [editCourse, setEditCourse] = useState<CourseRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editYear, setEditYear] = useState<number>(new Date().getFullYear());

  const isAdmin = roles.includes("admin");

  async function loadCourse() {
    const { data } = await supabase.rpc("get_current_course");
    const row = Array.isArray(data) && data.length ? (data[0] as any) : null;
    setCourse(row);
  }

  async function loadCourses() {
    const { data } = await supabase.rpc("list_courses" as any);
    setCourses((data ?? []) as CourseRow[]);
  }

  useEffect(() => {
    (async () => {
      const { count: sc } = await supabase.from("students").select("id", { count: "exact", head: true });
      setStudentsCount(sc ?? 0);
      await loadCourse();
      if (isAdmin) await loadCourses();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const { data } = await supabase.rpc("search_students_by_name", { _query: query.trim() });
    setResults((data ?? []) as any);
  }

  async function startNewCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return toast.error("أدخل اسم الدورة");
    setSaving(true);
    const { error } = await supabase.rpc("start_new_course", { _name: newName.trim(), _year: Number(newYear) });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم بدء الدورة الجديدة");
    setNewOpen(false);
    setNewName("");
    await loadCourse();
    if (isAdmin) await loadCourses();
  }

  function openEditCourse(c: CourseRow) {
    setEditCourse(c);
    setEditName(c.name);
    setEditYear(c.year);
  }

  async function saveEditCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!editCourse) return;
    if (!editName.trim()) return toast.error("أدخل اسم الدورة");
    const { error } = await supabase.rpc("update_course" as any, {
      _course_id: editCourse.id, _name: editName.trim(), _year: Number(editYear),
    });
    if (error) return toast.error(error.message);
    toast.success("تم تحديث الدورة");
    setEditCourse(null);
    await loadCourse();
    await loadCourses();
  }

  async function deleteCourse(c: CourseRow) {
    if (!confirm(`حذف الدورة "${c.name} — ${c.year}" وجميع بياناتها (تسميعات، سبر، أحاديث، حضور، نقاط)؟\nلا يمكن التراجع.`)) return;
    const { error } = await supabase.rpc("delete_course" as any, { _course_id: c.id });
    if (error) return toast.error(error.message);
    toast.success("تم حذف الدورة");
    await loadCourse();
    await loadCourses();
  }

  return (
    <div className="space-y-6">
      {user && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm">مرحباً بك 👋 <strong>{user.email}</strong></p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={GraduationCap} label="عدد الطلاب" value={studentsCount != null ? String(studentsCount) : "—"} />
        <StatCard
          icon={CalendarClock}
          label="الدورة الحالية"
          value={course ? `${course.name} — ${course.year}` : "—"}
        />
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
        <Card className="p-5 border-amber-400/40 bg-amber-50/60 dark:border-amber-700/40 dark:bg-amber-950/30">
          <h2 className="font-bold">بدء دورة جديدة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            عند بدء دورة جديدة سيتم تحويل جميع التسميعات الحالية إلى الأرشيف (اللون الأصفر) وإعادة حساب النقاط من جديد.
            ستقوم باختيار اسم الدورة وعامها (مثال: دورة صيف 2026).
          </p>
          <Button className="mt-3" onClick={() => { setNewName(""); setNewYear(new Date().getFullYear()); setNewOpen(true); }}>
            بدء دورة جديدة
          </Button>
        </Card>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>بدء دورة جديدة</DialogTitle></DialogHeader>
          <form onSubmit={startNewCourse} className="space-y-3">
            <div>
              <Label>اسم الدورة</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: دورة الصيف" required />
            </div>
            <div>
              <Label>العام</Label>
              <Input type="number" min={2000} max={2100} value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))} required />
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم أرشفة كل تسميعات الدورة الحالية وتحويلها للون الأصفر، وستبدأ حساب النقاط من الصفر.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving ? "جاري..." : "تأكيد وبدء الدورة"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <Card className="p-5">
          <h2 className="mb-3 font-bold">إدارة الدورات</h2>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد دورات.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {courses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {c.name} — {c.year}
                      {c.is_current && (
                        <span className="ms-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          الحالية
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      بدأت: {new Date(c.started_at).toLocaleDateString("ar")}
                      {c.ended_at && ` • انتهت: ${new Date(c.ended_at).toLocaleDateString("ar")}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openEditCourse(c)}>
                      <Pencil className="size-3.5" /> تعديل
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteCourse(c)}>
                      <Trash2 className="size-3.5" /> حذف
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            حذف الدورة يحذف جميع بياناتها (تسميعات، سبر، أحاديث، حضور، نقاط) نهائياً.
          </p>
        </Card>
      )}

      <Dialog open={!!editCourse} onOpenChange={(o) => !o && setEditCourse(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل الدورة</DialogTitle></DialogHeader>
          <form onSubmit={saveEditCourse} className="space-y-3">
            <div>
              <Label>اسم الدورة</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div>
              <Label>العام</Label>
              <Input type="number" min={2000} max={2100} value={editYear}
                onChange={(e) => setEditYear(Number(e.target.value))} required />
            </div>
            <DialogFooter>
              <Button type="submit">حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-3 text-primary">
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold truncate">{value}</div>
      </div>
    </Card>
  );
}
