import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus } from "ai";
import { Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { loadAssistant, resetAssistant } from "@/lib/assistant.functions";
import { streamEventSchema, messageText, type AssistantMessage } from "@/lib/assistant-contract";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolHeader, ToolContent, ToolOutput } from "@/components/ai-elements/tool";

type Initial = { messages: AssistantMessage[]; generation: string | null; busyUntil: string | null };
export function AdminAssistant({ initial }: { initial: Initial }) {
  const [messages, setMessages] = useState(initial.messages);
  const [generation, setGeneration] = useState(initial.generation);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const cancellation = useRef<AbortController | null>(null);
  const load = useServerFn(loadAssistant);
  const reset = useServerFn(resetAssistant);
  const queryClient = useQueryClient();
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => { textarea.current?.focus(); return () => { cancellation.current?.abort(); }; }, []);
  useEffect(() => { if (!busy && !resetOpen) textarea.current?.focus(); }, [busy, resetOpen]);
  async function send(value: string) {
    const question = value.trim();
    if (!question || busy || resetting) return;
    const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: question }] };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMessage]);
    setText(""); setError(""); setStatus("submitted"); textarea.current?.focus();
    const abort = new AbortController(); cancellation.current = abort;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("يرجى تسجيل الدخول مجددًا");
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ text: question, generation }), signal: abort.signal });
      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("تعذر استلام الإجابة");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", completed = false, answer = "";
      let parts: AssistantMessage["parts"] = [];
      const update = () => setMessages((prev) => {
        const assistant: AssistantMessage = { id: assistantId, role: "assistant", parts: [...parts, ...(answer ? [{ type: "text" as const, text: answer }] : [])] };
        return prev.some((m) => m.id === assistantId) ? prev.map((m) => m.id === assistantId ? assistant : m) : [...prev, assistant];
      });
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = streamEventSchema.parse(JSON.parse(line));
          if (event.type === "error") throw new Error(event.message);
          if (event.type === "text") { setStatus("streaming"); answer += event.delta; update(); }
          if (event.type === "stats") { parts = [{ type: "dynamic-tool", toolName: "student_statistics", toolCallId: assistantId, state: "output-available", input: event.input, output: event.output }]; update(); }
          if (event.type === "done") { completed = true; setMessages(event.messages); }
        }
        if (chunk.done) break;
      }
      if (!completed) throw new Error("انقطع الاتصال؛ لم تُحفظ الإجابة كاملة");
      const latest = await load(); setGeneration(latest.generation);
      queryClient.setQueryData(["admin-assistant"], latest);
      setStatus("ready");
    } catch (err) {
      setError(abort.signal.aborted ? "تم إيقاف الإجابة." : err instanceof Error ? err.message : "تعذر إكمال الإجابة");
      setText(question); setStatus("error");
      try { const latest = await load(); setGeneration(latest.generation); queryClient.setQueryData(["admin-assistant"], latest); } catch { /* Keep visible partial output. */ }
    } finally { cancellation.current = null; textarea.current?.focus(); }
  }
  async function newConversation() {
    setResetting(true);
    try { await reset(); const latest = await load(); setMessages([]); setGeneration(latest.generation); setText(""); setError(""); setStatus("ready"); queryClient.setQueryData(["admin-assistant"], latest); setResetOpen(false); }
    catch { toast.error("تعذر بدء محادثة جديدة"); } finally { setResetting(false); }
  }
  return <section className="flex h-[calc(100dvh-230px)] min-h-[380px] flex-col gap-4" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
      <div className="flex items-center gap-3"><img src={logo} className="h-12 w-auto" alt="مسجد الغفران" /><h1 className="text-xl font-bold">مساعد المدير</h1></div>
      <Button variant="outline" onClick={() => messages.length ? setResetOpen(true) : void newConversation()} disabled={busy || resetting}><Plus className="size-4" />محادثة جديدة</Button>
    </div>
    <Conversation className="min-h-0 rounded-none" aria-label="محادثة مساعد المدير">
      <ConversationContent className="gap-6 px-1">
        {!messages.length && <div className="flex flex-col items-center gap-4 py-10 text-center"><img src={logo} className="h-24 w-auto" alt="مساعد مسجد الغفران" /><h2 className="text-lg font-bold">السلام عليكم، بماذا أساعدك؟</h2><div className="flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => void send("كم صفحة سمّع كل طالب هذا الشهر؟")}>تسميعات هذا الشهر</Button><Button variant="outline" onClick={() => void send("رتب الطلاب حسب مجموع النقاط في جميع الدورات")}>ترتيب الطلاب بالنقاط</Button></div></div>}
        {messages.map((message) => <Message key={message.id} from={message.role} className="max-w-full">
          <MessageContent className={message.role === "user" ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground group-[.is-user]:ml-0 group-[.is-user]:mr-auto" : "w-full bg-transparent"}>
            {message.parts.map((part, i) => part.type === "text" ? <MessageResponse key={i} className="min-w-0 break-words [overflow-wrap:anywhere] [&_table]:text-xs [&_table]:w-full [&_th]:whitespace-normal [&_td]:whitespace-normal">{part.text}</MessageResponse> : <Tool key={i} defaultOpen={false} className="max-w-full"><ToolHeader type="dynamic-tool" toolName="student_statistics" title="إحصاءات الطلاب" state="output-available" /><ToolContent><ToolOutput output={<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(part.output, null, 2)}</pre>} errorText={undefined} /></ToolContent></Tool>)}
          </MessageContent>
          {message.role === "assistant" && messageText(message) && <Button className="self-start" variant="ghost" size="icon" title="نسخ الإجابة" aria-label="نسخ الإجابة" onClick={() => void navigator.clipboard.writeText(messageText(message)).then(() => toast.success("تم نسخ الإجابة"), () => toast.error("تعذر النسخ"))}><Copy className="size-4" /></Button>}
        </Message>)}
        {status === "submitted" && <Shimmer className="text-sm">جاري قراءة بيانات الطلاب...</Shimmer>}
      </ConversationContent><ConversationScrollButton aria-label="آخر رسالة" />
    </Conversation>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <PromptInput onSubmit={({ text: value }) => send(value)} className="shrink-0">
      <PromptInputTextarea ref={textarea} value={text} onChange={(e) => setText(e.target.value)} placeholder="كم صفحة سمّع كل طالب من 2026-11-01 إلى 2026-11-24؟" aria-label="سؤالك للمساعد" className="min-h-20 text-base" maxLength={12000} />
      <PromptInputFooter className="justify-end"><PromptInputSubmit status={status} onStop={() => cancellation.current?.abort()} disabled={resetting || (!busy && !text.trim())} aria-label={busy ? "إيقاف الإجابة" : "إرسال السؤال"} title={busy ? "إيقاف الإجابة" : "إرسال السؤال"} /></PromptInputFooter>
    </PromptInput>
    <AlertDialog open={resetOpen} onOpenChange={setResetOpen}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>بدء محادثة جديدة؟</AlertDialogTitle><AlertDialogDescription>سيتم مسح المحادثة الحالية من حسابك. لا تتأثر بيانات الطلاب.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction disabled={resetting} onClick={(e) => { e.preventDefault(); void newConversation(); }}>بدء محادثة جديدة</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}