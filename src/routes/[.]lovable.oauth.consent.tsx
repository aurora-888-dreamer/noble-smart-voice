import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth 2.1 consent screen. Supabase redirects here when an MCP client
 * (ChatGPT, Claude, Cursor …) asks to connect to this app on the user's
 * behalf. Approving mints a token that Noble's MCP server verifies.
 */
export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/mcp-signin", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oauth = (supabase.auth as any).oauth;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen grid place-items-center p-6 text-sm">
      Could not load this authorization request: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oauth = (supabase.auth as any).oauth;
    const { data, error: err } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (err) { setBusy(false); setError(err.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-lg font-semibold">Connect {clientName}</h1>
        <p className="text-sm text-muted-foreground">
          This lets {clientName} use Noble Smart Voice tools as you — reading your school calendar,
          classes and timetable, and creating calendar events.
        </p>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
