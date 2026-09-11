import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, UserPlus } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "تسجيل الطلاب في مسجد الغفران" },
      { name: "description", content: "استمارة تسجيل الطلاب الجدد في حلقات تحفيظ القرآن الكريم في مسجد الغفران." },
      { property: "og:title", content: "تسجيل الطلاب في مسجد الغفران" },
      { property: "og:description", content: "املأ بيانات الطالب لتسجيله في حلقات تحفيظ القرآن الكريم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

const EMPTY = {
  full_name: "",
  nickname: "",
  father_name: "",
  mother_name: "",
  birth_year: "",
  father_phone: "",
  mother_phone: "",
  contact_phone: "",
  father_job: "",
  grade_level: "",
  address: "",
  notes: "",
};

function RegisterPage() {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof EMPTY>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const required: [keyof typeof EMPTY, string][] = [
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
    ];
    for (const [k, label] of required) {
      if (!String(form[k]).trim()) return toast.error(`الحقل مطلوب: ${label}`);
    }
    const yr = Number(form.birth_year);
    if (!yr || yr < 1900 || yr > new Date().getFullYear()) return toast.error("عام الميلاد غير صحيح");

    setBusy(true);
    const { error } = await supabase.from("student_registrations").insert({
      full_name: form.full_name.trim(),
      nickname: form.nickname.trim(),
      father_name: form.father_name.trim(),
      mother_name: form.mother_name.trim(),
      birth_year: yr,
      father_phone: form.father_phone.trim(),
      mother_phone: form.mother_phone.trim(),
      contact_phone: form.contact_phone.trim(),
      father_job: form.father_job.trim(),
      grade_level: form.grade_level.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || null,
      status: "pending",
    });
    setBusy(false);
    if (error) return toast.error("تعذّر إرسال الطلب، حاول مرة أخرى");
    setForm({ ...EMPTY });
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8" dir="rtl">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-4" />
          العودة للصفحة الرئيسية
        </Link>

        <div className="mb-5 flex items-center gap-3">
          <img src={logo} alt="شعار مسجد الغفران" className="h-14 w-auto dark:brightness-125" />
          <div>
            <h1 className="text-xl font-bold">تسجيل الطلاب في مسجد الغفران</h1>
            <p className="text-sm text-muted-foreground">املأ البيانات وسيتم مراجعة الطلب من قبل الإدارة.</p>
          </div>
        </div>

        {done ? (
          <Card className="p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-10 text-primary" />
            <h2 className="text-lg font-bold">تم إرسال طلب التسجيل بنجاح</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              سيقوم مدير المنصة بمراجعة الطلب والموافقة عليه، جزاكم الله خيراً.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => setDone(false)}>
                <UserPlus className="size-4" /> تسجيل طالب آخر
              </Button>
              <Button asChild>
                <Link to="/">الصفحة الرئيسية</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="اسم الطالب *">
                  <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
                </Field>
                <Field label="كنية الطالب *">
                  <Input value={form.nickname} onChange={(e) => set("nickname", e.target.value)} required />
                </Field>
                <Field label="اسم الأب *">
                  <Input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} required />
                </Field>
                <Field label="اسم الأم *">
                  <Input value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} required />
                </Field>
                <Field label="عام الميلاد *">
                  <Input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    placeholder="مثال: 2012"
                    value={form.birth_year}
                    onChange={(e) => set("birth_year", e.target.value)}
                    required
                  />
                </Field>
                <Field label="المرحلة الدراسية *">
                  <Input placeholder="مثال: الصف الخامس" value={form.grade_level} onChange={(e) => set("grade_level", e.target.value)} required />
                </Field>
                <Field label="رقم الأب *">
                  <Input dir="ltr" value={form.father_phone} onChange={(e) => set("father_phone", e.target.value)} required />
                </Field>
                <Field label="رقم الأم *">
                  <Input dir="ltr" value={form.mother_phone} onChange={(e) => set("mother_phone", e.target.value)} required />
                </Field>
                <Field label="رقم التواصل (واتساب) *">
                  <Input dir="ltr" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} required />
                </Field>
                <Field label="عمل الأب *">
                  <Input value={form.father_job} onChange={(e) => set("father_job", e.target.value)} required />
                </Field>
              </div>
              <Field label="عنوان السكن *">
                <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} required />
              </Field>
              <Field label="ملاحظات (اختياري)">
                <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} />
              </Field>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "جاري الإرسال..." : "إرسال طلب التسجيل"}
              </Button>
            </form>
          </Card>
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
