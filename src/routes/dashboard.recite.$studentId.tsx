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
import { JuzProbeGrid, type ProbeLite } from "@/components/JuzProbeGrid";
import { GRADE_LABELS, JUZ_30_SURAHS, pageToJuz, TOTAL_PAGES } from "@/lib/quran-data";
import { toast } from "sonner";
import { ArrowRight, Pencil, Trash2, Layers, Info } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface FullProbe extends ProbeLite {
  teacher_id?: string;
  grade: string | null;
  notes: string | null;
  probe_date: string;
  academic_year: number;
}

interface StudentInfo {
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

interface FullHadith {
  id: string;
  hadith_number: number;
  teacher_id: string;
  grade: string | null;
  notes: string | null;
  recitation_date: string;
  archived: boolean;
}

function RecitePage() {
  const { studentId } = Route.useParams();
  const { user, roles } = useAuth();
  const canEditAll = canEditAnyRecitation(roles);

  const [name, setName] = useState("");
  const [recs, setRecs] = useState<FullRecitation[]>([]);
  const [probes, setProbes] = useState<FullProbe[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentTeacherId, setStudentTeacherId] = useState<string | null>(null);
  const [hadiths, setHadiths] = useState<FullHadith[]>([]);
  const [hadithOpen, setHadithOpen] = useState(false);
  const [hadithNum, setHadithNum] = useState<number | "">("");
  const [hadithGrade, setHadithGrade] = useState("excellent");
  const [hadithNotes, setHadithNotes] = useState("");
  const [hadithDate, setHadithDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // single recitation dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FullRecitation | null>(null);
  const [kind, setKind] = useState<"page" | "surah">("page");
  const [pageNum, setPageNum] = useState<number | "">("");
  const [surahNum, setSurahNum] = useState<number | "">("");
  const [grade, setGrade] = useState<string>("excellent");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // bulk add dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<"pages" | "surahs">("pages");
  const [fromPage, setFromPage] = useState<number | "">("");
  const [toPage, setToPage] = useState<number | "">("");
  const [selectedSurahs, setSelectedSurahs] = useState<Set<number>>(new Set());
  const [bulkGrade, setBulkGrade] = useState("excellent");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  // probe dialog
  const [probeOpen, setProbeOpen] = useState(false);
  const [editingProbe, setEditingProbe] = useState<FullProbe | null>(null);
  const [probeJuz, setProbeJuz] = useState<number | "">("");
  const [probeGrade, setProbeGrade] = useState("excellent");
  const [probeNotes, setProbeNotes] = useState("");
  const [probeDate, setProbeDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // student info dialog
  const [infoOpen, setInfoOpen] = useState(false);
  const [info, setInfo] = useState<StudentInfo | null>(null);

  async function load() {
    const [{ data: s }, { data: r }, { data: p }] = await Promise.all([
      supabase.from("students").select("full_name, nickname, father_name").eq("id", studentId).maybeSingle(),
      supabase.from("recitations").select("*").eq("student_id", studentId).order("recitation_date", { ascending: false }),
      supabase.from("probes").select("*").eq("student_id", studentId).order("probe_date", { ascending: false }),
    ]);
    setName(s ? `${s.full_name}${s.father_name ? ` ${s.father_name}` : ""}${s.nickname ? ` ${s.nickname}` : ""}` : "");
    setRecs((r ?? []) as FullRecitation[]);
    setProbes((p ?? []) as FullProbe[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [studentId]);

  async function openInfo() {
    setInfoOpen(true);
    if (info) return;
    const { data } = await supabase.from("students").select("*").eq("id", studentId).maybeSingle();
    setInfo((data as StudentInfo) ?? null);
  }

  function openNew(prefill?: { kind: "page" | "surah"; page?: number; surah?: number }) {
    setEditing(null);
    setKind(prefill?.kind ?? "page");
    setPageNum(prefill?.page ?? "");
    setSurahNum(prefill?.surah ?? "");
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
    setGrade(r.grade ?? "excellent");
    setNotes(r.notes ?? "");
    setDate(r.recitation_date);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (kind === "page" && !pageNum) return toast.error("اختر رقم الصفحة");
    if (kind === "surah" && !surahNum) return toast.error("اختر السورة");

    if (!editing) {
      const dup = recs.find(
        (r) => !r.archived && r.kind === kind &&
          (kind === "page" ? r.page_number === Number(pageNum) : r.surah_number === Number(surahNum)),
      );
      if (dup) {
        toast.warning(
          kind === "page"
            ? `الصفحة ${pageNum} مُسجَّلة مسبقاً في هذه السنة — لم تُضَف.`
            : `هذه السورة مُسجَّلة مسبقاً في هذه السنة — لم تُضَف.`,
        );
        setOpen(false);
        return;
      }
    }

    const payload: any = {
      student_id: studentId,
      teacher_id: user!.id,
      kind,
      page_number: kind === "page" ? Number(pageNum) : null,
      surah_number: kind === "surah" ? Number(surahNum) : null,
      from_ayah: null,
      to_ayah: null,
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

  function openBulk() {
    setBulkTab("pages");
    setFromPage("");
    setToPage("");
    setSelectedSurahs(new Set());
    setBulkGrade("excellent");
    setBulkNotes("");
    setBulkDate(new Date().toISOString().slice(0, 10));
    setBulkOpen(true);
  }

  function toggleSurah(n: number) {
    setSelectedSurahs((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  async function saveBulk(e: React.FormEvent) {
    e.preventDefault();
    const rows: any[] = [];
    const existingPages = new Set(recs.filter((r) => !r.archived && r.kind === "page").map((r) => r.page_number));
    const existingSurahs = new Set(recs.filter((r) => !r.archived && r.kind === "surah").map((r) => r.surah_number));
    const duplicates: string[] = [];

    if (bulkTab === "pages") {
      const f = Number(fromPage);
      const t = Number(toPage);
      if (!f || !t || f < 1 || t > TOTAL_PAGES || f > t) {
        return toast.error(`أدخل نطاق صفحات صحيح (1 - ${TOTAL_PAGES})`);
      }
      for (let p = f; p <= t; p++) {
        if (existingPages.has(p)) { duplicates.push(`صفحة ${p}`); continue; }
        rows.push({
          student_id: studentId, teacher_id: user!.id, kind: "page",
          page_number: p, surah_number: null, from_ayah: null, to_ayah: null,
          grade: bulkGrade, notes: bulkNotes || null, recitation_date: bulkDate,
        });
      }
    } else {
      if (selectedSurahs.size === 0) return toast.error("اختر سورة واحدة على الأقل");
      for (const n of selectedSurahs) {
        if (existingSurahs.has(n)) {
          const s = JUZ_30_SURAHS.find((x) => x.number === n);
          duplicates.push(`سورة ${s?.name ?? n}`);
          continue;
        }
        rows.push({
          student_id: studentId, teacher_id: user!.id, kind: "surah",
          page_number: null, surah_number: n, from_ayah: null, to_ayah: null,
          grade: bulkGrade, notes: bulkNotes || null, recitation_date: bulkDate,
        });
      }
    }

    if (duplicates.length > 0) {
      toast.warning(
        `تم تجاهل ${duplicates.length} تسميع مكرر: ${duplicates.slice(0, 5).join("، ")}${duplicates.length > 5 ? "..." : ""}`,
      );
    }
    if (rows.length === 0) {
      if (duplicates.length === 0) toast.error("لا يوجد ما يُضاف");
      setBulkOpen(false);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("recitations").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`تم تسجيل ${rows.length} تسميع`);
    setBulkOpen(false);
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

  // ========= Probes =========
  function openNewProbe(prefillJuz?: number) {
    setEditingProbe(null);
    setProbeJuz(prefillJuz ?? "");
    setProbeGrade("excellent");
    setProbeNotes("");
    setProbeDate(new Date().toISOString().slice(0, 10));
    setProbeOpen(true);
  }
  function openEditProbe(p: FullProbe) {
    setEditingProbe(p);
    setProbeJuz(p.juz_number);
    setProbeGrade(p.grade ?? "excellent");
    setProbeNotes(p.notes ?? "");
    setProbeDate(p.probe_date);
    setProbeOpen(true);
  }
  async function saveProbe(e: React.FormEvent) {
    e.preventDefault();
    if (!probeJuz) return toast.error("اختر الجزء");
    if (!editingProbe) {
      const dup = probes.find((p) => !p.archived && p.juz_number === Number(probeJuz));
      if (dup) {
        toast.warning(`الجزء ${probeJuz} مُسبر مسبقاً في هذه السنة — لم يُضَف.`);
        setProbeOpen(false);
        return;
      }
    }
    const payload: any = {
      student_id: studentId,
      teacher_id: user!.id,
      juz_number: Number(probeJuz),
      grade: probeGrade,
      notes: probeNotes || null,
      probe_date: probeDate,
    };
    if (editingProbe) {
      const { error } = await supabase.from("probes").update(payload).eq("id", editingProbe.id);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { error } = await supabase.from("probes").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("تم تسجيل السبر");
    }
    setProbeOpen(false);
    load();
  }
  async function removeProbe(p: FullProbe) {
    if (!confirm("حذف هذا السبر؟")) return;
    const { error } = await supabase.from("probes").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  }

  if (loading) return <p className="text-center py-10">جاري التحميل...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard/students"><ArrowRight className="size-4" /> الطلاب</Link></Button>
          <h1 className="text-xl font-bold">{name}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={openInfo}>
          <Info className="size-4" /> معلومات الطالب
        </Button>
      </div>

      <Tabs defaultValue="recitations">
        <TabsList className="w-full">
          <TabsTrigger value="recitations" className="flex-1">التسميعات</TabsTrigger>
          <TabsTrigger value="probes" className="flex-1">سبر الأجزاء في الأوقاف</TabsTrigger>
        </TabsList>

        {/* ====== Recitations section ====== */}
        <TabsContent value="recitations" className="space-y-4 pt-3">
          <div className="flex justify-end">
            <Button onClick={openBulk} variant="default"><Layers className="size-4" /> إضافة تسميعات</Button>
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
                              : `سورة ${JUZ_30_SURAHS.find((s) => s.number === r.surah_number)?.name}`}
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
        </TabsContent>

        {/* ====== Probes section ====== */}
        <TabsContent value="probes" className="space-y-4 pt-3">
          {!canEditAll && (
            <p className="text-xs text-muted-foreground">
              السبر يُسجَّل من قِبل المدير أو المعلم المشرف فقط.
            </p>
          )}
          <Card className="p-5">
            <p className="mb-4 text-sm text-muted-foreground">
              {canEditAll
                ? "اضغط على أي جزء لتسجيل سبر جديد. الأبيض = لم يُسبر، الأخضر = مُسبر (السنة الحالية)، الأصفر = سنة سابقة."
                : "عرض حالة سبر الأجزاء للطالب."}
            </p>
            <JuzProbeGrid
              probes={probes}
              onJuzClick={canEditAll ? (j) => openNewProbe(j) : undefined}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-bold">سجل السبر ({probes.length})</h2>
            {probes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد سبر مسجَّل.</p>
            ) : (
              <ul className="divide-y">
                {probes.map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">سبر الجزء {p.juz_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.probe_date} • {p.grade ? GRADE_LABELS[p.grade] : ""}
                        {p.archived && " • أرشيف"}
                      </div>
                      {p.notes && <div className="text-xs mt-1">{p.notes}</div>}
                    </div>
                    {canEditAll && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditProbe(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeProbe(p)}>
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

      {/* Single recitation dialog */}
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

      {/* Bulk add dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة مجموعة تسميعات</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveBulk} className="space-y-4">
            <Tabs value={bulkTab} onValueChange={(v) => setBulkTab(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="pages" className="flex-1">نطاق صفحات</TabsTrigger>
                <TabsTrigger value="surahs" className="flex-1">سور جزء عمَّ</TabsTrigger>
              </TabsList>

              <TabsContent value="pages" className="space-y-3 pt-3">
                <p className="text-sm text-muted-foreground">
                  أدخل من صفحة كذا إلى صفحة كذا، وسيتم تسجيل كل صفحة في النطاق كتسميع.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>من صفحة</Label>
                    <Input type="number" min={1} max={TOTAL_PAGES} value={fromPage}
                      onChange={(e) => setFromPage(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div>
                    <Label>إلى صفحة</Label>
                    <Input type="number" min={1} max={TOTAL_PAGES} value={toPage}
                      onChange={(e) => setToPage(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                </div>
                {fromPage && toPage && Number(toPage) >= Number(fromPage) && (
                  <p className="text-xs text-muted-foreground">
                    سيتم تسجيل {Number(toPage) - Number(fromPage) + 1} صفحة.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="surahs" className="space-y-3 pt-3">
                <p className="text-sm text-muted-foreground">اختر السور التي قام بتسميعها (يمكن اختيار أكثر من سورة).</p>
                <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto rounded-md border p-2 sm:grid-cols-3">
                  {JUZ_30_SURAHS.map((s) => {
                    const checked = selectedSurahs.has(s.number);
                    return (
                      <button
                        type="button"
                        key={s.number}
                        onClick={() => toggleSurah(s.number)}
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-right text-sm transition",
                          checked
                            ? "bg-recited text-recited-foreground border-recited"
                            : "bg-card hover:bg-accent",
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                {selectedSurahs.size > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedSurahs.size} سورة محددة.</p>
                )}
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} required />
              </div>
              <div>
                <Label>التقييم</Label>
                <Select value={bulkGrade} onValueChange={setBulkGrade}>
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
              <Label>ملاحظات (تُطبَّق على كل التسميعات)</Label>
              <Textarea rows={2} value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : "تسجيل الكل"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Probe dialog */}
      <Dialog open={probeOpen} onOpenChange={setProbeOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProbe ? "تعديل سبر" : "سبر جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveProbe} className="space-y-3">
            <div>
              <Label>الجزء</Label>
              <Select value={probeJuz ? String(probeJuz) : ""} onValueChange={(v) => setProbeJuz(Number(v))}>
                <SelectTrigger><SelectValue placeholder="اختر الجزء" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                    <SelectItem key={j} value={String(j)}>الجزء {j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={probeDate} onChange={(e) => setProbeDate(e.target.value)} required />
              </div>
              <div>
                <Label>التقييم</Label>
                <Select value={probeGrade} onValueChange={setProbeGrade}>
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
              <Textarea rows={2} value={probeNotes} onChange={(e) => setProbeNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit">{editingProbe ? "حفظ" : "تسجيل"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student info dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>معلومات الطالب</DialogTitle>
          </DialogHeader>
          {!info ? (
            <p className="py-6 text-center text-sm text-muted-foreground">جاري التحميل...</p>
          ) : (
            <div className="rounded-lg border bg-card p-4 text-sm">
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InfoRow label="اسم الطالب" value={info.full_name} />
                <InfoRow label="كنية الطالب" value={info.nickname} />
                <InfoRow label="اسم الأب" value={info.father_name} />
                <InfoRow label="اسم الأم" value={info.mother_name} />
                <InfoRow label="المرحلة الدراسية" value={info.grade_level} />
                <InfoRow label="عام الميلاد" value={info.birth_year != null ? String(info.birth_year) : null} />
                <InfoRow label="هاتف الأب" value={info.father_phone} />
                <InfoRow label="هاتف الأم" value={info.mother_phone} />
                <InfoRow label="رقم التواصل (واتساب)" value={info.contact_phone} />
                <InfoRow label="عمل الأب" value={info.father_job} />
                <InfoRow label="العنوان" value={info.address} full />
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value, full }: { label: string; value: string | null; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
