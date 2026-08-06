import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { Crown, ShoppingBag, Shield, FileText, Home } from "lucide-react";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "AURORA MASTER — Noble Smart Voice" },
      { name: "description", content: "AURORA MASTER — Buy, activate, and manage Noble Smart Voice subscriptions. Monthly, quarterly, yearly, or lifetime Premium." },
      { property: "og:title", content: "AURORA MASTER — Noble Smart Voice" },
      { property: "og:description", content: "Storefront and admin console for Noble Smart Voice — the voice-first executive assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreLayout,
});

function StoreLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Ambient background matches the Noble app: deep navy + champagne glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 15% -10%, oklch(0.74 0.11 80 / 0.18), transparent 60%), radial-gradient(900px 500px at 90% 10%, oklch(0.55 0.09 260 / 0.25), transparent 60%), radial-gradient(700px 500px at 50% 100%, oklch(0.74 0.11 80 / 0.10), transparent 60%)",
        }}
      />

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/store/admin" className="flex items-center gap-2" aria-label="Admin">
            <Crown className="text-primary" size={22} />
            <div className="leading-tight">
              <div
                className="text-sm font-semibold tracking-[0.2em]"
                style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)" }}
              >
                AURORA MASTER
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Digital & Kreatif
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-xs">
            <NavLink to="/store" active={path === "/store"}>
              <Home size={14} /> Home
            </NavLink>
            <NavLink to="/store/order" active={path.startsWith("/store/order")}>
              <ShoppingBag size={14} /> Order
            </NavLink>
            <NavLink to="/store/privacy" active={path === "/store/privacy"}>
              <Shield size={14} /> Privacy
            </NavLink>
            <NavLink to="/store/terms" active={path === "/store/terms"}>
              <FileText size={14} /> Terms
            </NavLink>
          </nav>
          <Link
            to="/store/order"
            className="md:hidden inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold"
          >
            <ShoppingBag size={14} /> Order
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-xs text-muted-foreground flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} AURORA MASTER — Digital & Kreatif · NMID: ID1026535963593
          </div>
          <div className="flex gap-4">
            <Link to="/store/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/store/terms" className="hover:text-foreground">Terms & Conditions</Link>
            <Link to="/" className="hover:text-foreground">Open App</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </Link>
  );
}
