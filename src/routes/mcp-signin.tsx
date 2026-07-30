import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Account sign-in used only by the OAuth consent flow for agent integrations
 * (MCP). It always returns the user to the `next` URL they came from, so the
 * connecting client (ChatGPT, Claude, Cursor …) completes its handshake.
 */
export const Route = createFileRoute("/mcp-signin")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "/",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Noble Smart Voice agent integrations" },
      { name: "description", content: "Sign in to approve an AI assistant connecting to your Noble Smart Voice account." },
      { property: "og:title", content: "Sign in — Noble Smart Voice agent integrations" },
      { property: "og:description", content: "Approve an AI assistant connecting to your Noble Smart Voice account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignInPage,
});

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function SignInPage() {
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const target = safeNext(next);
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (err) { setError(err.message); return; }
      window.location.href = target;
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${target}` },
      });
      setBusy(false);
      if (err) { setError(err.message); return; }
      setInfo("Check your email to confirm the account, then come back here.");
    }
  }

  async function google() {
    const target = safeNext(next);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${target}` },
    });
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-3">
        <h1 className="text-lg font-semibold">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">
          Required so the AI assistant connects as you.
        </p>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email"
          className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password"
          className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
        />
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {info && <p className="text-xs text-muted-foreground">{info}</p>}
        <button
          type="submit" disabled={busy}
          className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button" onClick={google}
          className="w-full rounded-lg border border-border px-4 py-2 text-sm font-semibold"
        >
          Continue with Google
        </button>
        <button
          type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
          className="w-full text-xs text-muted-foreground underline"
        >
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
