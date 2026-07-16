import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Check, X, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLang, useAutoSaveRaw, useWakePhrase } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { isVoiceSupported, startVoice, type VoiceSession } from "@/lib/voice";
import { parseUtterance, type Parsed } from "@/lib/parser";
import { getDb, type ItemType } from "@/lib/db";
import { createReminder } from "@/lib/reminders";

export const Route = createFileRoute("/voice")({
  component: VoicePage,
});

function VoicePage() {
  const [lang] = useLang();
  const [autoRaw] = useAutoSaveRaw();
  const [wake] = useWakePhrase();
  const nav = useNavigate();
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<"idle" | "listening" | "review">("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [chosenType, setChosenType] = useState<ItemType>("note");
  const sessionRef = useRef<VoiceSession | null>(null);

  useEffect(() => {
    setSupported(isVoiceSupported());
  }, []);

  function begin() {
    setError("");
    setText("");
    setParsed(null);
    setStatus("listening");
    const s = startVoice(
      lang,
      (interim) => setText(interim),
      (final) => {
        const captured = final || text;
        setText(captured);
        if (captured.trim()) {
          if (autoRaw) {
            // Save raw transcript as a Note, preserving any bilingual mix
            const now = Date.now();
            getDb().notes.add({
              title: captured.length > 80 ? captured.slice(0, 77) + "…" : captured,
              transcript: captured,
              language: lang,
              tags: ["raw"],
              createdAt: now,
              updatedAt: now,
            }).then(() => nav({ to: "/notes" }));
          } else {
            const p = parseUtterance(captured, lang);
            setParsed(p);
            setChosenType(p.type);
            setStatus("review");
          }
        } else {
          setStatus("idle");
        }
      },
      (err) => {
        setError(err);
        setStatus("idle");
      },
    );
    sessionRef.current = s;
  }

  function stop() {
    sessionRef.current?.stop();
  }

  function commitManual() {
    if (!text.trim()) return;
    const p = parseUtterance(text, lang);
    setParsed(p);
    setChosenType(p.type);
    setStatus("review");
  }

  async function save() {
    if (!parsed) return;
    const db = getDb();
    const now = Date.now();
    const type = chosenType;
    let id: number | undefined;
    let label = parsed.title;
    if (type === "note") {
      id = await db.notes.add({
        title: parsed.title,
        transcript: parsed.body ?? text,
        language: lang,
        tags: [],
        createdAt: now,
        updatedAt: now,
      });
    } else if (type === "message") {
      id = await db.messages.add({
        content: parsed.body ?? parsed.title,
        status: "saved",
        createdAt: now,
      });
    } else if (type === "task") {
      id = await db.tasks.add({
        title: parsed.title,
        dueAt: parsed.when,
        reminderAt: parsed.when,
        priority: "med",
        status: "open",
        createdAt: now,
      });
    } else if (type === "meeting") {
      id = await db.meetings.add({
        title: parsed.title,
        summary: parsed.body ?? "",
        attendees: [],
        meetingAt: parsed.when,
        actionItems: [],
        createdAt: now,
      });
    } else if (type === "appointment") {
      id = await db.appointments.add({
        title: parsed.title,
        appointmentAt: parsed.when ?? now + 3600_000,
        reminderAt: parsed.when,
      });
    } else if (type === "contact") {
      id = await db.contacts.add({
        fullName: parsed.contact?.fullName ?? parsed.title,
        email: parsed.contact?.email,
        tags: [],
        createdAt: now,
      });
      label = parsed.contact?.fullName ?? parsed.title;
    }

    if (parsed.when && id && (type === "task" || type === "appointment" || type === "meeting")) {
      await createReminder(type, id, label, parsed.when);
    }

    const dest =
      type === "note"
        ? "/notes"
        : type === "task"
          ? "/tasks"
          : type === "meeting"
            ? "/meetings"
            : type === "appointment"
              ? "/appointments"
              : type === "contact"
                ? "/contacts"
                : "/notes";
    nav({ to: dest });
  }

  const types: ItemType[] = ["note", "task", "meeting", "appointment", "contact", "message"];

  return (
    <AppShell title={t(lang, "voice")} showFab={false}>
      {!supported && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive mb-4">
          {t(lang, "micUnsupported")}
        </div>
      )}

      <div className="rounded-3xl bg-card border border-border p-6 flex flex-col items-center">
        <div className="relative mb-4">
          {status === "listening" && (
            <span className="absolute inset-0 rounded-full bg-primary mic-pulse" />
          )}
          <button
            onClick={status === "listening" ? stop : begin}
            disabled={!supported && status !== "listening"}
            className="relative grid place-items-center w-28 h-28 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            {status === "listening" ? <Square size={40} /> : <Mic size={40} />}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {status === "listening"
            ? t(lang, "listening")
            : status === "review"
              ? t(lang, "confirmSave")
              : t(lang, "tapToSpeak")}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
          {lang === "id" ? "Bahasa Indonesia" : "English"}
        </p>

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(lang, "typeInstead")}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={t(lang, "example1")}
          className="mt-2 w-full rounded-2xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
        />
        {status !== "review" && text.trim() && (
          <button
            onClick={commitManual}
            className="mt-2 w-full rounded-full bg-secondary text-secondary-foreground py-2 text-sm font-semibold"
          >
            <Pencil size={14} className="inline mr-1" />
            {t(lang, "addManually")}
          </button>
        )}
      </div>

      {status === "review" && parsed && (
        <div className="mt-5 rounded-3xl bg-accent/15 border border-accent/40 p-4">
          <p className="text-xs text-muted-foreground mb-2">{t(lang, "parsedAs")}</p>
          <p className="text-lg font-semibold mb-3">{parsed.title}</p>
          {parsed.when && (
            <p className="text-sm text-muted-foreground mb-3">
              📅 {new Date(parsed.when).toLocaleString()}
            </p>
          )}
          {parsed.contact?.email && (
            <p className="text-sm text-muted-foreground mb-3">✉ {parsed.contact.email}</p>
          )}

          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            {t(lang, "saveAs")}
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {types.map((tp) => (
              <button
                key={tp}
                onClick={() => setChosenType(tp)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  chosenType === tp
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {t(lang, tp)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex-1 rounded-full bg-primary text-primary-foreground py-3 font-semibold flex items-center justify-center gap-2"
            >
              <Check size={18} /> {t(lang, "save")}
            </button>
            <button
              onClick={() => {
                setStatus("idle");
                setParsed(null);
              }}
              className="rounded-full border border-border px-4 py-3 flex items-center justify-center"
              aria-label={t(lang, "cancel")}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-secondary/50 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {t(lang, "tryCommands")}
        </p>
        <ul className="space-y-1.5 text-sm">
          <li className="text-foreground/80">“{t(lang, "example1")}”</li>
          <li className="text-foreground/80">“{t(lang, "example2")}”</li>
          <li className="text-foreground/80">“{t(lang, "example3")}”</li>
          <li className="text-foreground/60 text-xs mt-2">
            🎙 “Hey Google, {wake}”
          </li>
        </ul>
      </div>
    </AppShell>
  );
}