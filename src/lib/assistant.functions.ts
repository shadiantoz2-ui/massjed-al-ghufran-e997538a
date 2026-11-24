import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { messagesSchema } from "./assistant-contract";

export const loadAssistant = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (roleError || !admin) throw new Error("هذه الصفحة للمدير فقط");
  const { data, error } = await context.supabase.from("admin_conversations").select("messages,generation,busy_until").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error("تعذر تحميل المحادثة");
  return { messages: messagesSchema.parse(data?.messages ?? []), generation: data?.generation ?? null, busyUntil: data?.busy_until ?? null };
});

export const resetAssistant = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (roleError || !admin) throw new Error("هذه الصفحة للمدير فقط");
  const { error } = await context.supabase.from("admin_conversations").upsert({ user_id: context.userId, messages: [], generation: crypto.randomUUID(), busy_until: null, updated_at: new Date().toISOString() });
  if (error) throw new Error("تعذر بدء محادثة جديدة");
  return { ok: true };
});