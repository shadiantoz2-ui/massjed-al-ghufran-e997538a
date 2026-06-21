import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { QuranProgressGrid, type RecitationLite } from "@/components/QuranProgressGrid";
import { GRADE_LABELS, JUZ_30_SURAHS } from "@/lib/quran-data";

export const Route = createFileRoute("/student/$studentId")({
  head: () => ({ meta: [{ title: "تسميعات الطالب" }] }),
  component: StudentView,
});

function StudentView() {
  const { studentId } = Route.useParams();
  const [name, setName] = useState<string>("");
  const [recitations, setRecitations] = useState<RecitationLite[]>([]);
  const [full, setFull] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: basic }, { data: rec }] = await Promise.all([
        supabase.rpc("get_student_basic", { _student_id: studentId }),
        supabase.rpc("get_student_recitations", { _student_id: studentId }),
      ]);
      if (basic && basic.length > 0) setName(basic[0].full_name);
      setRecitations((rec ?? []) as RecitationLite[]);
      setFull(rec ?? []);
      setLoading(false);
    })();
  }, [studentId]);

  if (loading) return <div className="p-10 text-center" dir="rtl">جاري التحميل...</div>;
  if (!name) return (
    <div className="p-10 text-center" dir="rtl">
      <p>الطالب غير موجود.</p>
      <Button asChild className="mt-4"><Link to="/">العودة</Link></Button>
    </div>
  );

  const recitedCount = recitations.filter((r) => !r.archived).length;
  const archivedCount = recitations.filter((r) => r.archived).length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm hover:text-primary">
            <ArrowRight className="size-4" />
            رجوع
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <span className="text-sm font-bold">مسجد الغفران</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Card className="p-5">
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
          </div>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
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
      </main>
    </div>
  );
}
