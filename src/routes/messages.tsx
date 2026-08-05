import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
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
import { getProfile } from "@/lib/auth-store";
import { listMyRelayThreads, replyAsNsvUser, markRelayImported } from "@/lib/nsv-relay.functions";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RelayRow = Record<string, any>;

/** Shows any relay threads waiting for this device's own registered phone
 * number (invite-only — a thread only exists if someone on the School
 * side typed this exact number in). Each incoming item can be saved into
 * this device's own local Messages, and replies go back through the same
 * shared holding area. */
function RelayInboxSection({ lang }: { lang: "en" | "id" }) {
  const [threads, setThreads] = useState<RelayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const phone = getProfile()?.whatsapp;

  async function load() {
    if (!phone) return;
    setLoading(true);
    const r = await listMyRelayThreads({ data: { phone } });
    setLoading(false);
    if (r.ok) setThreads(r.threads);
  }
  useEffect(() => { load(); }, [phone]);

  async function saveToMyMessages(msg: RelayRow) {
    await getDb().messages.add({ content: msg.body, status: "saved", createdAt: Date.now() });
    await markRelayImported({ data: { messageId: msg.id } });
    load();
  }
  async function reply(threadId: string) {
    if (!replyText.trim()) return;
    setBusy(true);
    await replyAsNsvUser({ data: { threadId, body: replyText } });
    setBusy(false);
    setReplyText(""); load();
  }

  if (!phone || (threads.length === 0 && !loading)) return null;
  const hasUnimported = threads.some((th) => (th.nsv_relay_messages ?? []).some((m: RelayRow) => m.direction === "to_nsv_user" && !m.imported));

  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3 mb-3">
      <p className="text-xs font-semibold mb-2">
        {lang === "id" ? "Pesan dari School Dashboard" : "Messages from School Dashboard"}
        {hasUnimported ? " 🟠" : ""}
      </p>
      <div className="space-y-2">
        {threads.map((th) => {
          const msgs: RelayRow[] = (th.nsv_relay_messages ?? []).slice().sort((a: RelayRow, b: RelayRow) => a.created_at.localeCompare(b.created_at));
          return (
            <div key={th.id} className="rounded-xl bg-card border border-border p-2">
              <button onClick={() => setOpenThread(openThread === th.id ? null : th.id)} className="w-full text-left text-sm font-semibold">
                {th.sender_name || "Sekolah"}
              </button>
              {openThread === th.id && (
                <div className="mt-2 space-y-1.5">
                  {msgs.map((m) => (
                    <div key={m.id} className={"text-xs rounded-lg p-2 flex items-start justify-between gap-2 " + (m.direction === "to_nsv_user" ? "bg-secondary/50" : "bg-emerald-500/10")}>
                      <span>{m.body}</span>
                      {m.direction === "to_nsv_user" && !m.imported && (
                        <button onClick={() => saveToMyMessages(m)} className="shrink-0 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-semibold">
                          {lang === "id" ? "Simpan" : "Save"}
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={lang === "id" ? "Balas…" : "Reply…"} className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs" />
                    <button onClick={() => reply(th.id)} disabled={busy || !replyText.trim()} className="rounded-lg bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold disabled:opacity-50">
                      {lang === "id" ? "Kirim" : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const [showRelayPicker, setShowRelayPicker] = useState(false);
  const [relayThreads, setRelayThreads] = useState<RelayRow[]>([]);
  const [relaySending, setRelaySending] = useState(false);

  async function openRelayPicker() {
    const phone = getProfile()?.whatsapp;
    if (!phone) return;
    const r = await listMyRelayThreads({ data: { phone } });
    if (r.ok) setRelayThreads(r.threads);
    setShowRelayPicker(true);
  }
  async function sendSelectedViaRelay(threadId: string) {
    setRelaySending(true);
    const combined = selectedMessages.map((m) => m.content).join("\n\n");
    await replyAsNsvUser({ data: { threadId, body: combined } });
    setRelaySending(false);
    setShowRelayPicker(false);
    sel.exit();
  }

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
      <RelayInboxSection lang={lang} />
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
          onRelay={openRelayPicker}
        />
      )}

      {showRelayPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowRelayPicker(false)}>
          <div className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl border border-border p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-3">{lang === "id" ? "Kirim ke percakapan mana?" : "Send to which conversation?"}</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {relayThreads.map((th) => (
                <button
                  key={th.id}
                  onClick={() => sendSelectedViaRelay(th.id)}
                  disabled={relaySending}
                  className="w-full text-left rounded-xl bg-secondary/50 hover:bg-secondary px-3 py-2 text-sm disabled:opacity-50"
                >
                  {th.sender_name || "Sekolah"}
                </button>
              ))}
              {relayThreads.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {lang === "id" ? "Belum ada percakapan yang mengundangmu — sekolah perlu mulai duluan." : "No conversation has invited you yet — the school needs to start it first."}
                </p>
              )}
            </div>
            <button onClick={() => setShowRelayPicker(false)} className="mt-3 text-xs text-muted-foreground underline">
              {lang === "id" ? "Batal" : "Cancel"}
            </button>
          </div>
        </div>
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
