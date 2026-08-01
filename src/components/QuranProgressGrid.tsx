import { memo, useMemo } from "react";
import { JUZ_30_SURAHS, JUZ_START_PAGES, TOTAL_PAGES } from "@/lib/quran-data";
import { cn } from "@/lib/utils";

export interface RecitationLite {
  id: string;
  kind: "page" | "surah";
  page_number: number | null;
  surah_number: number | null;
  from_ayah: number | null;
  to_ayah: number | null;
  archived: boolean;
  recitation_type?: string | null;
}

interface Props {
  recitations: RecitationLite[];
  onPageClick?: (page: number) => void;
  onSurahClick?: (surahNumber: number) => void;
}

export const QuranProgressGrid = memo(function QuranProgressGrid({ recitations, onPageClick, onSurahClick }: Props) {
  // Status per page: undefined | "recited" | "archived" (old counts as archived visually)
  const { pageStatus, surahStatus } = useMemo(() => {
    const pageStatus = new Map<number, "recited" | "archived">();
    const surahStatus = new Map<number, "recited" | "archived">();

    const effectiveStatus = (r: RecitationLite): "recited" | "archived" =>
      r.archived || (r.recitation_type ?? "new") === "old" ? "archived" : "recited";

    for (const r of recitations) {
      const st = effectiveStatus(r);
      if (r.kind === "page" && r.page_number) {
        const cur = pageStatus.get(r.page_number);
        if (!cur || (cur === "archived" && st === "recited")) {
          pageStatus.set(r.page_number, st);
        }
      } else if (r.kind === "surah" && r.surah_number) {
        const cur = surahStatus.get(r.surah_number);
        if (!cur || (cur === "archived" && st === "recited")) {
          surahStatus.set(r.surah_number, st);
        }
      }
    }
    return { pageStatus, surahStatus };
  }, [recitations]);


  return (
    <div className="space-y-8">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <Legend className="bg-card border" label="لم يُسمَّع" />
        <Legend className="bg-recited text-recited-foreground" label="مُسمَّع" />
        <Legend className="bg-archived text-archived-foreground" label="سنة سابقة" />
      </div>

      {/* Juz 1..29 page grids */}
      {JUZ_START_PAGES.map((startPage, i) => {
        const juz = i + 1;
        const endPage = juz === 29 ? TOTAL_PAGES : JUZ_START_PAGES[juz] - 1;
        const pages: number[] = [];
        for (let p = startPage; p <= endPage; p++) pages.push(p);

        return (
          <section key={juz}>
            <header className="mb-2 flex items-baseline justify-between border-b pb-1">
              <h3 className="font-bold text-primary">الجزء {juz}</h3>
              <span className="text-xs text-muted-foreground">
                {startPage}–{endPage}
              </span>
            </header>
            <div className="grid grid-cols-7 gap-1 sm:grid-cols-14">
              {pages.map((p) => {
                const status = pageStatus.get(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageClick?.(p)}
                    disabled={!onPageClick}
                    className={cn(
                      "aspect-square rounded border text-[10px] font-semibold transition",
                      "flex items-center justify-center",
                      !status && "bg-card hover:bg-accent",
                      status === "recited" && "bg-recited text-recited-foreground border-recited",
                      status === "archived" && "bg-archived text-archived-foreground border-archived/70",
                      onPageClick && "cursor-pointer",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Juz 30 surahs */}
      <section>
        <header className="mb-2 flex items-baseline justify-between border-b pb-1">
          <h3 className="font-bold text-primary">جزء عمَّ (الجزء 30)</h3>
          <span className="text-xs text-muted-foreground">سور</span>
        </header>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {JUZ_30_SURAHS.map((s) => {
            const status = surahStatus.get(s.number);
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => onSurahClick?.(s.number)}
                disabled={!onSurahClick}
                className={cn(
                  "rounded-md border px-3 py-2 text-right transition",
                  !status && "bg-card hover:bg-accent",
                  status === "recited" && "bg-recited text-recited-foreground border-recited",
                  status === "archived" && "bg-archived text-archived-foreground border-archived/70",
                  onSurahClick && "cursor-pointer",
                )}
              >
                <div className="text-sm font-semibold">سورة {s.name}</div>
                <div className="text-xs opacity-80">{s.ayahCount} آية</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
});


function Legend({ className, label }: { className?: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-block size-4 rounded border", className)} />
      <span>{label}</span>
    </div>
  );
}
