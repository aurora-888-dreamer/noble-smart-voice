import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isVoiceSupported, startVoice, primeMicrophone, type VoiceSession } from "./voice";
import { useLang } from "./settings-store";
import { dispatchCommand } from "./commands";
import { exportAll, getDb } from "./db";
import { signOut } from "./auth-store";
import { makeCall } from "./share";

// Wake-word / "voice tag" listening was removed — it never worked reliably
// (false triggers, missed phrases, battery drain from always-on listening).
// Voice commands are now only ever started manually via the mic button
// (startActive), never by a spoken wake phrase in the background.
type Mode = "off" | "active";

interface Ctx {
  mode: Mode;
  toast: string | null;
  supported: boolean;
  startActive: () => void;
  stopActive: () => void;
}

const VoiceCtx = createContext<Ctx | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [lang] = useLang();
  const nav = useNavigate();
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const [mode, setMode] = useState<Mode>("off");
  const [toast, setToast] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const sessionRef = useRef<VoiceSession | null>(null);
  const modeRef = useRef<Mode>("off");
  const activeFailCountRef = useRef(0);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    setSupported(isVoiceSupported());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
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

  const stopSession = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
  };

  // ---- Command-listening ("active") session — manually triggered only ----
  const stopActiveInternal = useCallback(() => {
    stopSession();
    setMode("off");
    modeRef.current = "off";
  }, []);

  const startActiveInternal = useCallback(() => {
    if (!isVoiceSupported()) return;
    stopSession();
    activeFailCountRef.current = 0;
    setMode("active");
    modeRef.current = "active";
    showToast(langRef.current === "id" ? "Mendengarkan perintah…" : "Listening for a command…");
    void primeMicrophone();

    const ctx = {
      navigate: nav,
      openMic: () => {},
      closeMic: () => stopActiveInternal(),
      signOut: () => { signOut(); nav({ to: "/login" }); },
      backup: () => void backupNow(),
      call: (name: string) => {
        const db = getDb();
        db.contacts
          .filter((c) => c.fullName.toLowerCase().includes(name.toLowerCase()))
          .first()
          .then((c) => {
            if (c?.phone) makeCall(c.phone);
            else showToast(langRef.current === "id" ? "Kontak tidak ditemukan" : "Contact not found");
          });
      },
      goRecord: () => nav({ to: "/record" }),
    };

    const startLoop = () => {
      const s = startVoice(
        langRef.current,
        () => {},
        (final) => {
          const text = (final || "").trim();
          activeFailCountRef.current = 0;
          if (!text) {
            if (modeRef.current === "active") startLoop();
            return;
          }
          const cmd = dispatchCommand(text, ctx);
          if (cmd.handled) {
            if (cmd.intent !== "closeMic" && cmd.intent !== "standby") {
              showToast(langRef.current === "id" ? "Perintah dijalankan" : "Command run");
              stopActiveInternal();
            }
            return;
          }
          showToast(langRef.current === "id" ? "Perintah tidak dikenali" : "Command not recognized");
          if (modeRef.current === "active") startLoop();
        },
        (err) => {
          if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
            showToast(langRef.current === "id" ? "Izin mikrofon ditolak" : "Microphone denied");
            stopActiveInternal();
            return;
          }
          if (err !== "no-speech") {
            activeFailCountRef.current += 1;
          }
          if (activeFailCountRef.current >= 10) {
            showToast(
              langRef.current === "id"
                ? "Mikrofon tidak merespons — coba tombol Record manual"
                : "Microphone unresponsive — try the manual Record button",
            );
            stopActiveInternal();
            return;
          }
          if (modeRef.current === "active") setTimeout(startLoop, 400);
        },
        { continuous: true },
      );
      sessionRef.current = s;
    };
    startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, stopActiveInternal]);

  const startActive = useCallback(() => {
    startActiveInternal();
  }, [startActiveInternal]);

  const stopActive = useCallback(() => stopActiveInternal(), [stopActiveInternal]);

  useEffect(() => () => stopSession(), []);

  return (
    <VoiceCtx.Provider value={{ mode, toast, supported, startActive, stopActive }}>
      {children}
    </VoiceCtx.Provider>
  );
}

export function useVoice(): Ctx {
  const v = useContext(VoiceCtx);
  if (!v) throw new Error("useVoice outside VoiceProvider");
  return v;
}
