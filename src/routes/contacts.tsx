import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Plus, Mail, Phone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/contacts")({
  head: () => ({ meta: [{ title: "Contacts — VoiceTag" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const [lang] = useLang();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", notes: "" });

  const contacts = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().contacts.orderBy("fullName").toArray();
  }, []);

  async function save() {
    if (!form.fullName.trim()) return;
    await getDb().contacts.add({
      fullName: form.fullName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      tags: [],
      createdAt: Date.now(),
    });
    setForm({ fullName: "", email: "", phone: "", notes: "" });
    setShow(false);
  }

  return (
    <AppShell title={t(lang, "contacts")}>
      <button
        onClick={() => setShow((s) => !s)}
        className="w-full mb-4 rounded-full bg-secondary text-secondary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Plus size={16} /> {t(lang, "addManually")}
      </button>

      {show && (
        <div className="mb-4 rounded-2xl bg-card border border-border p-4 space-y-2">
          <input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder={t(lang, "name")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={t(lang, "email")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={t(lang, "phone")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder={t(lang, "notesField")}
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={save}
            className="w-full rounded-full bg-primary text-primary-foreground py-2 text-sm font-semibold"
          >
            {t(lang, "save")}
          </button>
        </div>
      )}

      {!contacts || contacts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-semibold">{c.fullName}</p>
                  {c.email && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Mail size={12} /> {c.email}
                    </p>
                  )}
                  {c.phone && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Phone size={12} /> {c.phone}
                    </p>
                  )}
                  {c.notes && <p className="text-xs mt-2 text-muted-foreground">{c.notes}</p>}
                </div>
                <button
                  onClick={() => c.id && getDb().contacts.delete(c.id)}
                  className="text-muted-foreground self-start"
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