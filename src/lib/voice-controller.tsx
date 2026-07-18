import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { isVoiceSupported, startVoice, primeMicrophone, type VoiceSession } from "./voice";
import { useLang, useWakePhrase } from "./settings-store";
import { dispatchCommand } from "./commands";
import { exportAll, getDb } from "./db";
import { signOut } from "./auth-store";
import { makeCall } from "./share";

type Mode = "off" | "wake" | "active";

interface Ctx {
  mode: Mode;
  toast: string | null;
  supported: boolean;
  wakeEnabled: boolean;
  setWakeEnabled: (v: boolean) => void;
  startActive: () => void;
  stopActive: () => void;
}

const VoiceCtx = createContext<Ctx | null>(null);

const WAKE_KEY = "noble.wakeEnabled";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Fuzzy wake match: allow small mis-hearings (e.g. "aurora star" vs "aurora start").
function editDist(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return dp[a.length];
}
function wakeMatches(utterance: string, phrase: string): boolean {
  const u = normalize(utterance).split(" ").filter(Boolean);
  const p = normalize(phrase).split(" ").filter(Boolean);
  if (p.length === 0) return false;
  for (let i = 0; i <= u.length - p.length; i++) {
    let ok = true;
    for (let k = 0; k < p.length; k++) {
      const tol = Math.max(1, Math.floor(p[k].length / 4));
      if (editDist(u[i + k], p[k], tol) > tol) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [lang] = useLang();
  const [wakePhrase] = useWakePhrase();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const [mode, setMode] = useState<Mode>("off");
  const [toast, setToast] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [wakeEnabled, setWakeEnabledState] = useState(false);

  const sessionRef = useRef<VoiceSession | null>(null);
  const modeRef = useRef<Mode>("off");
  const wakeFailCountRef = useRef(0);
  const activeFailCountRef = useRef(0);
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

  // ---- Command-listening ("active") session ----
  const stopActiveInternal = useCallback(() => {
    stopSession();
    setMode("off");
    modeRef.current = "off";
    if (localStorage.getItem(WAKE_KEY) === "1") {
      setTimeout(() => startWake(), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (modeRef.current === "wake") { stopSession(); setMode("off"); modeRef.current = "off"; }
    startActiveInternal();
  }, [startActiveInternal]);

  const stopActive = useCallback(() => stopActiveInternal(), [stopActiveInternal]);

  // ---- Wake-word listener ----
  const startWake = useCallback(() => {
    if (!isVoiceSupported()) return;
    if (modeRef.current !== "off") return;
    if (pathname === "/record") return;
    setMode("wake");
    modeRef.current = "wake";
    wakeFailCountRef.current = 0;
    void primeMicrophone();
    const listen = () => {
      const s = startVoice(
        langRef.current,
        () => {},
        (final) => {
          wakeFailCountRef.current = 0;
          if (wakeMatches(final, wakePhrase)) {
            setMode("off");
            modeRef.current = "off";
            stopSession();
            setTimeout(() => startActiveInternal(), 250);
          } else if (modeRef.current === "wake") {
            setTimeout(listen, 200);
          }
        },
        (err) => {
          if (modeRef.current !== "wake") return;
          if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
            // Permission/hardware problem — retrying won't fix it. Stop and
            // say so, instead of flashing the mic on/off forever.
            setMode("off");
            modeRef.current = "off";
            stopSession();
            setWakeEnabled(false);
            showToast(
              langRef.current === "id"
                ? "Mikrofon tidak bisa diakses — wake listener dimatikan. Cek izin mikrofon HP kamu."
                : "Microphone inaccessible — wake listener turned off. Check your phone's mic permission.",
            );
            return;
          }
          wakeFailCountRef.current += (err === "no-speech" ? 0 : 1);
          if (wakeFailCountRef.current >= 10) {
            setMode("off");
            modeRef.current = "off";
            stopSession();
            setWakeEnabled(false);
            showToast(
              langRef.current === "id"
                ? "Wake listener dimatikan — mikrofon tidak merespons berulang kali."
                : "Wake listener turned off — microphone kept failing to respond.",
            );
            return;
          }
          setTimeout(listen, 1500);
        },
      );
      sessionRef.current = s;
    };
    listen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakePhrase, startActiveInternal, pathname, setWakeEnabled]);

  useEffect(() => {
    if (wakeEnabled && pathname !== "/record" && modeRef.current === "off") startWake();
    if ((!wakeEnabled || pathname === "/record") && modeRef.current === "wake") {
      stopSession();
      setMode("off");
      modeRef.current = "off";
    }
  }, [wakeEnabled, pathname, startWake]);

  useEffect(() => () => stopSession(), []);

  return (
    <VoiceCtx.Provider value={{ mode, toast, supported, wakeEnabled, setWakeEnabled, startActive, stopActive }}>
      {children}
    </VoiceCtx.Provider>
  );
}

export function useVoice(): Ctx {
  const v = useContext(VoiceCtx);
  if (!v) throw new Error("useVoice outside VoiceProvider");
  return v;
}
