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
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
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
  student_phone: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  address: string | null;
  father_job: string | null;
  birth_date: string | null;
  grade_level: string | null;
}

interface ProbeRow extends ProbeLite {
  grade: string | null;
  notes: string | null;
  probe_date: string;
}

function StudentView() {
  const { studentId } = Route.useParams();
  const { session } = useAuth();
  const [name, setName] = useState<string>("");
  const [recitations, setRecitations] = useState<RecitationLite[]>([]);
  const [full, setFull] = useState<any[]>([]);
  const [probes, setProbes] = useState<ProbeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [infoOpen, setInfoOpen] = useState(false);
  const [info, setInfo] = useState<StudentInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: basic }, { data: rec }, { data: pr }] = await Promise.all([
        supabase.rpc("get_student_basic", { _student_id: studentId }),
        supabase.rpc("get_student_recitations", { _student_id: studentId }),
        supabase.rpc("get_student_probes", { _student_id: studentId }),
      ]);
      if (basic && basic.length > 0) setName(basic[0].full_name);
      setRecitations((rec ?? []) as RecitationLite[]);
      setFull(rec ?? []);
      setProbes((pr ?? []) as ProbeRow[]);
      setLoading(false);
    })();
  }, [studentId]);

  async function openInfo() {
    setInfoOpen(true);
    if (info) return;
    setInfoLoading(true);
    const { data } = await supabase.from("students").select("*").eq("id", studentId).maybeSingle();
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
                <span>
                  <strong className="text-recited">{recitedCount}</strong> تسميع في السنة الحالية
                </span>
                {archivedCount > 0 && (
                  <span>
                    <strong className="text-amber-600">{archivedCount}</strong> من سنوات سابقة
                  </span>
                )}
                <span>
                  <strong className="text-recited">{probedCount}</strong> جزء مسبور
                </span>
              </div>
            </div>
            {session && (
              <Button variant="outline" size="sm" onClick={openInfo}>
                <Info className="size-4" /> معلومات الطالب
              </Button>
            )}
          </div>
        </Card>

        <Tabs defaultValue="recitations" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="recitations" className="flex-1">التسميعات</TabsTrigger>
            <TabsTrigger value="probes" className="flex-1">سبر الأجزاء في الأوقاف</TabsTrigger>
          </TabsList>

          <TabsContent value="recitations" className="pt-4">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <Card className="p-5">
                <QuranProgressGrid recitations={recitations} />
              </Card>

              <Card className="p-5 h-fit lg:sticky lg:top-20">
                <h2 className="mb-3 font-bold">سجل التسميعات</h2>
                {full.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد تسميعات بعد.</p>
                ) : (
                  <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {full.map((r) => (
                      <li
                        key={r.id}
                        className={`rounded-md border p-3 text-sm ${r.archived ? "bg-archived/20" : "bg-recited/10"}`}
                      >
                        <div className="font-semibold">
                          {r.kind === "page"
                            ? `صفحة ${r.page_number}`
                            : `سورة ${JUZ_30_SURAHS.find((s) => s.number === r.surah_number)?.name ?? r.surah_number}${
                                r.from_ayah && r.to_ayah ? ` (${r.from_ayah}-${r.to_ayah})` : ""
                              }`}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{r.recitation_date}</span>
                          {r.grade && <span>{GRADE_LABELS[r.grade]}</span>}
                        </div>
                        {r.notes && <div className="mt-1 text-xs">{r.notes}</div>}
                      </li>
                    ))}
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
                      <li
                        key={p.id}
                        className={`rounded-md border p-3 text-sm ${p.archived ? "bg-archived/20" : "bg-recited/10"}`}
                      >
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
        </Tabs>
      </main>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>معلومات الطالب</DialogTitle>
          </DialogHeader>
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
                <InfoRow label="تاريخ الميلاد" value={info.birth_date} />
                <InfoRow label="هاتف الطالب" value={info.student_phone} />
                <InfoRow label="هاتف الأب" value={info.father_phone} />
                <InfoRow label="هاتف الأم" value={info.mother_phone} />
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
