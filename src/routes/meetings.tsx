import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/meetings")({
  head: () => ({ meta: [{ title: "Meetings — VoiceTag" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const [lang] = useLang();
  const meetings = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().meetings.orderBy("createdAt").reverse().toArray();
  }, []);

  return (
    <AppShell title={t(lang, "meetings")}>
      {!meetings || meetings.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((m) => (
            <li key={m.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-semibold flex-1">{m.title}</p>
                <button
                  onClick={() => m.id && getDb().meetings.delete(m.id)}
                  className="text-muted-foreground"
                  aria-label={t(lang, "delete")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {m.meetingAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(m.meetingAt).toLocaleString()}
                </p>
              )}
              {m.summary && <p className="text-sm text-muted-foreground mt-2">{m.summary}</p>}
              {m.attendees.length > 0 && (
                <p className="text-xs mt-2">
                  <span className="text-muted-foreground">{t(lang, "attendees")}: </span>
                  {m.attendees.join(", ")}
                </p>
              )}
              {m.actionItems.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">{t(lang, "actionItems")}:</p>
                  <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                    {m.actionItems.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}