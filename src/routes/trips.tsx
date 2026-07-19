import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Plus, MapPin, Plane, X, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CategoryToolbar } from "@/components/CategoryToolbar";
import { DateRangeFilter, inRange } from "@/components/DateRangeFilter";
import { SelectionBar } from "@/components/SelectionBar";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { getDb, type Trip } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { sendViaBluetooth } from "@/lib/bluetooth-share";
import { shareManyEmail, shareManyWA, printMany } from "@/lib/bulk-share";

export const Route = createFileRoute("/trips")({
  head: () => ({ meta: [{ title: "Trip Plan — Noble" }] }),
  component: TripsPage,
});

function toTs(v: string) {
  return v ? new Date(v).getTime() : undefined;
}
function toDateInput(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function TripsPage() {
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const sel = useMultiSelect<number>();
  const trips = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().trips.orderBy("createdAt").reverse().toArray();
  }, []);

  const filtered = useMemo(() => {
    return (trips ?? []).filter((tr) => {
      if (!inRange(tr.createdAt, from, to)) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return tr.title.toLowerCase().includes(s) || tr.destination.toLowerCase().includes(s);
    });
  }, [trips, q, from, to]);

  const visibleIds = filtered.map((n) => n.id!).filter(Boolean);
  const selectedRows = filtered.filter((n) => n.id && sel.isSelected(n.id));
  const payload = selectedRows.map((r) => ({
    title: r.title,
    body: `${r.destination}\n${r.stops.map((s) => `- ${s.label}`).join("\n")}\n\nPacking:\n${r.packingList.map((p) => `- ${p.text}`).join("\n")}`,
  }));

  async function bulkDelete() {
    await getDb().trips.bulkDelete([...sel.selected]);
    sel.exit();
  }
  async function bulkDuplicate() {
    const now = Date.now();
    await getDb().trips.bulkAdd(
      selectedRows.map((r) => ({
        title: `${r.title} (copy)`,
        destination: r.destination,
        startAt: r.startAt,
        endAt: r.endAt,
        stops: [...r.stops],
        packingList: r.packingList.map((p) => ({ ...p })),
        notes: r.notes,
        createdAt: now,
      })),
    );
    sel.exit();
  }

  return (
    <AppShell title={t(lang, "trips")}>
      <CategoryToolbar type="trip" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm mb-2 outline-none focus:border-primary"
      />
      <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />

      <button
        onClick={() => setOpen(true)}
        className="w-full mb-3 rounded-2xl bg-primary text-primary-foreground py-3 font-semibold flex items-center justify-center gap-2"
      >
        <Plus size={18} /> {t(lang, "newTrip")}
      </button>

      {open && <NewTripForm lang={lang} onClose={() => setOpen(false)} />}

      <div className="flex justify-between items-center mb-2">
        <p className="text-xs text-muted-foreground">{filtered.length}</p>
        {!sel.selectMode && filtered.length > 0 && (
          <button onClick={() => sel.enter()} className="text-xs font-semibold text-primary">
            {t(lang, "select")}
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <ul className="space-y-3">
          {filtered.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              lang={lang}
              selectMode={sel.selectMode}
              selected={trip.id ? sel.isSelected(trip.id) : false}
              onToggle={() => trip.id && sel.toggle(trip.id)}
            />
          ))}
        </ul>
      ) : (
        !open && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {t(lang, "empty")}
          </p>
        )
      )}

      {sel.selectMode && (
        <SelectionBar
          count={sel.count}
          totalVisible={filtered.length}
          onSelectAll={() => sel.selectAll(visibleIds)}
          onCancel={sel.exit}
          onDelete={bulkDelete}
          onDuplicate={bulkDuplicate}
          onShareWA={() => shareManyWA(payload)}
          onShareEmail={() => shareManyEmail(payload)}
          onPrint={() => printMany(payload)}
          onBluetooth={() => void sendViaBluetooth("trip", selectedRows)}
        />
      )}
    </AppShell>
  );
}


function NewTripForm({ lang, onClose }: { lang: "en" | "id"; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  async function save() {
    if (!title.trim()) return;
    await getDb().trips.add({
      title: title.trim(),
      destination: destination.trim(),
      startAt: toTs(start),
      endAt: toTs(end),
      stops: [],
      packingList: [],
      createdAt: Date.now(),
    });
    onClose();
  }

  return (
    <div className="mb-4 rounded-2xl bg-card border border-border p-4 space-y-3">
      <Field label={t(lang, "title")} value={title} onChange={setTitle} />
      <Field label={t(lang, "destination")} value={destination} onChange={setDestination} />
      <div className="grid grid-cols-2 gap-2">
        <Field label={t(lang, "startDate")} value={start} onChange={setStart} type="date" />
        <Field label={t(lang, "endDate")} value={end} onChange={setEnd} type="date" />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
          {t(lang, "cancel")}
        </button>
        <button onClick={save} className="flex-1 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {t(lang, "save")}
        </button>
      </div>
    </div>
  );
}

function TripCard({
  trip,
  lang,
  selectMode,
  selected,
  onToggle,
}: {
  trip: Trip;
  lang: "en" | "id";
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const [stop, setStop] = useState("");
  const [item, setItem] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination);
  const [start, setStart] = useState(toDateInput(trip.startAt));
  const [end, setEnd] = useState(toDateInput(trip.endAt));

  async function saveEdits() {
    if (!trip.id) return;
    await getDb().trips.update(trip.id, {
      title: title.trim() || trip.title,
      destination: destination.trim(),
      startAt: toTs(start),
      endAt: toTs(end),
    });
    setEditing(false);
  }

  async function removeStop(idx: number) {
    if (!trip.id) return;
    await getDb().trips.update(trip.id, {
      stops: trip.stops.filter((_, i) => i !== idx),
    });
  }
  async function removeItem(idx: number) {
    if (!trip.id) return;
    await getDb().trips.update(trip.id, {
      packingList: trip.packingList.filter((_, i) => i !== idx),
    });
  }

  async function addStop() {
    if (!stop.trim() || !trip.id) return;
    await getDb().trips.update(trip.id, {
      stops: [...trip.stops, { label: stop.trim() }],
    });
    setStop("");
  }
  async function addItem() {
    if (!item.trim() || !trip.id) return;
    await getDb().trips.update(trip.id, {
      packingList: [...trip.packingList, { text: item.trim(), done: false }],
    });
    setItem("");
  }
  async function togglePack(idx: number) {
    if (!trip.id) return;
    const next = trip.packingList.map((p, i) => (i === idx ? { ...p, done: !p.done } : p));
    await getDb().trips.update(trip.id, { packingList: next });
  }

  return (
    <li
      onClick={() => selectMode && onToggle()}
      className={`rounded-2xl border p-4 transition-colors ${
        selected ? "border-primary bg-primary/10" : "bg-card border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {selectMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 accent-primary"
          />
        )}
        <div className="flex-1">

          {editing ? (
            <div className="space-y-2">
              <Field label={t(lang, "title")} value={title} onChange={setTitle} />
              <Field label={t(lang, "destination")} value={destination} onChange={setDestination} />
              <div className="grid grid-cols-2 gap-2">
                <Field label={t(lang, "startDate")} value={start} onChange={setStart} type="date" />
                <Field label={t(lang, "endDate")} value={end} onChange={setEnd} type="date" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                  {t(lang, "cancel")}
                </button>
                <button onClick={saveEdits} className="flex-1 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {t(lang, "save")}
                </button>
              </div>
            </div>
          ) : (
            <>
          <p className="font-semibold flex items-center gap-2">
            <Plane size={16} className="text-primary" />
            {trip.title}
          </p>
          {trip.destination && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin size={12} /> {trip.destination}
            </p>
          )}
          {(trip.startAt || trip.endAt) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {trip.startAt ? new Date(trip.startAt).toLocaleDateString() : "?"} –{" "}
              {trip.endAt ? new Date(trip.endAt).toLocaleDateString() : "?"}
            </p>
          )}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground p-1"
              aria-label={t(lang, "editTrip")}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => trip.id && getDb().trips.delete(trip.id)}
              className="text-muted-foreground p-1"
              aria-label={t(lang, "delete")}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          {t(lang, "stops")}
        </p>
        <ol className="space-y-1 text-sm">
          {trip.stops.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span>{i + 1}. {s.label}</span>
              <button
                onClick={() => removeStop(i)}
                className="text-muted-foreground p-1"
                aria-label={t(lang, "removeStop")}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ol>
        <div className="flex gap-2 mt-2">
          <input
            value={stop}
            onChange={(e) => setStop(e.target.value)}
            placeholder={t(lang, "addStop")}
            className="flex-1 rounded-lg bg-secondary text-secondary-foreground px-3 py-2 text-sm"
          />
          <button onClick={addStop} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm">
            +
          </button>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          {t(lang, "packingList")}
        </p>
        <ul className="space-y-1 text-sm">
          {trip.packingList.map((p, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 flex-1">
                <input type="checkbox" checked={p.done} onChange={() => togglePack(i)} />
                <span className={p.done ? "line-through text-muted-foreground" : ""}>{p.text}</span>
              </label>
              <button
                onClick={() => removeItem(i)}
                className="text-muted-foreground p-1"
                aria-label={t(lang, "removeItem")}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-2">
          <input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder={t(lang, "addItem")}
            className="flex-1 rounded-lg bg-secondary text-secondary-foreground px-3 py-2 text-sm"
          />
          <button onClick={addItem} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm">
            +
          </button>
        </div>
      </div>
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-secondary text-secondary-foreground px-3 py-2 text-sm font-normal"
      />
    </label>
  );
}

export { toDateInput };