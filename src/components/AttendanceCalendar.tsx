import { memo, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AR_MONTHS = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
];
const AR_DAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface Props {
  selected: string[];
  onToggle: (date: string) => void;
  recorded?: string[];
}

export const AttendanceCalendar = memo(function AttendanceCalendar({
  selected, onToggle, recorded = [],
}: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const recordedSet = useMemo(() => new Set(recorded), [recorded]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const out: (number | null)[] = Array.from({ length: first }, () => null);
    for (let d = 1; d <= days; d++) out.push(d);
    return out;
  }, [year, month]);

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="rounded-lg border bg-card p-3" dir="rtl">
      <div className="flex items-center justify-between">
        <Button type="button" size="icon" variant="ghost" onClick={() => shift(1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="text-sm font-bold">{AR_MONTHS[month]} {year}</div>
        <Button type="button" size="icon" variant="ghost" onClick={() => shift(-1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {AR_DAYS.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const date = iso(year, month, d);
          const isSel = selectedSet.has(date);
          const isRec = recordedSet.has(date);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onToggle(date)}
              className={cn(
                "aspect-square rounded-md border text-xs font-semibold transition-colors",
                !isSel && "bg-background hover:bg-muted",
                isSel && "bg-recited text-recited-foreground border-recited",
                !isSel && isRec && "bg-archived/30 border-archived/50",
                date === todayIso && !isSel && "ring-1 ring-primary",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded border bg-recited" /> محدد الآن
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded border bg-archived/30" /> مسجَّل مسبقاً
        </span>
      </div>
    </div>
  );
});
