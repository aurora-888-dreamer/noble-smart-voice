import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Mail, Phone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SelectionBar } from "@/components/SelectionBar";
import { EditModal } from "@/components/EditModal";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { getDb, type Contact } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { sendViaBluetooth } from "@/lib/bluetooth-share";
import { shareManyEmail, shareManyWA, printMany } from "@/lib/bulk-share";
import { ItemActions } from "@/components/ItemActions";

export const Route = createFileRoute("/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Noble" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const [lang] = useLang();
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", notes: "" });
  const [editing, setEditing] = useState<Contact | null>(null);
  const sel = useMultiSelect<number>();

  const contacts = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().contacts.orderBy("fullName").toArray();
  }, []);

  const filtered = useMemo(() => {
    return (contacts ?? []).filter((c) => {
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        c.fullName.toLowerCase().includes(s) ||
        (c.email ?? "").toLowerCase().includes(s) ||
        (c.phone ?? "").toLowerCase().includes(s)
      );
    });
  }, [contacts, q]);

  const visibleIds = filtered.map((n) => n.id!).filter(Boolean);
  const selectedRows = filtered.filter((n) => n.id && sel.isSelected(n.id));
  const payload = selectedRows.map((r) => ({
    title: r.fullName,
    body: [r.email, r.phone, r.company, r.notes].filter(Boolean).join("\n"),
  }));

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

  async function bulkDelete() {
    await getDb().contacts.bulkDelete([...sel.selected]);
    sel.exit();
  }
  async function bulkDuplicate() {
    await getDb().contacts.bulkAdd(
      selectedRows.map((r) => ({
        fullName: `${r.fullName} (copy)`,
        email: r.email,
        phone: r.phone,
        company: r.company,
        notes: r.notes,
        tags: [...r.tags],
        createdAt: Date.now(),
      })),
    );
    sel.exit();
  }

  async function saveEdit(vals: Record<string, string>) {
    if (!editing?.id) return;
    await getDb().contacts.update(editing.id, {
      fullName: vals.fullName,
      email: vals.email || undefined,
      phone: vals.phone || undefined,
      company: vals.company || undefined,
      notes: vals.notes || undefined,
    });
    setEditing(null);
    sel.exit();
  }

  return (
    <AppShell title={t(lang, "contacts")}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm mb-3 outline-none focus:border-primary"
      />

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

      <div className="flex justify-between items-center mb-2">
        <p className="text-xs text-muted-foreground">{filtered.length}</p>
        {!sel.selectMode && filtered.length > 0 && (
          <button onClick={() => sel.enter()} className="text-xs font-semibold text-primary">
            {t(lang, "select")}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => {
            const selected = c.id ? sel.isSelected(c.id) : false;
            return (
              <li
                key={c.id}
                onClick={() => sel.selectMode && c.id && sel.toggle(c.id)}
                className={`rounded-2xl border p-4 transition-colors ${
                  selected ? "border-primary bg-primary/10" : "bg-card border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  {sel.selectMode && (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => c.id && sel.toggle(c.id)}
                      className="mt-1 accent-primary"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{c.fullName}</p>
                    {c.email && (
                      <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Mail size={12} /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Phone size={12} /> {c.phone}
                      </a>
                    )}
                    {c.notes && <p className="text-xs mt-2 text-muted-foreground">{c.notes}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {sel.selectMode && (
        <SelectionBar
          count={sel.count}
          totalVisible={filtered.length}
          onSelectAll={() => sel.selectAll(visibleIds)}
          onCancel={sel.exit}
          onDelete={bulkDelete}
          onDuplicate={bulkDuplicate}
          onEdit={() => {
            const one = selectedRows[0];
            if (one) setEditing(one);
          }}
          onShareWA={() => shareManyWA(payload)}
          onShareEmail={() => shareManyEmail(payload)}
          onPrint={() => printMany(payload)}
          onBluetooth={() => void sendViaBluetooth("contact", selectedRows)}
        />
      )}

      {editing && (
        <EditModal
          title={t(lang, "edit")}
          fields={[
            { key: "fullName", label: t(lang, "name"), value: editing.fullName },
            { key: "email", label: t(lang, "email"), value: editing.email ?? "" },
            { key: "phone", label: t(lang, "phone"), value: editing.phone ?? "" },
            { key: "company", label: t(lang, "company"), value: editing.company ?? "" },
            { key: "notes", label: t(lang, "notesField"), type: "textarea", value: editing.notes ?? "" },
          ]}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </AppShell>
  );
}
