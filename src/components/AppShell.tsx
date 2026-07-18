import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Mic, Download } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useVoice } from "@/lib/voice-controller";

// Left-right swipe order across primary menus. Sliding right (→) goes back,
// sliding left (←) goes forward, matching native mobile paging.
const SWIPE_ORDER = [
  "/",
  "/calendar",
  "/tasks",
  "/notes",
  "/meetings",
  "/appointments",
  "/reminders",
  "/trips",
  "/projects",
  "/contacts",
  "/guide",
  "/settings",
];

// Simple PWA install prompt capture
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
  showFab?: boolean; // retained for backwards compat; ignored
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const [dir, setDir] = useState<"in" | "left" | "right">("in");
  const { mode, toast, supported, startActive } = useVoice();
  const [installEvt, setInstallEvt] = useState<BIP | null>(null);

  useEffect(() => {
    const prev = sessionStorage.getItem("noble:swipeDir") as "left" | "right" | null;
    setDir(prev ?? "in");
    sessionStorage.removeItem("noble:swipeDir");
  }, [pathname]);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIP);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current == null || startY.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    startX.current = null;
    startY.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    const idx = SWIPE_ORDER.indexOf(pathname);
    if (idx === -1) return;
    if (dx < 0 && idx < SWIPE_ORDER.length - 1) {
      sessionStorage.setItem("noble:swipeDir", "left");
      navigate({ to: SWIPE_ORDER[idx + 1] });
    } else if (dx > 0 && idx > 0) {
      sessionStorage.setItem("noble:swipeDir", "right");
      navigate({ to: SWIPE_ORDER[idx - 1] });
    }
  }

  const anim =
    dir === "left" ? "page-slide-left" : dir === "right" ? "page-slide-right" : "page-slide";

  async function install() {
    if (!installEvt) return;
    await installEvt.prompt();
    setInstallEvt(null);
  }

  const micWake = mode === "wake";
  const micActive = mode === "active";

  function handleMicTap() {
    if (pathname === "/") {
      startActive();
    } else {
      navigate({ to: "/record" });
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Noble</span>
          <h1 className="ml-2 text-base font-semibold flex-1 truncate">{title}</h1>
          {installEvt && (
            <button
              onClick={install}
              aria-label="Install app"
              className="grid place-items-center w-9 h-9 rounded-full border border-border text-muted-foreground active:scale-95"
              title="Install"
            >
              <Download size={16} />
            </button>
          )}
          <button
            onClick={handleMicTap}
            disabled={!supported}
            aria-label="Mic"
            className={`relative grid place-items-center w-10 h-10 rounded-full active:scale-95 transition-transform disabled:opacity-40 ${
              micActive
                ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
                : micWake
                ? "bg-accent text-accent-foreground"
                : "bg-primary text-primary-foreground shadow-md shadow-primary/30"
            }`}
          >
            {micActive && <span className="absolute inset-0 rounded-full bg-destructive mic-pulse" />}
            <Mic size={18} className="relative" />
          </button>
        </div>
        {micActive && (
          <div className="mx-auto max-w-md px-4 pb-2">
            <p className="text-[10px] text-destructive-foreground/90 bg-destructive/10 border border-destructive/30 rounded-full px-3 py-1.5 text-center">
              Listening for a command… try “go record” / “buka tugas”, etc.
            </p>
          </div>
        )}
        {micWake && !micActive && (
          <div className="mx-auto max-w-md px-4 pb-2">
            <p className="text-[10px] text-muted-foreground text-center">
              Wake listener on — say the wake phrase to activate
            </p>
          </div>
        )}
      </header>
      <main key={pathname} className={`mx-auto max-w-md px-4 pt-4 pb-24 ${anim}`}>
        {children}
      </main>
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 px-4 py-2 rounded-full bg-foreground text-background text-xs font-medium shadow-lg">
          {toast}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
