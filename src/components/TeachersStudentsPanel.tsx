import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ChevronDown, ChevronUp, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type Teacher = { user_id: string; full_name: string };
type Student = {
  id: string;
  full_name: string;
  father_name: string | null;
  nickname: string | null;
  grade_level: string | null;
  teacher_id: string | null;
};

function displayName(s: Student) {
  return [s.full_name, s.father_name, s.nickname].filter(Boolean).join(" ");
}

export function TeachersStudentsPanel() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: s }] = await Promise.all([
        supabase.rpc("list_teachers"),
        supabase
          .from("students")
          .select("id, full_name, father_name, nickname, grade_level, teacher_id")
          .order("full_name"),
      ]);
      setTeachers((t ?? []) as Teacher[]);
      setStudents((s ?? []) as Student[]);
      setLoading(false);
    })();
  }, []);

  const groups = useMemo(() => {
    const byTeacher = new Map<string, Student[]>();
    for (const s of students) {
      const key = s.teacher_id ?? "__none__";
      const arr = byTeacher.get(key) ?? [];
      arr.push(s);
      byTeacher.set(key, arr);
    }
    const list = teachers.map((t) => ({
      id: t.user_id,
      name: t.full_name || "بدون اسم",
      students: byTeacher.get(t.user_id) ?? [],
    }));
    const none = byTeacher.get("__none__") ?? [];
    if (none.length) list.push({ id: "__none__", name: "طلاب بدون أستاذ حلقة", students: none });
    return list;
  }, [teachers, students]);

  return (
    <Card className="p-5">
      <h2 className="mb-1 flex items-center gap-2 font-bold">
        <Users className="size-4 text-primary" /> المعلمون وطلابهم
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        اضغط على اسم المعلم لعرض طلاب حلقته، ثم افتح صفحة الطالب لإضافة التسميعات والمعلومات.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {groups.map((g) => {
            const open = openId === g.id;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : g.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-start transition",
                    open ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <span className="min-w-0 truncate font-medium">{g.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {g.students.length} طالب
                    </span>
                    {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </span>
                </button>
                {open && (
                  <div className="bg-muted/40 px-3 py-2">
                    {g.students.length === 0 ? (
                      <p className="px-1 py-1.5 text-xs text-muted-foreground">لا يوجد طلاب في هذه الحلقة.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {g.students.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{displayName(s)}</div>
                              {s.grade_level && (
                                <div className="text-[11px] text-muted-foreground">{s.grade_level}</div>
                              )}
                            </div>
                            <Button asChild size="sm">
                              <Link to="/dashboard/recite/$studentId" params={{ studentId: s.id }}>
                                <GraduationCap className="size-3.5" /> فتح
                              </Link>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
