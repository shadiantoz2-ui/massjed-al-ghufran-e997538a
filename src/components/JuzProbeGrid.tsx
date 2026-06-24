import { cn } from "@/lib/utils";

export interface ProbeLite {
  id: string;
  juz_number: number;
  archived: boolean;
}

interface Props {
  probes: ProbeLite[];
  onJuzClick?: (juz: number) => void;
}

export function JuzProbeGrid({ probes, onJuzClick }: Props) {
  const status = new Map<number, "recited" | "archived">();
  for (const p of probes) {
    const cur = status.get(p.juz_number);
    if (!cur || (cur === "archived" && !p.archived)) {
      status.set(p.juz_number, p.archived ? "archived" : "recited");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <Legend className="bg-card border" label="لم يُسبر" />
        <Legend className="bg-recited text-recited-foreground" label="مُسبر (السنة الحالية)" />
        <Legend className="bg-archived text-archived-foreground" label="سنة سابقة" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => {
          const s = status.get(j);
          return (
            <button
              key={j}
              type="button"
              onClick={() => onJuzClick?.(j)}
              disabled={!onJuzClick}
              className={cn(
                "rounded-md border px-3 py-3 text-sm font-bold transition",
                !s && "bg-card hover:bg-accent",
                s === "recited" && "bg-recited text-recited-foreground border-recited",
                s === "archived" && "bg-archived text-archived-foreground border-archived/70",
                onJuzClick && "cursor-pointer",
              )}
            >
              الجزء {j}
            </button>
          );
        })}
      </div>
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
