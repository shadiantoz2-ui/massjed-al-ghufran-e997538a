import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS } from "@/lib/quran-data";
import { toast } from "sonner";
import { Plus, Trash2, ShieldAlert, KeyRound, Pencil } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { resetTeacherPassword, createTeacherAccount, updateTeacherAccount, deleteTeacherAccount } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/dashboard/teachers")({
  head: () => ({ meta: [{ title: "إدارة المعلمين" }] }),
  component: () => (
    <DashboardShell>
      <TeachersPage />
    </DashboardShell>
  ),
});

interface TeacherRow {
  user_id: string;
  full_name: string;
  username: string | null;
  roles: string[];
}

function TeachersPage() {
  const { roles, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"supervisor" | "reciter" | "halaqah">("reciter");

  // Reset password dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<TeacherRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const resetPwd = useServerFn(resetTeacherPassword);
  const createTeacherFn = useServerFn(createTeacherAccount);
  const updateTeacherFn = useServerFn(updateTeacherAccount);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TeacherRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  function openEdit(t: TeacherRow) {
    setEditTarget(t);
    setEditName(t.full_name || "");
    setEditEmail(t.username || "");
    setEditOpen(true);
  }
  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditBusy(true);
    try {
      await updateTeacherFn({ data: { user_id: editTarget.user_id, full_name: editName, email: editEmail } });
      toast.success("تم تحديث بيانات المعلم");
      setEditOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "تعذر التحديث");
    } finally {
      setEditBusy(false);
    }
  }

  function openReset(t: TeacherRow) {
    setResetTarget(t);
    setNewPassword("");
    setResetOpen(true);
  }
  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetBusy(true);
    try {
      await resetPwd({ data: { user_id: resetTarget.user_id, new_password: newPassword } });
      toast.success("تم تغيير كلمة المرور");
      setResetOpen(false);
    } catch (err: any) {
      toast.error(err.message || "تعذر تغيير كلمة المرور");
    } finally {
      setResetBusy(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  async function load() {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, username");
    const { data: ur } = await supabase.from("user_roles").select("user_id, role");
    const map = new Map<string, TeacherRow>();
    for (const p of profiles ?? []) {
      map.set(p.id, { user_id: p.id, full_name: p.full_name, username: p.username, roles: [] });
    }
    for (const r of ur ?? []) {
      const t = map.get(r.user_id);
      if (t) t.roles.push(r.role);
    }
    setTeachers(Array.from(map.values()));
  }

  async function createTeacher(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createTeacherFn({
        data: { full_name: fullName, email, password, role },
      });
      toast.success("تم إنشاء حساب المعلم");
      setOpen(false);
      setFullName(""); setEmail(""); setPassword(""); setRole("reciter");
      load();
    } catch (err: any) {
      toast.error(err.message || "خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(userId: string, r: string) {
    if (userId === user?.id) return toast.error("لا يمكنك إزالة دورك بنفسك");
    if (!confirm(`هل أنت متأكد من إزالة دور (${ROLE_LABELS[r]})؟`)) return;
    const { error } = await supabase
      .from("user_roles").delete().eq("user_id", userId).eq("role", r as any);
    if (error) return toast.error(error.message);
    toast.success("تم");
    load();
  }

  if (!isAdmin) {
    return (
      <Card className="p-6 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <p className="mt-3 font-semibold">هذه الصفحة للمدير فقط.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">المعلمون</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4" /> معلم جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة معلم</DialogTitle></DialogHeader>
            <form onSubmit={createTeacher} className="space-y-3">
              <div>
                <Label>الاسم الكامل</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>كلمة المرور (6 أحرف فأكثر)</Label>
                <Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div>
                <Label>الدور</Label>
                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervisor">معلم مشرف</SelectItem>
                    <SelectItem value="reciter">معلم مقرئ</SelectItem>
                    <SelectItem value="halaqah">معلم الحلقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy}>{busy ? "جاري..." : "إنشاء"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teachers.map((t) => (
          <Card key={t.user_id} className="p-4">
            <h3 className="font-bold">{t.full_name || t.username || "—"}</h3>
            <p className="text-xs text-muted-foreground" dir="ltr">{t.username}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.roles.length === 0 && <span className="text-xs text-muted-foreground">لا يوجد دور</span>}
              {t.roles.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {ROLE_LABELS[r]}
                  <button onClick={() => removeRole(t.user_id, r)} className="text-destructive hover:opacity-70">
                    <Trash2 className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                <Pencil className="size-3.5" /> تعديل البيانات
              </Button>
              {t.user_id !== user?.id && (
                <Button size="sm" variant="outline" onClick={() => openReset(t)}>
                  <KeyRound className="size-3.5" /> تغيير كلمة المرور
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير كلمة مرور المعلم</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitReset} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              المعلم: <span className="font-semibold text-foreground">{resetTarget?.full_name || resetTarget?.username}</span>
            </p>
            <div>
              <Label>كلمة المرور الجديدة (6 أحرف فأكثر)</Label>
              <Input
                dir="ltr"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={resetBusy || newPassword.length < 6}>
                {resetBusy ? "جاري..." : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit teacher dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المعلم</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-3">
            <div>
              <Label>الاسم الكامل</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div>
              <Label>البريد الإلكتروني (اسم المستخدم)</Label>
              <Input dir="ltr" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editBusy}>{editBusy ? "جاري..." : "حفظ"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
