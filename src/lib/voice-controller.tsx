// Global voice controller.
// - Wake-word listener: passively listens for "Aurora Start" while app is
//   in the foreground. When triggered, opens the mic in continuous mode.
// - Manual mic: tap the header mic button to toggle listening immediately.
// - Continuous listening: each utterance is dispatched as a short command
//   OR saved as an entry belonging to the current menu (route). Stops only
//   when the user says "close mic" / "stop mic" / "standby", taps the mic
//   button again, or an error kills the session.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { isVoiceSupported, startVoice, primeMicrophone, type VoiceSession } from "./voice";
import { useLang, useWakePhrase, getAutoSaveRaw } from "./settings-store";
import { parseUtterance } from "./parser";
import { getDb, exportAll, type ItemType } from "./db";
import { createReminder } from "./reminders";
import { dispatchCommand } from "./commands";
import { signOut, isPremium } from "./auth-store";
import { makeCall } from "./share";
import { analyzeVoice } from "./ai.functions";

type Mode = "off" | "wake" | "active";

interface Ctx {
  mode: Mode;
  transcript: string;
  toast: string | null;
  supported: boolean;
  wakeEnabled: boolean;
  setWakeEnabled: (v: boolean) => void;
  startActive: () => void;
  stopActive: () => void;
  toggleActive: () => void;
}

const VoiceCtx = createContext<Ctx | null>(null);

const ROUTE_TYPE: Record<string, ItemType> = {
  "/notes": "note",
  "/tasks": "task",
  "/meetings": "meeting",
  "/appointments": "appointment",
  "/contacts": "contact",
  "/reminders": "task",
  "/trips": "note",
  "/projects": "note",
};

const WAKE_KEY = "noble.wakeEnabled";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [lang] = useLang();
  const [wakePhrase] = useWakePhrase();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const [mode, setMode] = useState<Mode>("off");
  const [transcript, setTranscript] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [wakeEnabled, setWakeEnabledState] = useState(false);

  const sessionRef = useRef<VoiceSession | null>(null);
  const modeRef = useRef<Mode>("off");
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    setSupported(isVoiceSupported());
    setWakeEnabledState(localStorage.getItem(WAKE_KEY) === "1");
  }, []);

  const setWakeEnabled = useCallback((v: boolean) => {
    localStorage.setItem(WAKE_KEY, v ? "1" : "0");
    setWakeEnabledState(v);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500);
  }

  async function backupNow() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noble-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveToCurrentMenu(captured: string) {
    const currentLang = langRef.current;
    const currentPath = pathRef.current;
    const db = getDb();
    const now = Date.now();

    // Explicit routing menu commands take priority
    const cmd = dispatchCommand(captured, {
      navigate: nav,
      openMic: () => {},
      closeMic: () => stopActiveInternal(),
      signOut: () => { signOut(); nav({ to: "/login" }); },
      backup: () => void backupNow(),
      call: (name) => {
        db.contacts.filter((c) => c.fullName.toLowerCase().includes(name.toLowerCase()))
          .first().then((c) => {
            if (c?.phone) makeCall(c.phone);
            else showToast(currentLang === "id" ? "Kontak tidak ditemukan" : "Contact not found");
          });
      },
    });
    if (cmd.handled) {
      showToast(currentLang === "id" ? "Perintah dijalankan" : "Command run");
      return;
    }

    // If autoSaveRaw, dump into notes as-is
    const autoRaw = getAutoSaveRaw();
    const defaultType: ItemType = ROUTE_TYPE[currentPath] ?? "note";

    // Parse locally first
    const p = parseUtterance(captured, currentLang);
    // For a menu context, prefer the menu's own type over parser's guess
    // unless the user clearly used a different trigger word.
    const type: ItemType = autoRaw ? "note" : (p.type !== "note" && !ROUTE_TYPE[currentPath] ? p.type : defaultType);

    let title = p.title || captured;
    let tags: string[] = [];

    // Premium AI enrichment (non-blocking best-effort)
    if (isPremium()) {
      try {
        const res = await analyzeVoice({ data: { transcript: captured } });
        if (res.ok) {
          if (res.result.title) title = res.result.title;
          if (res.result.category) tags = [res.result.category];
        }
      } catch { /* fall back silently */ }
    }

    let id: number | undefined;
    let label = title;

    if (type === "note") {
      id = await db.notes.add({
        title: title.length > 80 ? title.slice(0, 77) + "…" : title,
        transcript: captured,
        language: currentLang,
        tags: currentPath === "/trips" ? [...tags, "trip"] : currentPath === "/projects" ? [...tags, "project"] : tags,
        createdAt: now, updatedAt: now,
      });
    } else if (type === "task") {
      id = await db.tasks.add({
        title, dueAt: p.when, reminderAt: p.when,
        priority: "med", status: "open", createdAt: now,
      });
    } else if (type === "meeting") {
      id = await db.meetings.add({
        title, summary: p.body ?? "", attendees: [], meetingAt: p.when,
        actionItems: [], createdAt: now,
      });
    } else if (type === "appointment") {
      id = await db.appointments.add({
        title, appointmentAt: p.when ?? now + 3600_000, reminderAt: p.when,
      });
    } else if (type === "contact") {
      const name = p.contact?.fullName ?? title;
      id = await db.contacts.add({
        fullName: name, email: p.contact?.email, tags, createdAt: now,
      });
      label = name;
    } else if (type === "message") {
      id = await db.messages.add({
        content: p.body ?? title, status: "saved", createdAt: now,
      });
    }

    if (p.when && id && (type === "task" || type === "appointment" || type === "meeting")) {
      await createReminder(type, id, label, p.when);
    }

    showToast(
      (currentLang === "id" ? "Tersimpan: " : "Saved: ") +
        (type === "note" ? (currentLang === "id" ? "Catatan" : "Note")
        : type === "task" ? (currentLang === "id" ? "Tugas" : "Task")
        : type === "meeting" ? (currentLang === "id" ? "Rapat" : "Meeting")
        : type === "appointment" ? (currentLang === "id" ? "Janji" : "Appointment")
        : type === "contact" ? (currentLang === "id" ? "Kontak" : "Contact")
        : (currentLang === "id" ? "Pesan" : "Message")),
    );
  }

  // ---- Session control ----
  const stopSession = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
  };

  const startWake = useCallback(() => {
    if (!isVoiceSupported()) return;
    if (modeRef.current !== "off") return;
    setMode("wake");
    modeRef.current = "wake";
    const listen = () => {
      const s = startVoice(
        langRef.current,
        () => {},
        (final) => {
          const norm = normalize(final);
          const phrase = normalize(wakePhrase);
          if (norm && phrase && norm.includes(phrase)) {
            // Transition to active listening
            setMode("off"); modeRef.current = "off";
            setTimeout(() => startActiveInternal(), 250);
          } else if (modeRef.current === "wake") {
            // keep listening
            setTimeout(listen, 300);
          }
        },
        () => {
          // On error: retry after a delay if still in wake mode
          if (modeRef.current === "wake") setTimeout(listen, 1500);
        },
      );
      sessionRef.current = s;
    };
    listen();
  }, [wakePhrase]);

  const startActiveInternal = () => {
    if (!isVoiceSupported()) return;
    stopSession();
    setMode("active");
    modeRef.current = "active";
    setTranscript("");
    showToast(langRef.current === "id" ? "Mic aktif" : "Mic on");
    const loop = () => {
      const s = startVoice(
        langRef.current,
        (interim) => setTranscript(interim),
        (final) => {
          setTranscript("");
          const text = (final || "").trim();
          if (text) {
            const norm = normalize(text);
            if (/\b(close mic|stop mic|stop|standby|berhenti|matikan mic)\b/.test(norm)) {
              stopActiveInternal();
              return;
            }
            void saveToCurrentMenu(text);
          }
          if (modeRef.current === "active") setTimeout(loop, 250);
        },
        (err) => {
          if (err === "not-allowed" || err === "service-not-allowed") {
            showToast(langRef.current === "id" ? "Izin mikrofon ditolak" : "Microphone denied");
            stopActiveInternal();
            return;
          }
          if (modeRef.current === "active") setTimeout(loop, 800);
        },
      );
      sessionRef.current = s;
    };
    loop();
  };

  const stopActiveInternal = () => {
    stopSession();
    setMode("off");
    modeRef.current = "off";
    setTranscript("");
    // Restart wake listener if enabled
    if (localStorage.getItem(WAKE_KEY) === "1") {
      setTimeout(() => startWake(), 500);
    }
  };

  const startActive = useCallback(() => {
    // stop wake if running
    if (modeRef.current === "wake") { stopSession(); setMode("off"); modeRef.current = "off"; }
    startActiveInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopActive = useCallback(() => stopActiveInternal(), []); // eslint-disable-line
  const toggleActive = useCallback(() => {
    if (modeRef.current === "active") stopActiveInternal();
    else startActive();
  }, [startActive]);

  // Boot wake listener when enabled
  useEffect(() => {
    if (wakeEnabled && modeRef.current === "off") startWake();
    if (!wakeEnabled && modeRef.current === "wake") { stopSession(); setMode("off"); modeRef.current = "off"; }
  }, [wakeEnabled, startWake]);

  useEffect(() => () => stopSession(), []);

  return (
    <VoiceCtx.Provider value={{
      mode, transcript, toast, supported, wakeEnabled, setWakeEnabled,
      startActive, stopActive, toggleActive,
    }}>
      {children}
    </VoiceCtx.Provider>
  );
}

export function useVoice(): Ctx {
  const v = useContext(VoiceCtx);
  if (!v) throw new Error("useVoice outside VoiceProvider");
  return v;
}
