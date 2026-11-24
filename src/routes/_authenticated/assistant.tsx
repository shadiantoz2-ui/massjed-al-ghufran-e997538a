import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { loadAssistant } from "@/lib/assistant.functions";
import { DashboardShell } from "@/components/DashboardShell";
import { AdminAssistant } from "@/components/AdminAssistant";

export const assistantQuery = queryOptions({ queryKey: ["admin-assistant"], queryFn: () => loadAssistant(), staleTime: 0 });
export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [
    { title: "مساعد المدير | مسجد الغفران" },
    { name: "description", content: "مساعد مدير مسجد الغفران لإحصاء تسميعات الطلاب والحضور والنقاط حسب الفترة." },
    { property: "og:title", content: "مساعد المدير | مسجد الغفران" },
    { property: "og:description", content: "محادثة خاصة بمدير مسجد الغفران حول إنجازات الطلاب." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(assistantQuery),
  component: AssistantPage,
});
function AssistantPage() {
  const { data } = useSuspenseQuery(assistantQuery);
  return <DashboardShell><AdminAssistant initial={data} /></DashboardShell>;
}