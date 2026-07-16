import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { X, Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/reminders")({
  head: () => ({ meta: [{ title: "Reminders — VoiceTag" }] }),
  component: RemindersPage,
});

function RemindersPage() {
  const [lang] = useLang();
  const reminders = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().reminders.orderBy("remindAt").toArray();
  }, []);

  return (
    <AppShell title={t(lang, "reminders")}>
      {!reminders || reminders.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-2">
          {reminders.map((r) => (
            <li
              key={r.id}
              className={`rounded-2xl border p-3 flex items-center gap-3 ${
                r.status === "pending"
                  ? "bg-accent/15 border-accent/40"
                  : "bg-card border-border opacity-60"
              }`}
            >
              <Bell size={16} className="text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.remindAt).toLocaleString()} · {r.status}
                </p>
              </div>
              <button
                onClick={() => r.id && getDb().reminders.update(r.id, { status: "dismissed" })}
                className="text-muted-foreground"
                aria-label="dismiss"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}