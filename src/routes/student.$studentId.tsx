import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowRight, BookOpen, Info } from "lucide-react";
import { QuranProgressGrid, type RecitationLite } from "@/components/QuranProgressGrid";
import { JuzProbeGrid, type ProbeLite } from "@/components/JuzProbeGrid";
import { GRADE_LABELS, JUZ_30_SURAHS } from "@/lib/quran-data";
import { NAWAWI_HADITHS } from "@/lib/hadith-data";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/student/$studentId")({
  head: () => ({ meta: [{ title: "تسميعات الطالب" }] }),
  component: StudentView,
});

interface StudentInfo {
  full_name: string;
  nickname: string | null;
  father_name: string | null;
  mother_name: string | null;
  grade_level: string | null;
  birth_year: number | null;
}

interface ProbeRow extends ProbeLite {
  grade: string | null;
  notes: string | null;
  probe_date: string;
  recitation_type?: string | null;
}

interface HadithRow {
  id: string;
  hadith_number: number;
  grade: string | null;
  notes: string | null;
  recitation_date: string;
  archived: boolean;
  recitation_type?: string | null;
}

function StudentView() {
  const { studentId } = Route.useParams();
  const { session } = useAuth();
  const [name, setName] = useState<string>("");
  const [recitations, setRecitations] = useState<RecitationLite[]>([]);
  const [full, setFull] = useState<any[]>([]);
  const [probes, setProbes] = useState<ProbeRow[]>([]);
  const [hadiths, setHadiths] = useState<HadithRow[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [infoOpen, setInfoOpen] = useState(false);
  const [info, setInfo] = useState<StudentInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: basic }, { data: rec }, { data: pr }, { data: hd }, { data: pts }] = await Promise.all([
        supabase.rpc("get_student_basic", { _student_id: studentId }),
        supabase.rpc("get_student_recitations", { _student_id: studentId }),
        supabase.rpc("get_student_probes", { _student_id: studentId }),
        supabase.rpc("get_student_hadiths", { _student_id: studentId }),
        supabase.rpc("get_student_total_points", { _student_id: studentId }),
      ]);
      if (basic && basic.length > 0) setName(basic[0].full_name);
      setRecitations((rec ?? []) as RecitationLite[]);
      setFull(rec ?? []);
      setProbes((pr ?? []) as ProbeRow[]);
      setHadiths((hd ?? []) as HadithRow[]);
      setTotalPoints(typeof pts === "number" ? pts : 0);
      setLoading(false);
    })();
  }, [studentId]);

  async function openInfo() {
    setInfoOpen(true);
    if (info) return;
    setInfoLoading(true);
    const { data } = await supabase
      .from("students")
      .select("full_name, nickname, father_name, mother_name, grade_level, birth_year")
      .eq("id", studentId)
      .maybeSingle();
    setInfo((data as StudentInfo) ?? null);
    setInfoLoading(false);
  }

  if (loading) return <div className="p-10 text-center" dir="rtl">جاري التحميل...</div>;
  if (!name) return (
    <div className="p-10 text-center" dir="rtl">
      <p>الطالب غير موجود.</p>
      <Button asChild className="mt-4"><Link to="/">العودة</Link></Button>
    </div>
  );

  const recitedCount = recitations.filter((r) => !r.archived).length;
  const archivedCount = recitations.filter((r) => r.archived).length;
  const probedCount = probes.filter((p) => !p.archived).length;
  const hadithCount = hadiths.filter((h) => !h.archived).length;

  const hadithStatus = new Map<number, "recited" | "archived">();
  for (const h of hadiths) {
    const cur = hadithStatus.get(h.hadith_number);
    if (!cur || (cur === "archived" && !h.archived)) {
      hadithStatus.set(h.hadith_number, h.archived ? "archived" : "recited");
    }
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm hover:text-primary">
            <ArrowRight className="size-4" />
            رجوع
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BookOpen className="size-5 text-primary" />
            <span className="text-sm font-bold">مسجد الغفران</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{name}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span><strong className="text-recited">{recitedCount}</strong> تسميع في السنة الحالية</span>
                {archivedCount > 0 && (
                  <span><strong className="text-amber-600">{archivedCount}</strong> من سنوات سابقة</span>
                )}
                <span><strong className="text-recited">{probedCount}</strong> جزء مسبور</span>
                <span><strong className="text-recited">{hadithCount}</strong> حديث</span>
              </div>
            </div>
            {session && (
              <Button variant="outline" size="sm" onClick={openInfo}>
                <Info className="size-4" /> معلومات الطالب
              </Button>
            )}
          </div>
          <div className="mt-4 rounded-lg border bg-primary/5 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">مجموع النقاط</div>
              <div className="text-3xl font-black text-primary">{totalPoints}</div>
            </div>
            <div className="text-xs text-muted-foreground text-left">
              4 نقاط / صفحة جديدة<br/>
              4 حضور • 2 حضور متأخر
            </div>
          </div>
        </Card>


        <Tabs defaultValue="recitations" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="recitations" className="flex-1">التسميعات</TabsTrigger>
            <TabsTrigger value="probes" className="flex-1">سبر الأجزاء في الأوقاف</TabsTrigger>
            <TabsTrigger value="hadiths" className="flex-1">الأربعين النووية</TabsTrigger>
          </TabsList>

          <TabsContent value="recitations" className="pt-4">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <Card className="p-5"><QuranProgressGrid recitations={recitations} /></Card>
              <Card className="p-5 h-fit lg:sticky lg:top-20">
                <h2 className="mb-3 font-bold">سجل التسميعات</h2>
                {full.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد تسميعات بعد.</p>
                ) : (
                  <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {full.map((r) => {
                      const isOld = (r.recitation_type ?? "new") === "old";
                      return (
                      <li key={r.id} className={`rounded-md border p-3 text-sm ${r.archived ? "bg-archived/20" : isOld ? "bg-amber-500/15 border-amber-500/40" : "bg-recited/10"}`}>
                        <div className="font-semibold flex items-center gap-2 flex-wrap">
                          <span>{r.kind === "page"
                            ? `صفحة ${r.page_number}`
                            : `سورة ${JUZ_30_SURAHS.find((s) => s.number === r.surah_number)?.name ?? r.surah_number}`}</span>
                          {isOld && !r.archived && (
                            <span className="rounded-full bg-amber-500/25 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">قديم</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{r.recitation_date}</span>
                          {r.grade && <span>{GRADE_LABELS[r.grade]}</span>}
                        </div>
                        {r.notes && <div className="mt-1 text-xs">{r.notes}</div>}
                      </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="probes" className="pt-4">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <Card className="p-5">
                <h2 className="mb-3 font-bold">سبر الأجزاء في الأوقاف</h2>
                <JuzProbeGrid probes={probes} />
              </Card>
              <Card className="p-5 h-fit lg:sticky lg:top-20">
                <h2 className="mb-3 font-bold">سجل السبر</h2>
                {probes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا يوجد سبر مسجَّل بعد.</p>
                ) : (
                  <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {probes.map((p) => (
                      <li key={p.id} className={`rounded-md border p-3 text-sm ${p.archived ? "bg-archived/20" : "bg-recited/10"}`}>
                        <div className="font-semibold">سبر الجزء {p.juz_number}</div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{p.probe_date}</span>
                          {p.grade && <span>{GRADE_LABELS[p.grade]}</span>}
                        </div>
                        {p.notes && <div className="mt-1 text-xs">{p.notes}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="hadiths" className="pt-4">
            <Card className="p-5">
              <h2 className="mb-3 font-bold">الأربعين النووية (42 حديث)</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                <Legend className="bg-card border" label="لم يُسمَّع" />
                <Legend className="bg-recited text-recited-foreground" label="مُسمَّع (السنة الحالية)" />
                <Legend className="bg-archived text-archived-foreground" label="سنة سابقة" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {NAWAWI_HADITHS.map((h) => {
                  const s = hadithStatus.get(h.number);
                  return (
                    <div key={h.number} className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      !s && "bg-card",
                      s === "recited" && "bg-recited text-recited-foreground border-recited",
                      s === "archived" && "bg-archived text-archived-foreground border-archived/70",
                    )}>
                      <span className="font-bold">{h.number}.</span> {h.title}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader><DialogTitle>معلومات الطالب</DialogTitle></DialogHeader>
          {infoLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">جاري التحميل...</p>
          ) : !info ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>
          ) : (
            <div className="rounded-lg border bg-card p-4 text-sm">
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InfoRow label="اسم الطالب" value={info.full_name} />
                <InfoRow label="كنية الطالب" value={info.nickname} />
                <InfoRow label="اسم الأب" value={info.father_name} />
                <InfoRow label="اسم الأم" value={info.mother_name} />
                <InfoRow label="المرحلة الدراسية" value={info.grade_level} />
                <InfoRow label="عام الميلاد" value={info.birth_year != null ? String(info.birth_year) : null} />
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

function Legend({ className, label }: { className?: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-block size-4 rounded border", className)} />
      <span>{label}</span>
    </div>
  );
}
