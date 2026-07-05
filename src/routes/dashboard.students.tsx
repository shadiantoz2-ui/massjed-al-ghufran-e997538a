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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  father_phone: string | null;
  mother_phone: string | null;
  contact_phone: string | null;
  address: string | null;
  father_job: string | null;
  birth_year: number | null;
  grade_level: string | null;
  teacher_id: string | null;
}

const EMPTY: Omit<Student, "id"> = {
  full_name: "",
  nickname: "",
  father_name: "",
  mother_name: "",
  father_phone: "",
  mother_phone: "",
  contact_phone: "",
  address: "",
  father_job: "",
  birth_year: null,
  grade_level: "",
  teacher_id: null,
};

interface TeacherOpt { user_id: string; full_name: string }

function StudentsPage() {
  const { roles, user } = useAuth();
  const canManage = canManageStudents(roles);
  const isHalaqahOnly = roles.includes("halaqah") && !roles.includes("admin") && !roles.includes("supervisor");
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<Omit<Student, "id">>(EMPTY);

  async function load() {
    let q = supabase.from("students").select("id, full_name, nickname, father_name, mother_name, father_phone, mother_phone, contact_phone, address, father_job, birth_year, grade_level, teacher_id").order("full_name");
    if (isHalaqahOnly && user?.id) q = q.eq("teacher_id", user.id);
    const [{ data }, { data: t }] = await Promise.all([
      q,
      supabase.rpc("list_teachers"),
    ]);
    setStudents((data ?? []) as Student[]);
    setTeachers((t ?? []) as TeacherOpt[]);
  }
  useEffect(() => { load(); }, [isHalaqahOnly, user?.id]);


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
      father_phone: s.father_phone ?? "",
      mother_phone: s.mother_phone ?? "",
      contact_phone: s.contact_phone ?? "",
      address: s.address ?? "",
      father_job: s.father_job ?? "",
      birth_year: s.birth_year ?? null,
      grade_level: s.grade_level ?? "",
      teacher_id: s.teacher_id ?? null,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const required: [keyof Omit<Student, "id">, string][] = [
      ["full_name", "اسم الطالب"],
      ["nickname", "كنية الطالب"],
      ["father_name", "اسم الأب"],
      ["mother_name", "اسم الأم"],
      ["birth_year", "عام الميلاد"],
      ["father_phone", "رقم الأب"],
      ["mother_phone", "رقم الأم"],
      ["contact_phone", "رقم التواصل (واتساب)"],
      ["father_job", "عمل الأب"],
      ["grade_level", "المرحلة الدراسية"],
      ["address", "عنوان السكن"],
      ["teacher_id", "الأستاذ في الحلقة"],
    ];
    for (const [k, label] of required) {
      const v = (form as any)[k];
      if (v === null || v === undefined || String(v).trim() === "") {
        return toast.error(`الحقل مطلوب: ${label}`);
      }
    }
    const yr = Number(form.birth_year);
    if (!yr || yr < 1900 || yr > new Date().getFullYear()) {
      return toast.error("عام الميلاد غير صحيح");
    }
    const payload = { ...form, birth_year: yr };
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
                  <Field label="كنية الطالب *">
                    <Input value={form.nickname ?? ""} onChange={(e) => setForm({ ...form, nickname: e.target.value })} required />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="اسم الأب *">
                    <Input value={form.father_name ?? ""} onChange={(e) => setForm({ ...form, father_name: e.target.value })} required />
                  </Field>
                  <Field label="اسم الأم *">
                    <Input value={form.mother_name ?? ""} onChange={(e) => setForm({ ...form, mother_name: e.target.value })} required />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="عام الميلاد *">
                    <Input type="number" min={1900} max={new Date().getFullYear()} placeholder="مثال: 2012"
                      value={form.birth_year ?? ""}
                      onChange={(e) => setForm({ ...form, birth_year: e.target.value ? Number(e.target.value) : null })}
                      required />
                  </Field>
                  <Field label="المرحلة الدراسية *">
                    <Input placeholder="مثال: الصف الخامس" value={form.grade_level ?? ""} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} required />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="رقم الأب *">
                    <Input dir="ltr" value={form.father_phone ?? ""} onChange={(e) => setForm({ ...form, father_phone: e.target.value })} required />
                  </Field>
                  <Field label="رقم الأم *">
                    <Input dir="ltr" value={form.mother_phone ?? ""} onChange={(e) => setForm({ ...form, mother_phone: e.target.value })} required />
                  </Field>
                  <Field label="رقم التواصل (واتساب) *">
                    <Input dir="ltr" value={form.contact_phone ?? ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} required />
                  </Field>
                </div>
                <Field label="عمل الأب *">
                  <Input value={form.father_job ?? ""} onChange={(e) => setForm({ ...form, father_job: e.target.value })} required />
                </Field>
                <Field label="الأستاذ في الحلقة *">
                  <Select value={form.teacher_id ?? ""} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر الأستاذ" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.user_id} value={t.user_id}>{t.full_name || "—"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="عنوان السكن *">
                  <Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
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
                <h3 className="font-bold">{s.full_name}{s.father_name ? ` ${s.father_name}` : ""}{s.nickname ? ` ${s.nickname}` : ""}</h3>
                {s.grade_level && <p className="text-xs text-muted-foreground">المرحلة: {s.grade_level}</p>}
                {s.birth_year && <p className="text-xs text-muted-foreground">مواليد: {s.birth_year}</p>}
              </div>
            </div>
            {s.contact_phone && (
              <p className="mt-2 text-xs text-muted-foreground" dir="ltr">📞 {s.contact_phone}</p>
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
