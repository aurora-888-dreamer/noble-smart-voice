import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter, inRange } from "@/components/DateRangeFilter";
import { SelectionBar } from "@/components/SelectionBar";
import { EditModal } from "@/components/EditModal";
import { AddFab } from "@/components/AddFab";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { useLongPress } from "@/hooks/useLongPress";
import { getDb, type Message } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { sendViaBluetooth } from "@/lib/bluetooth-share";
import { shareManyEmail, shareManyWA, printMany } from "@/lib/bulk-share";
import { ItemActions } from "@/components/ItemActions";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — Noble" }] }),
  component: MessagesPage,
});

const STATUS_ORDER: Message["status"][] = ["draft", "saved", "sent-later"];

function statusLabel(lang: "en" | "id", status: Message["status"]) {
  if (status === "draft") return t(lang, "statusDraft");
  if (status === "sent-later") return t(lang, "statusSentLater");
  return t(lang, "statusSaved");
}

function MessagesPage() {
  const [lang] = useLang();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Message | null>(null);
  const [adding, setAdding] = useState(false);
  const sel = useMultiSelect<number>();

  const messages = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().messages.orderBy("createdAt").reverse().toArray();
  }, []);

  const contacts = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().contacts.toArray();
  }, []);
  const contactName = (id?: number) => contacts?.find((c) => c.id === id)?.fullName;

  const filtered = useMemo(() => {
    return (messages ?? []).filter((m) => {
      if (!inRange(m.createdAt, from, to)) return false;
      if (!q) return true;
      return m.content.toLowerCase().includes(q.toLowerCase());
    });
  }, [messages, q, from, to]);

  const visibleIds = filtered.map((m) => m.id!).filter(Boolean);
  const selectedMessages = filtered.filter((m) => m.id && sel.isSelected(m.id));
  const payload = selectedMessages.map((m) => ({ title: statusLabel(lang, m.status), body: m.content }));

  async function bulkDelete() {
    await getDb().messages.bulkDelete([...sel.selected]);
    sel.exit();
  }
  async function bulkDuplicate() {
    const now = Date.now();
    await getDb().messages.bulkAdd(
      selectedMessages.map((m) => ({
        content: m.content,
        relatedContactId: m.relatedContactId,
        status: m.status,
        createdAt: now,
      })),
    );
    sel.exit();
  }

  async function cycleStatus(m: Message) {
    if (!m.id) return;
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(m.status) + 1) % STATUS_ORDER.length];
    await getDb().messages.update(m.id, { status: next });
  }

  async function saveEdit(vals: Record<string, string>) {
    if (!editing?.id) return;
    await getDb().messages.update(editing.id, { content: vals.content });
    setEditing(null);
    sel.exit();
  }
  async function saveNew(vals: Record<string, string>) {
    if (!vals.content?.trim()) {
      setAdding(false);
      return;
    }
    await getDb().messages.add({
      content: vals.content.trim(),
      status: "draft",
      createdAt: Date.now(),
    });
    setAdding(false);
  }

  return (
    <AppShell title={t(lang, "messages")}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm mb-2 outline-none focus:border-primary"
      />
      <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />

      <div className="flex justify-between items-center mb-2 gap-2">
        <p className="text-xs text-muted-foreground">{filtered.length} {t(lang, "messages").toLowerCase()}</p>
        <div className="flex items-center gap-2">
          {!sel.selectMode && filtered.length > 0 && (
            <button onClick={() => sel.enter()} className="text-xs font-semibold text-primary">
              {t(lang, "select")}
            </button>
          )}
          {!sel.selectMode && <AddFab onClick={() => setAdding(true)} />}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => (
            <MessageRow
              key={m.id}
              m={m}
              lang={lang}
              contactName={contactName(m.relatedContactId)}
              selectMode={sel.selectMode}
              selected={m.id ? sel.isSelected(m.id) : false}
              onToggle={() => m.id && sel.toggle(m.id)}
              onLongPress={() => m.id && !sel.selectMode && sel.enter(m.id)}
              onOpen={() => !sel.selectMode && setEditing(m)}
              onCycleStatus={() => cycleStatus(m)}
              onEdit={() => setEditing(m)}
              onDelete={async () => { if (m.id) await getDb().messages.delete(m.id); }}
            />
          ))}
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
            const one = selectedMessages[0];
            if (one) setEditing(one);
          }}
          onShareWA={() => shareManyWA(payload)}
          onShareEmail={() => shareManyEmail(payload)}
          onPrint={() => printMany(payload)}
          onBluetooth={() => void sendViaBluetooth("note", selectedMessages)}
        />
      )}

      {editing && (
        <EditModal
          title={t(lang, "edit")}
          fields={[{ key: "content", label: t(lang, "content"), type: "textarea", value: editing.content }]}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}

      {adding && (
        <EditModal
          title={t(lang, "addManually")}
          fields={[{ key: "content", label: t(lang, "content"), type: "textarea", value: "" }]}
          onClose={() => setAdding(false)}
          onSave={saveNew}
        />
      )}
    </AppShell>
  );
}

function MessageRow({
  m,
  lang,
  contactName,
  selectMode,
  selected,
  onToggle,
  onLongPress,
  onOpen,
  onCycleStatus,
  onEdit,
  onDelete,
}: {
  m: Message;
  lang: "en" | "id";
  contactName?: string;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onLongPress: () => void;
  onOpen: () => void;
  onCycleStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const lp = useLongPress(onLongPress);
  return (
    <li
      {...lp}
      onClick={() => (selectMode ? onToggle() : onOpen())}
      className={`relative rounded-2xl border p-4 transition-colors select-none ${
        selected ? "border-primary bg-primary/10" : "bg-card border-border"
      }`}
    >
      <div className="flex items-start gap-2">
        {selectMode && (
          <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 accent-primary" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            {contactName && <p className="text-xs font-semibold text-primary">{contactName}</p>}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!selectMode) onCycleStatus();
              }}
              className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                m.status === "sent-later"
                  ? "border-accent/40 bg-accent/10 text-accent-foreground"
                  : m.status === "saved"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-secondary text-secondary-foreground"
              }`}
            >
              {statusLabel(lang, m.status)}
            </button>
            {!selectMode && (
              <ItemActions title={contactName ?? "Message"} body={m.content} onEdit={onEdit} onDelete={onDelete} />
            )}
          </div>
          <p className="text-sm text-foreground mt-1.5 line-clamp-4 whitespace-pre-wrap">{m.content}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
            {new Date(m.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </li>
  );
}
