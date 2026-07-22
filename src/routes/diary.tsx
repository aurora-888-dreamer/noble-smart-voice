import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppShell } from "@/components/AppShell";
import { PinGate } from "@/components/PinGate";
import { DateRangeFilter, inRange } from "@/components/DateRangeFilter";
import { SelectionBar } from "@/components/SelectionBar";
import { EditModal } from "@/components/EditModal";
import { AddFab } from "@/components/AddFab";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { useLongPress } from "@/hooks/useLongPress";
import { getDb, type DiaryEntry } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { sendViaBluetooth } from "@/lib/bluetooth-share";
import { shareManyEmail, shareManyWA, printMany } from "@/lib/bulk-share";
import { usePlugin } from "@/lib/plugins-store";
import { TranslateInline } from "@/components/TranslateInline";
import { ItemActions } from "@/components/ItemActions";

export const Route = createFileRoute("/diary")({
  head: () => ({ meta: [{ title: "Diary — Noble" }] }),
  component: DiaryPage,
});

function DiaryPage() {
  const [lang] = useLang();
  return (
    <PinGate storageKey="noble.diaryUnlocked" title={lang === "id" ? "Diary Terkunci" : "Diary Locked"}>
      <DiaryPageContent />
    </PinGate>
  );
}

function DiaryPageContent() {
  const [lang] = useLang();
  const hasTranslator = usePlugin("translator");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const sel = useMultiSelect<number>();

  const entries = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().diaries.orderBy("createdAt").reverse().toArray();
  }, []);

  const filtered = useMemo(() => {
    return (entries ?? []).filter((n) => {
      if (!inRange(n.createdAt, from, to)) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return n.title.toLowerCase().includes(s) || n.entry.toLowerCase().includes(s);
    });
  }, [entries, q, from, to]);

  const visibleIds = filtered.map((n) => n.id!).filter(Boolean);
  const selectedEntries = filtered.filter((n) => n.id && sel.isSelected(n.id));
  const payload = selectedEntries.map((n) => ({ title: n.title, body: n.entry }));

  async function bulkDelete() {
    await getDb().diaries.bulkDelete([...sel.selected]);
    sel.exit();
  }
  async function bulkDuplicate() {
    const now = Date.now();
    await getDb().diaries.bulkAdd(
      selectedEntries.map((n) => ({
        title: `${n.title} (copy)`,
        entry: n.entry,
        mood: n.mood,
        createdAt: now,
        updatedAt: now,
      })),
    );
    sel.exit();
  }

  async function saveEdit(vals: Record<string, string>) {
    if (!editing?.id) return;
    await getDb().diaries.update(editing.id, {
      title: vals.title,
      entry: vals.entry,
      updatedAt: Date.now(),
    });
    setEditing(null);
    sel.exit();
  }
  async function saveNew(vals: Record<string, string>) {
    const now = Date.now();
    await getDb().diaries.add({
      title: vals.title || (lang === "id" ? "Tanpa judul" : "Untitled"),
      entry: vals.entry || "",
      createdAt: now,
      updatedAt: now,
    });
    setAdding(false);
  }

  return (
    <AppShell title={t(lang, "diary")}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm mb-2 outline-none focus:border-primary"
      />
      <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />

      <div className="flex justify-between items-center mb-2 gap-2">
        <p className="text-xs text-muted-foreground">{filtered.length} {t(lang, "diary").toLowerCase()}</p>
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
          {filtered.map((n) => (
            <DiaryRow
              key={n.id}
              n={n}
              selectMode={sel.selectMode}
              selected={n.id ? sel.isSelected(n.id) : false}
              onToggle={() => n.id && sel.toggle(n.id)}
              onLongPress={() => n.id && !sel.selectMode && sel.enter(n.id)}
              onOpen={() => !sel.selectMode && setEditing(n)}
              hasTranslator={hasTranslator}
              onEdit={() => setEditing(n)}
              onDelete={async () => { if (n.id) await getDb().diaries.delete(n.id); }}
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
            const one = selectedEntries[0];
            if (one) setEditing(one);
          }}
          onShareWA={() => shareManyWA(payload)}
          onShareEmail={() => shareManyEmail(payload)}
          onPrint={() => printMany(payload)}
          onBluetooth={() => void sendViaBluetooth("note", selectedEntries)}
        />
      )}

      {editing && (
        <EditModal
          title={t(lang, "edit")}
          fields={[
            { key: "title", label: t(lang, "title"), value: editing.title },
            { key: "entry", label: t(lang, "content"), type: "textarea", value: editing.entry },
          ]}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}

      {adding && (
        <EditModal
          title={t(lang, "addManually")}
          fields={[
            { key: "title", label: t(lang, "title"), value: "" },
            { key: "entry", label: t(lang, "content"), type: "textarea", value: "" },
          ]}
          onClose={() => setAdding(false)}
          onSave={saveNew}
        />
      )}
    </AppShell>
  );
}

function DiaryRow({
  n,
  selectMode,
  selected,
  onToggle,
  onLongPress,
  onOpen,
  hasTranslator,
  onEdit,
  onDelete,
}: {
  n: DiaryEntry;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onLongPress: () => void;
  onOpen: () => void;
  hasTranslator: boolean;
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
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 accent-primary"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold flex-1">{n.title}</p>
            {!selectMode && (
              <ItemActions title={n.title} body={n.entry} onEdit={onEdit} onDelete={onDelete} />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{n.entry}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
            {new Date(n.createdAt).toLocaleString()}
          </p>
          {hasTranslator && !selectMode && <TranslateInline text={n.entry} />}
        </div>
      </div>
    </li>
  );
}
