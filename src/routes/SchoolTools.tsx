// School-scoped tools. These stay INSIDE the School Dashboard and never
// navigate back to the main Noble app pages. Teachers use them to capture
// text/photo/translation/math without losing their spot in a class tab.
import { useEffect, useRef, useState } from "react";
import { Mic, Camera, Languages, Calculator as CalcIcon, X, Copy, Check, Loader2, Download, Square } from "lucide-react";
import { CalculatorWidget } from "./CalculatorWidget";
import { startVoice, primeMicrophone, isVoiceSupported, type VoiceSession } from "@/lib/voice";
import { translateText } from "@/lib/ai.functions";
import { useSchoolSession, getStoredSchoolPassword } from "@/lib/school-store";
import { saveGalleryFile } from "@/lib/school-gallery.functions";

type Tool = "voice" | "camera" | "translate" | "calc" | null;

export function SchoolTools() {
  const [open, setOpen] = useState<Tool>(null);
  const btn = "grid place-items-center w-9 h-9 rounded-full border border-border bg-card text-foreground active:scale-95";
  return (
    <>
      <div className="flex items-center gap-1.5">
        <button className={btn} title="Voice capture" aria-label="Voice capture" onClick={() => setOpen("voice")}><Mic size={16} /></button>
        <button className={btn} title="Camera" aria-label="Camera" onClick={() => setOpen("camera")}><Camera size={16} /></button>
        <button className={btn} title="Translator" aria-label="Translator" onClick={() => setOpen("translate")}><Languages size={16} /></button>
        <button className={btn} title="Calculator" aria-label="Calculator" onClick={() => setOpen("calc")}><CalcIcon size={16} /></button>
      </div>
      {open && <ToolModal tool={open} onClose={() => setOpen(null)} />}
    </>
  );
}


function ToolModal({ tool, onClose }: { tool: Exclude<Tool, null>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold capitalize">{tool === "calc" ? "Calculator" : tool}</p>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground" aria-label="Close"><X size={16} /></button>
        </div>
        {tool === "voice" && <VoiceTool />}
        {tool === "camera" && <CameraTool />}
        {tool === "translate" && <TranslateTool />}
        {tool === "calc" && <CalculatorWidget />}
      </div>
    </div>
  );
}

function VoiceTool() {
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [rec, setRec] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const session = useRef<VoiceSession | null>(null);
  const supported = isVoiceSupported();

  async function start() {
    setErr(null);
    await primeMicrophone();
    const s = startVoice(undefined,
      (t) => setInterim(t),
      (t) => { setText((prev) => (prev ? prev + " " : "") + t); setInterim(""); },
      (e) => setErr(e),
      { continuous: true },
    );
    if (!s) { setErr("Speech recognition unavailable"); return; }
    session.current = s;
    setRec(true);
  }
  function stop() {
    session.current?.stop();
    session.current = null;
    setRec(false);
    setInterim("");
  }
  useEffect(() => () => session.current?.stop(), []);

  async function copy() {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* */ }
  }

  if (!supported) return <p className="text-sm text-muted-foreground">Speech recognition is not available on this device/browser.</p>;

  return (
    <div className="space-y-3">
      <textarea value={text + (interim ? " " + interim : "")} onChange={(e) => setText(e.target.value)}
        rows={6} placeholder="Transcript will appear here. Speak in English or Bahasa Indonesia."
        className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="flex gap-2">
        {!rec ? (
          <button onClick={start} className="flex-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2"><Mic size={14} />Start</button>
        ) : (
          <button onClick={stop} className="flex-1 rounded-lg bg-destructive text-destructive-foreground px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2"><Square size={14} />Stop</button>
        )}
        <button onClick={copy} disabled={!text} className="rounded-lg border border-border px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-40">
          {copied ? <Check size={14} /> : <Copy size={14} />}Copy
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">Copy the transcript and paste into any school field (Daily Activity, Assessment, Message, Notes).</p>
    </div>
  );
}

function CameraTool() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mirrored, setMirrored] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const { session } = useSchoolSession();

  async function saveToGallery(dataUrl: string) {
    if (!session) return;
    const fileName = `camera-${Date.now()}.jpg`;
    if (session.kind === "parent") {
      await saveGalleryFile({ data: { code: session.parentCode ?? "", fileType: "image", fileName, dataUrl, source: "camera" } });
    } else {
      await saveGalleryFile({ data: { password: getStoredSchoolPassword(), staffId: session.id, fileType: "image", fileName, dataUrl, source: "camera" } });
    }
    setSavedToGallery(true);
    setTimeout(() => setSavedToGallery(false), 1500);
  }

  useEffect(() => {
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        setStream(s);
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capture() {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (mirrored) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0);
    setShot(c.toDataURL("image/jpeg", 0.9));
  }
  async function copyImg() {
    if (!shot) return;
    try {
      const blob = await (await fetch(shot)).blob();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (navigator.clipboard as any).write?.([new (window as any).ClipboardItem({ [blob.type]: blob })]);
      setCopied(true); setTimeout(() => setCopied(false), 1200);
    } catch { /* */ }
  }
  function download() {
    if (!shot) return;
    const a = document.createElement("a"); a.href = shot; a.download = `school-${Date.now()}.jpg`; a.click();
  }

  return (
    <div className="space-y-3">
      {err && <p className="text-xs text-destructive">{err}</p>}
      {/* The <video> element stays mounted the whole time (just hidden once a
       * shot is taken) so its stream never has to be reattached — retaking
       * used to break because the video tag got unmounted+remounted and lost
       * its srcObject on the way back. */}
      <video
        ref={videoRef}
        className={"w-full rounded-lg bg-black aspect-video " + (shot ? "hidden" : "") + (mirrored ? " -scale-x-100" : "")}
        playsInline muted
      />
      {!shot ? (
        <div className="flex gap-2">
          <button onClick={capture} disabled={!stream} className="flex-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"><Camera size={14} />Capture</button>
          <button onClick={() => setMirrored((m) => !m)} className="rounded-lg border border-border px-3 py-2 text-sm" title="Balik gambar kalau kamera laptop kamu terbalik">{mirrored ? "Unflip" : "Flip"}</button>
        </div>
      ) : (
        <>
          <img src={shot} alt="capture" className="w-full rounded-lg" />
          <div className="flex gap-2">
            <button onClick={() => setShot(null)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm">Retake</button>
            <button onClick={copyImg} className="rounded-lg border border-border px-3 py-2 text-sm flex items-center gap-2">{copied ? <Check size={14} /> : <Copy size={14} />}Copy</button>
            <button onClick={download} className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm flex items-center gap-2"><Download size={14} />Save</button>
          </div>
          <button onClick={() => saveToGallery(shot)} className="w-full rounded-lg border border-border px-3 py-2 text-sm flex items-center justify-center gap-2">{savedToGallery ? "Tersimpan ✓" : "Simpan ke Gallery"}</button>
        </>
      )}
    </div>
  );
}

const LANGS = ["English", "Bahasa Indonesia", "Mandarin Chinese", "Japanese", "Spanish", "Arabic"];
function TranslateTool() {
  const [src, setSrc] = useState("");
  const [target, setTarget] = useState("Bahasa Indonesia");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    if (!src.trim()) return;
    setBusy(true); setErr(null); setOut("");
    try {
      const res = await translateText({ data: { text: src, targetLang: target } });
      if (res.ok) setOut(res.text); else setErr(res.error);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!out) return;
    try { await navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* */ }
  }
  return (
    <div className="space-y-3">
      <textarea value={src} onChange={(e) => setSrc(e.target.value)} rows={4} placeholder="Source text (EN / ID / mixed)"
        className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
      <div className="flex gap-2 items-center">
        <span className="text-xs text-muted-foreground">→</span>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="flex-1 rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
          {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button onClick={run} disabled={busy || !src.trim()} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}Translate
        </button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {out && (
        <div className="rounded-lg bg-secondary/60 border border-border p-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{out}</p>
          <button onClick={copy} className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
            {copied ? <Check size={12} /> : <Copy size={12} />}Copy
          </button>
        </div>
      )}
    </div>
  );
}
