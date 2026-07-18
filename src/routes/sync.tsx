import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Share2, Wifi, ArrowLeft, Check, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/settings-store";
import { startHost, joinWithHostCode, type HostHandle, type JoinHandle } from "@/lib/sync/webrtc-pairing";
import { sendPayload, receivePayload } from "@/lib/sync/protocol";
import { buildLocalExport, mergeRemoteExport, type SyncExport, type MergeStats } from "@/lib/sync/merge";

export const Route = createFileRoute("/sync")({
  head: () => ({ meta: [{ title: "Sync — Noble" }] }),
  component: SyncPage,
});

type Step = "choose" | "host-code" | "host-waiting" | "join-input" | "join-code" | "syncing" | "done";

const STAT_LABELS: Record<"en" | "id", Record<keyof MergeStats, string>> = {
  en: { notes: "Notes", messages: "Messages", tasks: "Tasks", meetings: "Meetings", appointments: "Appointments", contacts: "Contacts", trips: "Trips", projects: "Projects" },
  id: { notes: "Catatan", messages: "Pesan", tasks: "Tugas", meetings: "Rapat", appointments: "Janji", contacts: "Kontak", trips: "Perjalanan", projects: "Proyek" },
};

async function shareOrCopy(text: string, title: string) {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ text, title });
      return "shared";
    } catch {
      /* fall through to clipboard */
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}

function SyncPage() {
  const [lang] = useLang();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("choose");
  const [hostHandle, setHostHandle] = useState<HostHandle | null>(null);
  const [joinHandle, setJoinHandle] = useState<JoinHandle | null>(null);
  const [pastedHostCode, setPastedHostCode] = useState("");
  const [pastedAnswerCode, setPastedAnswerCode] = useState("");
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<MergeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSync(channel: RTCDataChannel) {
    setStep("syncing");
    try {
      const localExport = await buildLocalExport();
      sendPayload(channel, localExport);
      const remote = await new Promise<SyncExport>((resolve) => {
        receivePayload<SyncExport>(channel, resolve);
      });
      const merged = await mergeRemoteExport(remote);
      setStats(merged);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function beginHost() {
    setError(null);
    try {
      const h = await startHost();
      setHostHandle(h);
      setStep("host-code");
      h.channel.then((ch) => void runSync(ch));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function confirmHostAnswer() {
    if (!hostHandle) return;
    setError(null);
    try {
      await hostHandle.completeWithAnswer(pastedAnswerCode);
      setStep("host-waiting");
    } catch {
      setError(lang === "id" ? "Kode balasan tidak valid." : "That answer code isn't valid.");
    }
  }

  async function confirmJoin() {
    setError(null);
    try {
      const h = await joinWithHostCode(pastedHostCode);
      setJoinHandle(h);
      setStep("join-code");
      h.channel.then((ch) => void runSync(ch));
    } catch {
      setError(lang === "id" ? "Kode dari perangkat lain tidak valid." : "That code from the other device isn't valid.");
    }
  }

  async function doShare(text: string) {
    const result = await shareOrCopy(text, "Noble sync code");
    setCopyMsg(result === "copied" ? (lang === "id" ? "Disalin!" : "Copied!") : (lang === "id" ? "Dibagikan" : "Shared"));
    setTimeout(() => setCopyMsg(null), 2000);
  }

  function reset() {
    hostHandle?.close();
    joinHandle?.close();
    setHostHandle(null);
    setJoinHandle(null);
    setPastedHostCode("");
    setPastedAnswerCode("");
    setStats(null);
    setError(null);
    setStep("choose");
  }

  return (
    <AppShell title={lang === "id" ? "Sinkronisasi Perangkat" : "Sync Devices"}>
      <div className="max-w-md mx-auto">
        {step !== "choose" && step !== "done" && (
          <button onClick={reset} className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft size={14} /> {lang === "id" ? "Batal" : "Cancel"}
          </button>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive-foreground/90">
            {error}
          </div>
        )}

        {step === "choose" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {lang === "id"
                ? "Sambungkan langsung ke perangkat lain milikmu (WiFi yang sama, atau bagikan kodenya lewat Bluetooth/Nearby Share). Data mengalir langsung antar perangkat — tidak lewat server mana pun."
                : "Connect directly to your other device (same WiFi, or share the code over Bluetooth/Nearby Share). Data flows straight between devices — never through any server."}
            </p>
            <button
              onClick={beginHost}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Wifi size={16} /> {lang === "id" ? "Jadi Host (Perangkat ini)" : "Host from this device"}
            </button>
            <button
              onClick={() => setStep("join-input")}
              className="w-full rounded-2xl border border-border py-4 text-sm font-semibold"
            >
              {lang === "id" ? "Gabung ke perangkat lain" : "Join another device"}
            </button>
          </div>
        )}

        {step === "host-code" && hostHandle && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">1. {lang === "id" ? "Bagikan kode ini ke perangkat lain" : "Share this code with the other device"}</p>
            <textarea readOnly value={hostHandle.code} rows={4} className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-[10px] font-mono resize-none" />
            <div className="flex gap-2">
              <button onClick={() => doShare(hostHandle.code)} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                <Share2 size={15} /> {lang === "id" ? "Bagikan" : "Share"}
              </button>
              <button onClick={() => doShare(hostHandle.code)} className="rounded-xl border border-border px-3">
                <Copy size={15} />
              </button>
            </div>
            {copyMsg && <p className="text-xs text-primary">{copyMsg}</p>}

            <p className="text-sm font-semibold pt-2">2. {lang === "id" ? "Tempel kode balasan dari perangkat lain" : "Paste the reply code from the other device"}</p>
            <textarea
              value={pastedAnswerCode}
              onChange={(e) => setPastedAnswerCode(e.target.value)}
              rows={4}
              placeholder={lang === "id" ? "Tempel di sini…" : "Paste here…"}
              className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-[10px] font-mono resize-none"
            />
            <button
              onClick={confirmHostAnswer}
              disabled={!pastedAnswerCode.trim()}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-40"
            >
              {lang === "id" ? "Sambungkan" : "Connect"}
            </button>
          </div>
        )}

        {step === "host-waiting" && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{lang === "id" ? "Menghubungkan…" : "Connecting…"}</p>
          </div>
        )}

        {step === "join-input" && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">{lang === "id" ? "Tempel kode dari perangkat Host" : "Paste the code from the Host device"}</p>
            <textarea
              value={pastedHostCode}
              onChange={(e) => setPastedHostCode(e.target.value)}
              rows={5}
              placeholder={lang === "id" ? "Tempel di sini…" : "Paste here…"}
              className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-[10px] font-mono resize-none"
            />
            <button
              onClick={confirmJoin}
              disabled={!pastedHostCode.trim()}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-40"
            >
              {lang === "id" ? "Lanjut" : "Continue"}
            </button>
          </div>
        )}

        {step === "join-code" && joinHandle && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">{lang === "id" ? "Kirim balik kode ini ke perangkat Host" : "Send this code back to the Host device"}</p>
            <textarea readOnly value={joinHandle.answerCode} rows={4} className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-[10px] font-mono resize-none" />
            <div className="flex gap-2">
              <button onClick={() => doShare(joinHandle.answerCode)} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                <Share2 size={15} /> {lang === "id" ? "Bagikan" : "Share"}
              </button>
              <button onClick={() => doShare(joinHandle.answerCode)} className="rounded-xl border border-border px-3">
                <Copy size={15} />
              </button>
            </div>
            {copyMsg && <p className="text-xs text-primary">{copyMsg}</p>}
            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> {lang === "id" ? "Menunggu Host menyelesaikan…" : "Waiting for the Host to finish…"}
            </div>
          </div>
        )}

        {step === "syncing" && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{lang === "id" ? "Menyinkronkan data…" : "Syncing data…"}</p>
          </div>
        )}

        {step === "done" && stats && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="grid place-items-center w-14 h-14 rounded-full bg-primary/15 text-primary">
                <Check size={26} />
              </div>
              <p className="text-sm font-semibold">{lang === "id" ? "Sinkron selesai" : "Sync complete"}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4 text-sm space-y-1.5">
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{STAT_LABELS[lang][k as keyof MergeStats]}</span>
                  <span className="font-medium">+{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate({ to: "/" })} className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold">
              {lang === "id" ? "Selesai" : "Done"}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
