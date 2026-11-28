import { supabase } from "@/integrations/supabase/client";

// Short-lived in-memory cache for reference data that many pages re-read on every
// mount (teacher list, current course, course list, student rosters).
// Values are refreshed after their TTL or immediately after a write that changes them.
const store = new Map<string, { at: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();

export function cachedRead<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value as T);
  const running = pending.get(key);
  if (running) return running as Promise<T>;
  const p = load()
    .then((value) => {
      store.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => {
      if (pending.get(key) === p) pending.delete(key);
    });
  pending.set(key, p);
  return p;
}

export function invalidateCached(prefix = ""): void {
  for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key);
  for (const key of [...pending.keys()]) if (key.startsWith(prefix)) pending.delete(key);
}

export const TEACHERS_TTL = 60_000;
export const COURSE_TTL = 60_000;
export const STUDENTS_TTL = 20_000;

export type TeacherOption = { user_id: string; full_name: string };
export type CourseOption = { id: string; name: string; year: number; is_current: boolean };

export function cachedTeachers(): Promise<TeacherOption[]> {
  return cachedRead("teachers", TEACHERS_TTL, async () => {
    const { data } = await supabase.rpc("list_teachers");
    return (data ?? []) as TeacherOption[];
  });
}

export function cachedCurrentCourse(): Promise<{ id: string; name: string; year: number } | null> {
  return cachedRead("course:current", COURSE_TTL, async () => {
    const { data } = await supabase.rpc("get_current_course");
    const row = Array.isArray(data) && data.length ? (data[0] as any) : null;
    return row ? { id: row.id, name: row.name, year: row.year } : null;
  });
}

export function cachedCourses(): Promise<CourseOption[]> {
  return cachedRead("courses", COURSE_TTL, async () => {
    const { data } = await supabase.rpc("list_courses" as any);
    return (data ?? []) as CourseOption[];
  });
}
