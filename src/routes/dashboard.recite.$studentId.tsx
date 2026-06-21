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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth, canEditAnyRecitation } from "@/lib/auth-context";
import { QuranProgressGrid, type RecitationLite } from "@/components/QuranProgressGrid";
import { GRADE_LABELS, JUZ_30_SURAHS, pageToJuz } from "@/lib/quran-data";
import { toast } from "sonner";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/recite/$studentId")({
  head: () => ({ meta: [{ title: "تسميعات الطالب" }] }),
  component: () => (
    <DashboardShell>
      <RecitePage />
    </DashboardShell>
  ),
});

interface FullRecitation extends RecitationLite {
  teacher_id: string;
  grade: string | null;
  notes: string | null;
  recitation_date: string;
  academic_year: number;
}

function RecitePage() {
  const { studentId } = Route.useParams();
  const { user, roles } = useAuth();
  const canEditAll = canEditAnyRecitation(roles);

  const [name, setName] = useState("");
  const [recs, setRecs] = useState<FullRecitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FullRecitation | null>(null);
  const [kind, setKind] = useState<"page" | "surah">("page");
  const [pageNum, setPageNum] = useState<number | "">("");
  const [surahNum, setSurahNum] = useState<number | "">("");
  const [fromAyah, setFromAyah] = useState<number | "">("");
  const [toAyah, setToAyah] = useState<number | "">("");
  const [grade, setGrade] = useState<string>("excellent");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  async function load() {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("students").select("full_name").eq("id", studentId).maybeSingle(),
      supabase.from("recitations").select("*").eq("student_id", studentId).order("recitation_date", { ascending: false }),
    ]);
    setName(s?.full_name ?? "");
    setRecs((r ?? []) as FullRecitation[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [studentId]);

  function openNew(prefill?: { kind: "page" | "surah"; page?: number; surah?: number }) {
    setEditing(null);
    setKind(prefill?.kind ?? "page");
    setPageNum(prefill?.page ?? "");
    setSurahNum(prefill?.surah ?? "");
    setFromAyah(""); setToAyah("");
    setGrade("excellent");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }
  function openEdit(r: FullRecitation) {
    setEditing(r);
    setKind(r.kind);
    setPageNum(r.page_number ?? "");
    setSurahNum(r.surah_number ?? "");
    setFromAyah(r.from_ayah ?? "");
    setToAyah(r.to_ayah ?? "");
    setGrade(r.grade ?? "excellent");
    setNotes(r.notes ?? "");
    setDate(r.recitation_date);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (kind === "page" && !pageNum) return toast.error("اختر رقم الصفحة");
    if (kind === "surah" && !surahNum) return toast.error("اختر السورة");

    const payload: any = {
      student_id: studentId,
      teacher_id: user!.id,
      kind,
      page_number: kind === "page" ? Number(pageNum) : null,
      surah_number: kind === "surah" ? Number(surahNum) : null,
      from_ayah: kind === "surah" && fromAyah ? Number(fromAyah) : null,
      to_ayah: kind === "surah" && toAyah ? Number(toAyah) : null,
      grade,
      notes: notes || null,
      recitation_date: date,
    };
    if (editing) {
      const { error } = await supabase.from("recitations").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { error } = await supabase.from("recitations").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("تم تسجيل التسميع");
    }
    setOpen(false);
    load();
  }

  async function remove(r: FullRecitation) {
    if (!confirm("حذف هذا التسميع؟")) return;
    const { error } = await supabase.from("recitations").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  }

  function canModify(r: FullRecitation) {
    return canEditAll || r.teacher_id === user?.id;
  }

  if (loading) return <p className="text-center py-10">جاري التحميل...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/dashboard/students"><ArrowRight className="size-4" /> الطلاب</Link></Button>
        <h1 className="text-xl font-bold">{name}</h1>
      </div>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid">شبكة المصحف</TabsTrigger>
          <TabsTrigger value="list">سجل التسميعات ({recs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <Card className="p-5">
            <p className="mb-4 text-sm text-muted-foreground">
              اضغط على أي صفحة أو سورة لتسجيل تسميع جديد. الأبيض = لم يُسمَّع، الأخضر = مُسمَّع، الأصفر = سنة سابقة.
            </p>
            <QuranProgressGrid
              recitations={recs}
              onPageClick={(p) => openNew({ kind: "page", page: p })}
              onSurahClick={(s) => openNew({ kind: "surah", surah: s })}
            />
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card className="p-5">
            <div className="mb-3 flex justify-end">
              <Button onClick={() => openNew()}>+ تسميع جديد</Button>
            </div>
            {recs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد تسميعات.</p>
            ) : (
              <ul className="divide-y">
                {recs.map((r) => (
                  <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {r.kind === "page"
                          ? `صفحة ${r.page_number} (الجزء ${pageToJuz(r.page_number!)})`
                          : `سورة ${JUZ_30_SURAHS.find((s) => s.number === r.surah_number)?.name}${
                              r.from_ayah && r.to_ayah ? ` (${r.from_ayah}-${r.to_ayah})` : ""
                            }`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.recitation_date} • {r.grade ? GRADE_LABELS[r.grade] : ""}
                        {r.archived && " • أرشيف"}
                      </div>
                      {r.notes && <div className="text-xs mt-1">{r.notes}</div>}
                    </div>
                    {canModify(r) && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل تسميع" : "تسميع جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>النوع</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">صفحة (الأجزاء 1–29)</SelectItem>
                  <SelectItem value="surah">سورة (جزء عمَّ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kind === "page" ? (
              <div>
                <Label>رقم الصفحة (1–581)</Label>
                <Input type="number" min={1} max={581} value={pageNum}
                  onChange={(e) => setPageNum(e.target.value ? Number(e.target.value) : "")} required />
              </div>
            ) : (
              <>
                <div>
                  <Label>السورة</Label>
                  <Select value={String(surahNum)} onValueChange={(v) => setSurahNum(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="اختر سورة" /></SelectTrigger>
                    <SelectContent>
                      {JUZ_30_SURAHS.map((s) => (
                        <SelectItem key={s.number} value={String(s.number)}>سورة {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>من آية</Label>
                    <Input type="number" min={1} value={fromAyah}
                      onChange={(e) => setFromAyah(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <Label>إلى آية</Label>
                    <Input type="number" min={1} value={toAyah}
                      onChange={(e) => setToAyah(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <Label>التقييم</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(GRADE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit">{editing ? "حفظ" : "تسجيل"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
