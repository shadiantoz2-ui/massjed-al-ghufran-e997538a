import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, BookOpen, LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "منصة مسجد الغفران لتسميعات القرآن" },
      { name: "description", content: "ابحث عن اسمك لعرض تسميعاتك من القرآن الكريم." },
    ],
  }),
  component: Index,
});

interface StudentResult {
  id: string;
  full_name: string;
}

function Index() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const { data, error } = await supabase.rpc("search_students_by_name", { _query: query.trim() });
    setSearching(false);
    if (error) {
      console.error(error);
      return;
    }
    setResults((data as StudentResult[]) ?? []);
    setSearched(true);
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-6 text-primary" />
            <div>
              <div className="text-sm font-bold leading-tight">مسجد الغفران</div>
              <div className="text-xs text-muted-foreground leading-tight">منصة تسميعات القرآن</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">
                <LogIn className="size-4" />
                دخول المعلمين
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">السلام عليكم ورحمة الله</h1>
          <p className="mt-2 text-muted-foreground">
            اكتب اسمك للاطلاع على تسميعاتك من القرآن الكريم.
          </p>
        </div>

        <Card className="mt-8 p-5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              dir="rtl"
              placeholder="اكتب اسم الطالب..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-base"
            />
            <Button type="submit" disabled={searching || !query.trim()}>
              <Search className="size-4" />
              بحث
            </Button>
          </form>

          {results.length > 0 && (
            <ul className="mt-5 divide-y rounded-lg border">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => navigate({ to: "/student/$studentId", params: { studentId: s.id } })}
                    className="flex w-full items-center justify-between px-4 py-3 text-right hover:bg-accent"
                  >
                    <span className="font-medium">{s.full_name}</span>
                    <span className="text-xs text-muted-foreground">عرض التسميعات ←</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {results.length === 0 && query.trim().length > 0 && (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              اضغط على زر البحث لعرض النتائج
            </p>
          )}
        </Card>

        <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">للمعلمين:</span> سجّل دخولك من زر «دخول
            المعلمين» في أعلى الصفحة لإدارة الطلاب وإدخال التسميعات.
          </p>
        </div>
      </main>
    </div>
  );
}
