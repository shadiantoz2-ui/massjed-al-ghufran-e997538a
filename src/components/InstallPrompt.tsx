import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (isIos) {
      setIosHint(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-primary/30 bg-card p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="أيقونة التطبيق" className="size-11 rounded-lg border" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">تثبيت المنصة كتطبيق</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {iosHint ? (
              <>
                اضغط على زر المشاركة <Share className="inline size-3" /> ثم اختر «إضافة إلى الشاشة
                الرئيسية».
              </>
            ) : (
              "أضف الموقع إلى الشاشة الرئيسية لفتحه بسرعة كتطبيق."
            )}
          </p>
          <div className="mt-3 flex gap-2">
            {!iosHint && (
              <Button size="sm" onClick={install}>
                <Download className="size-4" />
                تثبيت
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss}>
              لاحقاً
            </Button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="إغلاق" className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
