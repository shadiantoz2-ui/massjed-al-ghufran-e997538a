import { z } from "zod";

export const textPart = z.object({ type: z.literal("text"), text: z.string() });
export const statsPart = z.object({ type: z.literal("dynamic-tool"), toolName: z.literal("student_statistics"), toolCallId: z.string(), state: z.literal("output-available"), input: z.json(), output: z.json() });
export const messageSchema = z.object({ id: z.string(), role: z.enum(["user", "assistant"]), parts: z.array(z.union([textPart, statsPart])) });
export const messagesSchema = z.array(messageSchema);
export type AssistantMessage = z.infer<typeof messageSchema>;
export const planSchema = z.object({
  from: z.iso.date().nullable(), to: z.iso.date().nullable(),
  name: z.string(), courseId: z.uuid().nullable(), clarification: z.string().nullable(),
}).refine((p) => !p.from || !p.to || p.from <= p.to, "تاريخ البداية يجب أن يسبق النهاية");
export const streamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("stats"), input: z.json(), output: z.json() }),
  z.object({ type: z.literal("done"), messages: messagesSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export function isAssistantAdmin(roles: readonly string[]) { return roles.includes("admin"); }
export function messageText(message: AssistantMessage) { return message.parts.filter((p) => p.type === "text").map((p) => p.text).join("\n"); }