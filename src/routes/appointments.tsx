import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, MapPin, Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/appointments")({
  head: () => ({ meta: [{ title: "Appointments — Noble" }] }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const [lang] = useLang();
  const items = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().appointments.orderBy("appointmentAt").toArray();
  }, []);

  return (
    <AppShell title={t(lang, "appointments")}>
      {!items || items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-primary font-medium mt-1">
                    {new Date(a.appointmentAt).toLocaleString()}
                  </p>
                  {a.location && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin size={12} /> {a.location}
                    </p>
                  )}
                  {a.reminderAt && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Bell size={12} /> {new Date(a.reminderAt).toLocaleString()}
                    </p>
                  )}
                  {a.notes && <p className="text-sm mt-2 text-muted-foreground">{a.notes}</p>}
                </div>
                <button
                  onClick={() => a.id && getDb().appointments.delete(a.id)}
                  className="text-muted-foreground"
                  aria-label={t(lang, "delete")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}