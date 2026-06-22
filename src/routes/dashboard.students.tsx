import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth, canManageStudents } from "@/lib/auth-context";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/dashboard/students")({
  head: () => ({ meta: [{ title: "إدارة الطلاب" }] }),
  component: () => (
    <DashboardShell>
      <StudentsPage />
    </DashboardShell>
  ),
});

interface Student {
  id: string;
  full_name: string;
  nickname: string | null;
  father_name: string | null;
  mother_name: string | null;
  student_phone: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  address: string | null;
  father_job: string | null;
  birth_date: string | null;
  grade_level: string | null;
}

const EMPTY: Omit<Student, "id"> = {
  full_name: "",
  nickname: "",
  father_name: "",
  mother_name: "",
  student_phone: "",
  father_phone: "",
  mother_phone: "",
  address: "",
  father_job: "",
  birth_date: "",
  grade_level: "",
};

function StudentsPage() {
  const { roles } = useAuth();
  const canManage = canManageStudents(roles);
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<Omit<Student, "id">>(EMPTY);

  async function load() {
    const { data } = await supabase
      .from("students").select("*").order("full_name");
    setStudents((data ?? []) as Student[]);
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      full_name: s.full_name,
      nickname: s.nickname ?? "",
      father_name: s.father_name ?? "",
      mother_name: s.mother_name ?? "",
      student_phone: s.student_phone ?? "",
      father_phone: s.father_phone ?? "",
      mother_phone: s.mother_phone ?? "",
      address: s.address ?? "",
      father_job: s.father_job ?? "",
      birth_date: s.birth_date ?? "",
      grade_level: s.grade_level ?? "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("اسم الطالب مطلوب");
    const payload = {
      ...form,
      birth_date: form.birth_date || null,
      nickname: form.nickname || null,
      father_name: form.father_name || null,
      mother_name: form.mother_name || null,
      student_phone: form.student_phone || null,
      father_phone: form.father_phone || null,
      mother_phone: form.mother_phone || null,
      address: form.address || null,
      father_job: form.father_job || null,
      grade_level: form.grade_level || null,
    };
    if (editing) {
      const { error } = await supabase.from("students").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("students").insert({ ...payload, created_by: user?.id });
      if (error) return toast.error(error.message);
      toast.success("تمت إضافة الطالب");
    }
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("هل أنت متأكد من حذف الطالب وتسميعاته؟")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  }

  const filtered = students.filter((s) => {
    const triple = `${s.full_name} ${s.nickname ?? ""} ${s.father_name ?? ""}`.toLowerCase();
    return triple.includes(query.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">الطلاب ({students.length})</h1>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="size-4" /> طالب جديد</Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "تعديل بيانات طالب" : "طالب جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="اسم الطالب *">
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                  </Field>
                  <Field label="كنية الطالب">
                    <Input value={form.nickname ?? ""} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="اسم الأب">
                    <Input value={form.father_name ?? ""} onChange={(e) => setForm({ ...form, father_name: e.target.value })} />
                  </Field>
                  <Field label="اسم الأم">
                    <Input value={form.mother_name ?? ""} onChange={(e) => setForm({ ...form, mother_name: e.target.value })} />
                  </Field>
                </div>
                <Field label="تاريخ الميلاد">
                  <Input type="date" value={form.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="رقم الطالب">
                    <Input dir="ltr" value={form.student_phone ?? ""} onChange={(e) => setForm({ ...form, student_phone: e.target.value })} />
                  </Field>
                  <Field label="رقم الأب">
                    <Input dir="ltr" value={form.father_phone ?? ""} onChange={(e) => setForm({ ...form, father_phone: e.target.value })} />
                  </Field>
                  <Field label="رقم الأم">
                    <Input dir="ltr" value={form.mother_phone ?? ""} onChange={(e) => setForm({ ...form, mother_phone: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="عمل الأب">
                    <Input value={form.father_job ?? ""} onChange={(e) => setForm({ ...form, father_job: e.target.value })} />
                  </Field>
                  <Field label="المرحلة الدراسية">
                    <Input placeholder="مثال: الصف الخامس" value={form.grade_level ?? ""} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} />
                  </Field>
                </div>
                <Field label="عنوان السكن">
                  <Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </Field>
                <DialogFooter>
                  <Button type="submit">{editing ? "حفظ التعديلات" : "إضافة"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Input placeholder="بحث بالاسم..." value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold">{s.full_name}{s.father_name ? ` ${s.father_name}` : ""}</h3>
                {s.grade_level && <p className="text-xs text-muted-foreground">المرحلة: {s.grade_level}</p>}
                {s.birth_date && <p className="text-xs text-muted-foreground">مواليد: {s.birth_date}</p>}
              </div>
            </div>
            {s.father_phone && (
              <p className="mt-2 text-xs text-muted-foreground" dir="ltr">📞 {s.father_phone}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="default">
                <Link to="/dashboard/recite/$studentId" params={{ studentId: s.id }}>
                  <ExternalLink className="size-3.5" /> التسميعات
                </Link>
              </Button>
              {canManage && (
                <>
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Pencil className="size-3.5" /> تعديل
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">لا يوجد طلاب.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
