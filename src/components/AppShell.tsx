import { Link } from "@tanstack/react-router";
import { Mic } from "lucide-react";
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({
  title,
  children,
  showFab = true,
}: {
  title: string;
  children: ReactNode;
  showFab?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Noble
          </span>
          <h1 className="ml-2 text-base font-semibold">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pt-4 pb-32 page-slide">{children}</main>
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
