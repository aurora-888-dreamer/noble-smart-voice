import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Mic } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BottomNav } from "./BottomNav";

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

export function AppShell({
  title,
  children,
  showFab = true,
}: {
  title: string;
  children: ReactNode;
  showFab?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const [dir, setDir] = useState<"in" | "left" | "right">("in");

  useEffect(() => {
    const prev = sessionStorage.getItem("noble:swipeDir") as "left" | "right" | null;
    setDir(prev ?? "in");
    // Clear after mount so subsequent unrelated re-renders don't animate.
    sessionStorage.removeItem("noble:swipeDir");
  }, [pathname]);

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

  return (
    <div className="min-h-dvh bg-background text-foreground" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Noble</span>
          <h1 className="ml-2 text-base font-semibold">{title}</h1>
        </div>
      </header>
      <main key={pathname} className={`mx-auto max-w-md px-4 pt-4 pb-32 ${anim}`}>
        {children}
      </main>
      {showFab && (
        <Link
          to="/voice"
          aria-label="Voice capture"
          className="fixed bottom-20 right-4 z-40 grid place-items-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
        >
          <Mic size={24} />
        </Link>
      )}
      <BottomNav />
    </div>
  );
}
