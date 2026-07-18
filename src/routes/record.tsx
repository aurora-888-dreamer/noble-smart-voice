import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { X, Check, Mic, Pencil } from "lucide-react";
import { useLang, useRecordTimeoutMin } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { isVoiceSupported, startVoice, primeMicrophone, type VoiceSession } from "@/lib/voice";
import { parseUtterance } from "@/lib/parser";
import { saveCapturedEntry } from "@/lib/capture";
import { isPremium } from "@/lib/auth-store";
import { analyzeVoice, transcribeAudio } from "@/lib/ai.functions";
import { startAudioCapture, blobToBase64, type AudioCaptureHandle } from "@/lib/audio-capture";
import type { ItemType } from "@/lib/db";

export const Route = createFileRoute("/record")({
  head: () => ({ meta: [{ title: "Recording — Noble" }] }),
  component: RecordPage,
});

type Phase = "listening" | "category" | "preview" | "editing";

const STOP_RE = /^(close mic|stop mic|mute mic|stop|selesai|tutup mic|matikan mic|simpan sekarang|save now|done)$/i;

function normalize(s: string) {
  return s.trim().replace(/[.!?,]+$/, "");
}

const TYPES: ItemType[] = ["note", "task", "meeting", "appointment", "contact", "message", "diary"];

function extractEmail(text: string): string | undefined {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m?.[0];
}

function RecordPage() {
  const [lang] = useLang();
  const [timeoutMin] = useRecordTimeoutMin();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("listening");
  const [interim, setInterim] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(timeoutMin * 60_000);
  const [supported, setSupported] = useState(true);

  const [suggestedType, setSuggestedType] = useState<ItemType>("note");
  const [type, setType] = useState<ItemType>("note");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<number | undefined>(undefined);
  const [content, setContent] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [transcriptAiBusy, setTranscriptAiBusy] = useState(false);
  const [transcriptAiApplied, setTranscriptAiApplied] = useState(false);
  const [transcriptAiError, setTranscriptAiError] = useState<string | null>(null);

  const fullTextRef = useRef("");
  const audioHandleRef = useRef<AudioCaptureHandle | null>(null);
  const parsedDefaultsRef = useRef({ title: "", when: undefined as number | undefined });
  const chunksRef = useRef<string[]>([]);
  const sessionRef = useRef<VoiceSession | null>(null);
  const lastSpeechAtRef = useRef<number>(Date.now());
  const startedAtRef = useRef<number>(Date.now());
  const stoppingRef = useRef(false);
  const phaseRef = useRef<Phase>("listening");
  const timeoutMsRef = useRef(timeoutMin * 60_000);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { timeoutMsRef.current = timeoutMin * 60_000; }, [timeoutMin]);

  const finalizeRecording = useCallback(() => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    sessionRef.current?.stop();
    sessionRef.current = null;

    const fullText = chunksRef.current.join(" ").trim();

    // Stop the parallel audio capture regardless of whether the browser
    // caption came out empty — the raw audio may still be usable.
    const audioHandle = audioHandleRef.current;
    audioHandleRef.current = null;
    const audioResultPromise = audioHandle ? audioHandle.stop() : Promise.resolve(null);

    if (!fullText) {
      void audioResultPromise.then((r) => {
        // Nothing was heard by the browser captions at all — don't bother
        // spending an AI call; just bail out like before.
        void r;
      });
      navigate({ to: "/" });
      return;
    }
    fullTextRef.current = fullText;
    const p = parseUtterance(fullText, lang);
    parsedDefaultsRef.current = { title: p.title || fullText.slice(0, 80), when: p.when };
    setSuggestedType(p.type);
    setType(p.type);
    setContent(fullText);
    setPhase("category");

    // Best-effort, non-blocking: replace the draft transcript with a more
    // accurate bilingual pass once it's ready, but only if the person
    // hasn't already started editing it themselves.
    if (!isPremium()) {
      console.log("[Noble] AI transcript skipped: Premium not active.");
    } else if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.log("[Noble] AI transcript skipped: device is offline.");
    } else {
      setTranscriptAiBusy(true);
      audioResultPromise
        .then(async (result) => {
          if (!result) {
            console.warn("[Noble] AI transcript skipped: no audio was captured (mic permission for recording may have been denied).");
            setTranscriptAiError("Tidak ada audio yang terekam untuk AI.");
            return;
          }
          console.log("[Noble] Sending audio to AI for transcription…", { mimeType: result.mimeType, sizeKB: Math.round(result.blob.size / 1024) });
          const audioBase64 = await blobToBase64(result.blob);
          const res = await transcribeAudio({ data: { audioBase64, mimeType: result.mimeType } });
          if (res.ok && res.text) {
            console.log("[Noble] AI transcript received:", res.text);
            setContent((cur) => (cur === fullText ? res.text : cur));
            setTranscriptAiApplied(true);
          } else {
            console.error("[Noble] AI transcript failed:", !res.ok ? res.error : "empty response");
            setTranscriptAiError(!res.ok ? res.error : "Respons AI kosong.");
          }
        })
        .catch((err) => {
          console.error("[Noble] AI transcript threw an error:", err);
          setTranscriptAiError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => setTranscriptAiBusy(false));
    }
  }, [lang, navigate]);

  // Raw audio capture (parallel to the live browser captions) — used for a
  // more accurate bilingual transcription pass once recording stops.
  useEffect(() => {
    let cancelled = false;
    startAudioCapture().then((h) => {
      if (cancelled) audioHandleRef.current = null;
      else audioHandleRef.current = h;
    });
    return () => {
      cancelled = true;
      audioHandleRef.current?.cancel();
      audioHandleRef.current = null;
    };
  }, []);

  // Voice capture loop (listening phase only)
  useEffect(() => {
    setSupported(isVoiceSupported());
    if (!isVoiceSupported()) return;
    let cancelled = false;
    void primeMicrophone();

    const startLoop = () => {
      if (cancelled) return;
      const s = startVoice(
        lang,
        (text) => setInterim(text),
        (final) => {
          const chunk = normalize(final);
          if (!chunk) {
            if (phaseRef.current === "listening") startLoop();
            return;
          }
          if (STOP_RE.test(chunk)) {
            finalizeRecording();
            return;
          }
          chunksRef.current.push(chunk);
          lastSpeechAtRef.current = Date.now();
          setInterim("");
          if (phaseRef.current === "listening") startLoop();
        },
        (err) => {
          if (err === "not-allowed" || err === "service-not-allowed") {
            navigate({ to: "/" });
            return;
          }
          if (phaseRef.current === "listening" && !cancelled) setTimeout(startLoop, 400);
        },
        { continuous: false },
      );
      sessionRef.current = s;
    };
    startLoop();

    return () => {
      cancelled = true;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
    // Deliberately depends on `lang`: the language setting hydrates from
    // localStorage a tick after mount (starts as "en" for SSR-safety), so
    // without this the recognizer could get permanently stuck on the
    // wrong locale for the whole session even when Settings says Indonesia.
  }, [lang]);

  // Elapsed clock + silence countdown toward auto-stop (listening phase only)
  useEffect(() => {
    const iv = setInterval(() => {
      if (phaseRef.current !== "listening") return;
      const now = Date.now();
      setElapsedMs(now - startedAtRef.current);
      const remain = timeoutMsRef.current - (now - lastSpeechAtRef.current);
      setRemainingMs(remain);
      if (remain <= 0) finalizeRecording();
    }, 250);
    return () => clearInterval(iv);
  }, [finalizeRecording]);

  function cancelAll() {
    sessionRef.current?.stop();
    navigate({ to: "/" });
  }

  // Category chosen -> build the AI/local-formatted read-only preview.
  function pickCategory(picked: ItemType) {
    setType(picked);
    const defaults = parsedDefaultsRef.current;
    setTitle(defaults.title);
    setWhen(defaults.when);
    setPhase("preview");

    if (isPremium() && typeof navigator !== "undefined" && navigator.onLine) {
      setAiBusy(true);
      analyzeVoice({ data: { transcript: fullTextRef.current } })
        .then((res) => {
          if (!res.ok) return;
          setTitle((cur) => (cur === defaults.title ? res.result.title || cur : cur));
        })
        .catch(() => {})
        .finally(() => setAiBusy(false));
    }
  }

  async function handleSave() {
    await saveCapturedEntry(
      {
        type,
        title,
        body: content,
        when,
        contact: type === "contact" ? { fullName: title, email: extractEmail(content) } : undefined,
      },
      lang,
    );
    navigate({ to: "/" });
  }

  function fmt(ms: number) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  const whenLocal = when ? new Date(when - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";

  if (!supported) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background text-foreground p-6 text-center">
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            {lang === "id" ? "Pengenalan suara tidak didukung di browser ini." : "Voice recognition isn't supported in this browser."}
          </p>
          <button onClick={() => navigate({ to: "/" })} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">
            {lang === "id" ? "Kembali" : "Back"}
          </button>
        </div>
      </div>
    );
  }

  // ---- Phase: listening ----
  if (phase === "listening") {
    const hasText = chunksRef.current.length > 0 || interim.length > 0;
    return (
      <div className="min-h-dvh flex flex-col bg-background text-foreground">
        <div className="flex justify-between items-center p-4">
          <button onClick={cancelAll} aria-label="Cancel" className="grid place-items-center w-10 h-10 rounded-full border border-border active:scale-95">
            <X size={18} />
          </button>
          <span className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-destructive mic-pulse" />
              <span className="relative rounded-full w-2 h-2 bg-destructive" />
            </span>
            {fmt(elapsedMs)}
          </span>
        </div>

        <div className="flex-1 flex flex-col px-4 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-border bg-card p-4">
            {hasText ? (
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {chunksRef.current.join("\n")}
                {interim && (
                  <span className="text-muted-foreground italic">
                    {chunksRef.current.length > 0 ? "\n" : ""}
                    {interim}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-base text-muted-foreground text-center mt-6">
                {lang === "id" ? "Mulai bicara…" : "Start speaking…"}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 pt-3 pb-1">
            <Mic size={14} className="text-destructive" />
            <p className="text-xs text-muted-foreground text-center">
              {t(lang, "recSayToStop")} {fmt(remainingMs)}
            </p>
          </div>
        </div>

        <div className="p-6">
          <button
            onClick={finalizeRecording}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Check size={16} /> {t(lang, "recTapDone")}
          </button>
        </div>
      </div>
    );
  }

  // ---- Phase: category picker ----
  if (phase === "category") {
    return (
      <div className="min-h-dvh flex flex-col bg-background text-foreground">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <button onClick={cancelAll} aria-label="Cancel" className="grid place-items-center w-9 h-9 rounded-full border border-border active:scale-95">
            <X size={16} />
          </button>
          <h1 className="text-sm font-semibold">{t(lang, "recPickCategory")}</h1>
          <span className="w-9" />
        </div>
        <div className="flex-1 p-6 flex flex-col gap-4 max-w-md mx-auto w-full">
          <p className="text-xs text-muted-foreground line-clamp-3">{content}</p>
          {transcriptAiBusy && <p className="text-[11px] text-primary animate-pulse">{t(lang, "recAiRefining")}</p>}
          {transcriptAiError && (
            <p className="text-[11px] text-destructive">
              {lang === "id" ? "AI gagal: " : "AI failed: "}
              {transcriptAiError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 mt-2">
            {TYPES.map((tp) => (
              <button
                key={tp}
                onClick={() => pickCategory(tp)}
                className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition-colors ${
                  tp === suggestedType
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground active:scale-[0.98]"
                }`}
              >
                {t(lang, tp)}
                {tp === suggestedType && (
                  <span className="block text-[10px] font-normal text-muted-foreground mt-1">
                    {lang === "id" ? "disarankan" : "suggested"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Phase: preview (AI-formatted, read-only) ----
  if (phase === "preview") {
    return (
      <div className="min-h-dvh flex flex-col bg-background text-foreground">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <button onClick={cancelAll} aria-label="Cancel" className="grid place-items-center w-9 h-9 rounded-full border border-border active:scale-95">
            <X size={16} />
          </button>
          <h1 className="text-sm font-semibold">{t(lang, type)}</h1>
          <button onClick={() => setPhase("editing")} aria-label="Edit" className="grid place-items-center w-9 h-9 rounded-full border border-border active:scale-95">
            <Pencil size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 max-w-md mx-auto w-full space-y-4">
          {(aiBusy || transcriptAiBusy) && <p className="text-xs text-primary animate-pulse">{t(lang, "recAiRefining")}</p>}
          {transcriptAiError && (
            <p className="text-xs text-destructive">
              {lang === "id" ? "AI gagal: " : "AI failed: "}
              {transcriptAiError}
            </p>
          )}
          {!aiBusy && !transcriptAiBusy && transcriptAiApplied && (
            <p className="text-xs text-primary">{lang === "id" ? "✓ Transkrip disempurnakan AI" : "✓ Transcript refined by AI"}</p>
          )}

          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{t(lang, "recTitleLabel")}</p>
            <p className="text-lg font-semibold">{title}</p>

            {(type === "task" || type === "meeting" || type === "appointment") && (
              <>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3 mb-1">{t(lang, "recWhenLabel")}</p>
                <p className="text-sm">
                  {when ? new Date(when).toLocaleString(lang === "id" ? "id-ID" : "en-US") : lang === "id" ? "Belum ditentukan" : "Not set"}
                </p>
              </>
            )}

            {type === "contact" && (
              <>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3 mb-1">Email</p>
                <p className="text-sm">{extractEmail(content) ?? (lang === "id" ? "Tidak terdeteksi" : "Not detected")}</p>
              </>
            )}

            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3 mb-1">{t(lang, "recContentLabel")}</p>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{content}</p>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-background flex gap-3 max-w-md mx-auto w-full">
          <button onClick={cancelAll} className="flex-1 rounded-2xl border border-border py-3 text-sm font-semibold">
            {t(lang, "recDiscard")}
          </button>
          <button onClick={handleSave} className="flex-1 rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold">
            {t(lang, "recSave")}
          </button>
        </div>
      </div>
    );
  }

  // ---- Phase: editing ----
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <div className="flex justify-between items-center p-4 border-b border-border">
        <button onClick={() => setPhase("preview")} aria-label="Back" className="grid place-items-center w-9 h-9 rounded-full border border-border active:scale-95">
          <X size={16} />
        </button>
        <h1 className="text-sm font-semibold">{t(lang, "recReviewTitle")}</h1>
        <span className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-4 space-y-4 max-w-md mx-auto w-full">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{t(lang, "recSubtitleLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((tp) => (
              <button
                key={tp}
                onClick={() => setType(tp)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  type === tp ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"
                }`}
              >
                {t(lang, tp)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t(lang, "recTitleLabel")}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm"
          />
        </div>

        {(type === "task" || type === "meeting" || type === "appointment") && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t(lang, "recWhenLabel")}</label>
            <input
              type="datetime-local"
              value={whenLocal}
              onChange={(e) => {
                const v = e.target.value;
                setWhen(v ? new Date(v).getTime() : undefined);
              }}
              className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t(lang, "recContentLabel")}</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm resize-none"
          />
        </div>
      </div>

      <div className="p-4 border-t border-border bg-background flex gap-3 max-w-md mx-auto w-full">
        <button onClick={cancelAll} className="flex-1 rounded-2xl border border-border py-3 text-sm font-semibold">
          {t(lang, "recDiscard")}
        </button>
        <button onClick={handleSave} className="flex-1 rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold">
          {t(lang, "recSave")}
        </button>
      </div>
    </div>
  );
}
