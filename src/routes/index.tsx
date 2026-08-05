import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Camera,
  CreditCard,
  Download,
  FileText,
  FileUp,
  Image as ImageIcon,
  KeyRound,
  Languages,
  Loader2,
  Mic,
  Power,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { blobToBase64, fileToDataUrl, startRecording, type Recorder } from "@/lib/audio";
import { startLiveSpeech, SPEECH_LANGS, type LiveSpeech } from "@/lib/live-speech";
import { getStatus, redeemVoucher } from "@/lib/subscription.functions";
import { getDeviceId } from "@/lib/device";
import { useT, displayLangName, LANGUAGE_BCP47 } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { sendViaChannel, dataUrlToFile as sharedDataUrlToFile } from "@/lib/share";
import { addHistoryEntry, RECALL_STORAGE_KEY, type HistoryEntry } from "@/lib/history-store";
import {
  captionImage,
  synthesizeSpeech,
  transcribeAudio,
  translateText,
} from "@/lib/smartnote.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Magic Talk — Voice Memo Transcriber & Translator" },
      {
        name: "description",
        content:
          "Record, auto-transcribe and translate memos, attach captioned photos, then export as TXT, PDF or DOC and share anywhere.",
      },
      { property: "og:title", content: "Magic Talk — Voice Memo Transcriber" },
      {
        property: "og:description",
        content:
          "Speak your memo, get an editable transcript, translate it, attach AI-captioned photos and share it.",
      },
      { property: "og:url", content: "https://magic-talk.lovable.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://magic-talk.lovable.app/" }],
  }),
  component: Magic Talk,
});

const DEFAULT_LANGUAGES = [
  "English",
  "Indonesian",
  "Mandarin",
  "Japanese",
  "Korean",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Thai",
  "Vietnamese",
  "Arabic",
  "Tagalog",
  "Italian",
  "Hebrew",
];

type Attachment = {
  id: string;
  dataUrl: string;
  caption: string;
  captioning: boolean;
  mode: "pending" | "manual" | "auto";
  kind: "image" | "file";
  fileName?: string | undefined;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function newDocNo() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `SN-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function Magic Talk() {
  const t = useT();
  const transcribe = useServerFn(transcribeAudio);
  const translate = useServerFn(translateText);
  const caption = useServerFn(captionImage);
  const synthesize = useServerFn(synthesizeSpeech);
  const status = useServerFn(getStatus);
  const redeem = useServerFn(redeemVoucher);
  const router = useRouter();
  const [sub, setSub] = useState<{ plan: string; daysLeft: number } | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [hasOrder, setHasOrder] = useState(false);

  const [date, setDate] = useState(todayISO());
  const [docNo, setDocNo] = useState("");
  const [attn, setAttn] = useState("");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [noHeader, setNoHeader] = useState(false);
  // Replaces the old hardcoded "MAGIC TALK MEMO" title line at the top of
  // every shared message — each user can set their own name/brand once and
  // it's remembered on this device. Falls back to "MAGIC TALK MEMO" if left
  // blank, so nothing breaks for anyone who never sets it.
  const [profileName, setProfileName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [newLanguage, setNewLanguage] = useState("");
  const [target, setTarget] = useState(DEFAULT_LANGUAGES[0]!);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<null | string>(null);
  const [seconds, setSeconds] = useState(0);
  const [deviceId, setDeviceId] = useState("");
  const [interim, setInterim] = useState("");
  const [live, setLive] = useState(false);
  const [speechLang, setSpeechLang] = useState("auto");
  const [voucherCode, setVoucherCode] = useState("");
  // Best-guess BCP-47 locale of whatever is currently in the transcript
  // box, used to pick a voice for the Talk buttons. Updated after a
  // successful transcribe (from the spoken-language choice) and after a
  // successful translate (from the target language) — there's no perfect
  // signal since the browser doesn't tell us the AI's actual detected
  // language, so this is a best-effort guess, same as the live-preview one.
  const [contentLangCode, setContentLangCode] = useState("id-ID");
  const [speakingBrowser, setSpeakingBrowser] = useState(false);
  const [speakingAi, setSpeakingAi] = useState(false);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);

  const recorderRef = useRef<Recorder | null>(null);
  const liveRef = useRef<LiveSpeech | null>(null);
  const liveTextRef = useRef("");
  const baseTextRef = useRef("");
  // Session-only (NOT localStorage): remembers the last manually-picked
  // spoken language, used only as a live-preview guess while in "Auto
  // detect" mode. Deliberately reset on every page load/refresh — if this
  // were persisted, picking English once would permanently make Auto
  // detect's live preview guess English forever, even in a later session
  // where the user is speaking Indonesian, until they cleared their browser
  // storage by hand. A plain refresh should be enough to reset it back to
  // the Indonesian default, and now it is.
  const lastSpecificLangRef = useRef<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setDocNo(newDocNo());
  }, []);

  // Recall from History: the History page hands off one entry via
  // sessionStorage (not localStorage — this is a one-shot transfer, not a
  // persisted preference), which we consume once here and then clear so it
  // doesn't reappear on a later visit.
  useEffect(() => {
    const raw = sessionStorage.getItem(RECALL_STORAGE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(RECALL_STORAGE_KEY);
    try {
      const entry = JSON.parse(raw) as HistoryEntry;
      setDate(entry.date || todayISO());
      setDocNo(entry.docNo || newDocNo());
      setAttn(entry.attn || "");
      setFrom(entry.from || "");
      setSubject(entry.subject || "");
      setNoHeader(!!entry.noHeader);
      setTranscript(entry.transcript || "");
      setAttachments(
        (entry.attachments || []).map((a) => ({
          id: crypto.randomUUID(),
          dataUrl: a.dataUrl,
          caption: a.caption,
          captioning: false,
          mode: "manual" as const,
          kind: a.kind,
          fileName: a.fileName,
        })),
      );
      toast.success("Memo recalled from History — you can edit it before sending.");
    } catch {
      // Corrupt or unexpected payload — ignore silently.
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("smartnote.speechLang");
    if (saved) setSpeechLang(saved);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("smartnote.profileName");
    if (saved) setProfileName(saved);
  }, []);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    void status({ data: { deviceId: id } })
      .then((s) => {
        setSub({ plan: s.plan, daysLeft: s.daysLeft });
        setCreditBalance(s.creditsBalance);
        setHasOrder(s.hasOrder);
      })
      .catch(() => undefined);
  }, [status]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const plainText = useMemo(() => {
    const lines = [profileName.trim() || "MAGIC TALK MEMO"];
    if (!noHeader) {
      lines.push(
        `Date   : ${date}`,
        `Doc.No.: ${docNo}`,
        `ATTN To: ${attn}`,
        `From   : ${from}`,
      );
    }
    lines.push(`Subject: ${subject}`, "", "CONTENT", transcript);
    if (attachments.length) {
      lines.push("", "ATTACHMENTS");
      attachments.forEach((a, i) => lines.push(`${i + 1}. ${a.caption || "(no caption)"}`));
    }
    return lines.join("\n");
  }, [profileName, noHeader, date, docNo, attn, from, subject, transcript, attachments]);

  async function refreshCredit() {
    try {
      const s = await status({ data: { deviceId } });
      setCreditBalance(s.creditsBalance);
    } catch {
      // Non-critical — the balance will just refresh next time.
    }
  }

  function warnIfChargeFailed(res: { chargeFailed?: boolean }) {
    if (res.chargeFailed) {
      toast.warning(
        "This used AI, but credit charging failed on the server — it wasn't counted this time. If this keeps happening, the Supabase connection needs checking (see Admin).",
      );
    }
  }

  async function activateVoucher() {
    if (!voucherCode.trim()) {
      toast.error("Enter your voucher code first.");
      return;
    }
    setBusy("Activating…");
    try {
      const s = await redeem({ data: { deviceId, code: voucherCode.trim() } });
      setSub({ plan: s.plan, daysLeft: s.daysLeft });
      setCreditBalance(s.creditsBalance);
      setHasOrder(false);
      toast.success(`Activated! Plan: ${s.plan}, ${s.daysLeft} days, ${s.creditsBalance} credits.`);
      setVoucherCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Activation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleStart() {
    try {
      setSeconds(0);
      setInterim("");
      liveTextRef.current = "";
      baseTextRef.current = transcript;
      // Live-first capture: the on-device speech recognizer takes the mic
      // directly and writes words as they are spoken. We deliberately do
      // NOT run a parallel WAV recorder alongside it — on mobile the two
      // fight over the single microphone stream and the live preview dies.
      // Any AI refinement happens AFTER Stop, on the text.
      const liveLang =
        speechLang === "auto"
          ? lastSpecificLangRef.current || "id-ID"
          : speechLang;
      let liveErrorShown = false;
      liveRef.current = startLiveSpeech(
        (finalText, partial) => {
          liveTextRef.current = finalText;
          setInterim(partial);
          setTranscript(
            [baseTextRef.current, finalText]
              .filter(Boolean)
              .join(baseTextRef.current ? "\n" : ""),
          );
        },
        liveLang,
        (errorType) => {
          setLive(false);
          if (liveErrorShown) return; // avoid repeated toasts on auto-restart loops
          liveErrorShown = true;
          if (errorType === "language-not-supported") {
            toast.info(
              "Live preview isn't available for the selected language in this browser — your transcript will still appear normally after you hit Stop.",
            );
          } else if (errorType === "not-allowed") {
            toast.info(
              "Live preview needs microphone permission for speech recognition (separate from the recording permission) — check your browser's site settings. Your transcript will still appear after Stop.",
            );
          } else if (errorType !== "no-speech" && errorType !== "aborted") {
            toast.info(
              "Live preview stopped working in this browser — your transcript will still appear normally after you hit Stop.",
            );
          }
        },
      );
      setLive(Boolean(liveRef.current));
      if (!liveRef.current) {
        // No on-device recognizer (e.g. Firefox) — fall back to recording
        // audio and transcribing it on the server after Stop.
        recorderRef.current = await startRecording();
        toast.info(
          "Live preview isn't available in this browser right now (often a blocked microphone permission for speech recognition, separate from the recording permission) — your transcript will still appear normally after you hit Stop.",
        );
      }
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed to record.");
    }
  }

  async function handleStop() {
    const rec = recorderRef.current;
    setRecording(false);
    recorderRef.current = null;
    setInterim("");
    const liveSession = liveRef.current;
    liveRef.current = null;
    if (!rec && !liveSession) return;
    const liveText = liveSession ? await liveSession.stop() : "";
    try {
      if (liveSession) {
        if (!liveText) {
          toast.error("Nothing was heard — please try again.");
          return;
        }
        // The live transcript IS the result — no audio round-trip, no
        // credits spent. Refining (title/content polish, translation)
        // happens afterwards on demand.
        setTranscript([baseTextRef.current, liveText].filter(Boolean).join("\n"));
        setContentLangCode(speechLang === "auto" ? lastSpecificLangRef.current || "id-ID" : speechLang);
        toast.success("Transcript ready — you can edit it.");
        return;
      }
      // Fallback path: no on-device recognizer, so we recorded audio and
      // let the server AI transcribe it.
      const blob = await rec!.stop();
      setBusy("Transcribing…");
      if (blob.size < 2048) {
        toast.error("That recording was empty — please try again.");
        return;
      }
      const audioBase64 = await blobToBase64(blob);
      const res = await transcribe({ data: { audioBase64, deviceId, durationSeconds: seconds } });
      warnIfChargeFailed(res);
      setTranscript(
        baseTextRef.current ? `${baseTextRef.current}\n${res.text}` : res.text,
      );
      setContentLangCode(lastSpecificLangRef.current || "id-ID");
      toast.success("Transcript ready — you can edit it.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
      setBusy(null);
      void refreshCredit();
    }
  }

  async function handleTranslate() {
    if (!transcript.trim()) {
      toast.error("Nothing to translate yet.");
      return;
    }
    setBusy(`Translating to ${displayLangName(target)}…`);
    try {
      const res = await translate({ data: { text: transcript, target, deviceId } });
      warnIfChargeFailed(res);
      setTranscript(res.text);
      setContentLangCode(LANGUAGE_BCP47[target] || "en-US");
      toast.success(`Translated to ${displayLangName(target)}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Translation failed.");
    } finally {
      setBusy(null);
      void refreshCredit();
    }
  }

  function speakBrowser() {
    if (!transcript.trim()) {
      toast.error("Nothing to read yet.");
      return;
    }
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech isn't supported in this browser.");
      return;
    }
    if (speakingBrowser) {
      window.speechSynthesis.cancel();
      setSpeakingBrowser(false);
      return;
    }
    window.speechSynthesis.cancel(); // clear any stuck queue first
    const utter = new SpeechSynthesisUtterance(transcript);
    utter.lang = contentLangCode;
    utter.onstart = () => setSpeakingBrowser(true);
    utter.onend = () => setSpeakingBrowser(false);
    utter.onerror = () => {
      setSpeakingBrowser(false);
      toast.info(
        "No voice available for this language on this device — try the AI Talk button instead.",
      );
    };
    window.speechSynthesis.speak(utter);
  }

  async function speakAi() {
    if (!transcript.trim()) {
      toast.error("Nothing to read yet.");
      return;
    }
    if (speakingAi) {
      aiAudioRef.current?.pause();
      setSpeakingAi(false);
      return;
    }
    setBusy("Generating speech…");
    try {
      const res = await synthesize({ data: { text: transcript, deviceId } });
      warnIfChargeFailed(res);
      const audio = new Audio(`data:${res.mime};base64,${res.audioBase64}`);
      aiAudioRef.current = audio;
      audio.onended = () => setSpeakingAi(false);
      audio.onpause = () => setSpeakingAi(false);
      setSpeakingAi(true);
      await audio.play();
    } catch (e) {
      setSpeakingAi(false);
      toast.error(e instanceof Error ? e.message : "Speech generation failed.");
    } finally {
      setBusy(null);
      void refreshCredit();
    }
  }

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      aiAudioRef.current?.pause();
    };
  }, []);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      const id = crypto.randomUUID();
      const isImage = file.type.startsWith("image/");
      const next: Attachment = isImage
        ? { id, dataUrl, caption: "", captioning: false, mode: "pending", kind: "image" }
        : { id, dataUrl, caption: "", captioning: false, mode: "manual", kind: "file", fileName: file.name };
      setAttachments((prev) => [...prev, next]);
    }
  }

  async function openCamera() {
    // capture="environment" on <input type=file> only works on mobile
    // browsers — desktop silently falls back to a plain file-picker
    // (indistinguishable from "Gallery"). Use a real getUserMedia() camera
    // preview instead, which works on both desktop and mobile.
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      // Attach after the <video> element has mounted.
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      // Permission denied or no camera device — fall back to the file input.
      cameraRef.current?.click();
    }
  }

  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const id = crypto.randomUUID();
    setAttachments((prev) => [
      ...prev,
      { id, dataUrl, caption: "", captioning: false, mode: "pending", kind: "image" },
    ]);
    closeCamera();
  }

  function useManualCaption(id: string) {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, mode: "manual" } : a)));
  }

  function useAutoCaption(id: string) {
    const target = attachments.find((a) => a.id === id);
    if (!target) return;
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, mode: "auto", captioning: true } : a)));
    caption({ data: { imageDataUrl: target.dataUrl, deviceId } })
      .then((res) => {
        warnIfChargeFailed(res);
        setAttachments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, caption: res.caption, captioning: false } : a)),
        );
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Auto caption failed. You can write it manually instead.");
        setAttachments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, mode: "pending", captioning: false } : a)),
        );
      })
      .finally(() => void refreshCredit());
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveTxt() {
    download(new Blob([plainText], { type: "text/plain" }), `${docNo || "magictalk"}.txt`);
  }

  function saveDoc() {
    const headerLine = noHeader
      ? `<p><b>Subject:</b> ${subject}</p>`
      : `<p><b>Date:</b> ${date}<br/><b>Doc.No.:</b> ${docNo}<br/><b>ATTN To:</b> ${attn}<br/><b>From:</b> ${from}<br/><b>Subject:</b> ${subject}</p>`;
    const html = `<html><head><meta charset="utf-8"><title>${docNo}</title></head><body style="font-family:Georgia,serif">
<h1>${profileName.trim() || "Magic Talk Memo"}</h1>
${headerLine}
<h2>Content</h2><p>${transcript.replace(/\n/g, "<br/>")}</p>
${attachments
  .map((a) =>
    a.kind === "image"
      ? `<div><img src="${a.dataUrl}" style="max-width:420px"/><p><i>${a.caption}</i></p></div>`
      : `<div><p>📎 ${a.fileName ?? "Attachment"}</p><p><i>${a.caption}</i></p></div>`,
  )
  .join("")}
</body></html>`;
    download(new Blob([html], { type: "application/msword" }), `${docNo || "magictalk"}.doc`);
  }

  function dataUrlToFile(dataUrl: string, filename: string): File | null {
    return sharedDataUrlToFile(dataUrl, filename);
  }

  function shareFiles() {
    return attachments
      .map((a, i) => {
        const ext = (a.dataUrl.match(/^data:image\/(\w+);/)?.[1] ?? "jpg").replace("jpeg", "jpg");
        const base = `${docNo || "magictalk"}-${String(i + 1).padStart(2, "0")}`;
        return dataUrlToFile(a.dataUrl, a.fileName ?? `${base}.${ext}`);
      })
      .filter((f): f is File => f !== null);
  }

  async function shareNote(channel: "whatsapp" | "email" | "other" = "other") {
    const files = shareFiles();
    await sendViaChannel(channel, `Memo ${docNo}`, plainText, files, (msg) => toast.success(msg));
  }

  function startAgain() {
    setDate(todayISO());
    setDocNo(newDocNo());
    setAttn("");
    setFrom("");
    setSubject("");
    setTranscript("");
    setAttachments([]);
    setSeconds(0);
    toast.success("New memo started.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveToHistory() {
    if (!transcript.trim() && !attachments.length) {
      toast.error("Nothing to save yet — record or write something first.");
      return;
    }
    try {
      await addHistoryEntry({
        date,
        docNo,
        attn,
        from,
        subject,
        noHeader,
        transcript,
        plainText,
        attachments: attachments.map((a) => ({
          dataUrl: a.dataUrl,
          caption: a.caption,
          kind: a.kind,
          fileName: a.fileName,
        })),
      });
      toast.success("Saved to History.");
    } catch {
      toast.error("Could not save to History on this device.");
    }
  }

  function resetPreferences() {
    // Only clears small UI preferences (spoken-language choice, UI language).
    // Deliberately does NOT touch smartnote_device_id (tied to your
    // subscription/credits) or the History IndexedDB store.
    localStorage.removeItem("smartnote.speechLang");
    localStorage.removeItem("smartnote.uiLang");
    toast.success("Preferences reset. Reloading…");
    setTimeout(() => window.location.reload(), 600);
  }

  const label = "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground";
  const field =
    "mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Magic Talk",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://magic-talk.lovable.app/",
    description:
      "Record, auto-transcribe and translate memos, attach captioned photos, then export as TXT, PDF or DOC.",
  });

  return (
    <main className="min-h-screen bg-background pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Toaster position="top-center" />

      <header className="no-print border-b border-border bg-card/70 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <button
              onClick={() => void router.navigate({ to: "/admin" })}
              className="text-left text-xl leading-none text-foreground"
            >
              Magic Talk
            </button>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("tagline")}</p>
          </div>
          <div className="flex items-center gap-2 text-right">
            <LanguageSwitcher />
            <p className="text-[11px] font-semibold text-foreground">
              {sub
                ? sub.plan === "trial"
                  ? `Trial: ${sub.daysLeft} Days`
                  : `${sub.plan === "yearly" ? "Annual" : "Monthly"}: ${sub.daysLeft} Days`
                : "Trial: — Days"}
            </p>
            <Link
              to="/buy"
              className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1 text-[11px] font-semibold text-destructive-foreground"
            >
              Buy
            </Link>
            {creditBalance !== null && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CreditCard className="size-3" /> {creditBalance}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-3 px-3 py-4">
        {hasOrder && (
          <section className="no-print rounded-xl border border-border bg-card p-3 shadow-sm">
            <span className={label}>Have a voucher code?</span>
            <div className="mt-2 flex gap-2">
              <input
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className={`${field} mt-0 flex-1 tracking-widest`}
              />
              <button
                onClick={() => void activateVoucher()}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              >
                <KeyRound className="size-4" /> Activate
              </button>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <label className="no-print mb-2 flex items-center justify-end gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              No Header
            </span>
            <input
              type="checkbox"
              checked={noHeader}
              onChange={(e) => setNoHeader(e.target.checked)}
              className="size-4 accent-primary"
            />
          </label>
          <div>
            <span className={label}>Profile Name</span>
            <input
              value={profileName}
              onChange={(e) => {
                setProfileName(e.target.value);
                localStorage.setItem("smartnote.profileName", e.target.value);
              }}
              placeholder="MAGIC TALK MEMO"
              className={field}
            />
          </div>
          {!noHeader && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <span className={label}>Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <span className={label}>Doc. No.</span>
                  <input value={docNo} onChange={(e) => setDocNo(e.target.value)} className={field} />
                </div>
              </div>
              <div className="mt-3">
                <span className={label}>ATTN To</span>
                <input
                  value={attn}
                  onChange={(e) => setAttn(e.target.value)}
                  placeholder="Recipient name / department"
                  className={field}
                />
              </div>
              <div className="mt-3">
                <span className={label}>From</span>
                <input
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="Your name"
                  className={field}
                />
              </div>
            </>
          )}
          <div className="mt-3">
            <span className={label}>Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Memo subject"
              className={field}
            />
          </div>
        </section>

        <section className="no-print rounded-xl border border-border bg-card p-3 text-center shadow-sm">
          <span className={label}>Recording</span>
          <p className="mt-1 font-display text-3xl tabular-nums text-foreground">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </p>
          <div className="mt-3 flex justify-center gap-3">
            {!recording ? (
              <button
                onClick={handleStart}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                <Mic className="size-4" /> Start speaking
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="inline-flex animate-pulse items-center gap-2 rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground transition hover:opacity-90"
              >
                <Square className="size-4" /> Stop
              </button>
            )}
          </div>
          <div className="no-print mt-3 flex items-center justify-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Spoken language
            </span>
            <select
              value={speechLang}
              disabled={recording}
              onChange={(e) => {
                setSpeechLang(e.target.value);
                localStorage.setItem("smartnote.speechLang", e.target.value);
                if (e.target.value !== "auto") {
                  lastSpecificLangRef.current = e.target.value;
                }
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-50"
            >
              <option value="auto">Auto detect (AI)</option>
              {SPEECH_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} (live)
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {recording
              ? live
                ? interim
                  ? `…${interim}`
                  : speechLang === "auto"
                    ? "Listening — live preview shown (AI confirms the exact language after Stop)."
                    : "Listening — words appear live."
                : "Recording — transcript appears after Stop."
              : speechLang === "auto"
                ? "Auto detect: a live preview appears as you speak; AI corrects the language automatically after Stop."
                : "Live mode: words appear while you speak in the chosen language."}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <span className={label}>Content — transcript</span>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={6}
            placeholder="Your transcript appears here and stays fully editable…"
            className={`${field} resize-y leading-relaxed`}
          />

          <div className="no-print mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={speakBrowser}
              className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium ${
                speakingBrowser
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : "border-border text-foreground"
              }`}
            >
              <Volume2 className="size-3.5" /> {speakingBrowser ? "Stop" : "Talk"}
            </button>
            <button
              onClick={() => void speakAi()}
              disabled={!!busy}
              className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium disabled:opacity-50 ${
                speakingAi
                  ? "border-[#1e3a8a] bg-[#1e3a8a] text-white"
                  : "border-[#1e3a8a]/40 bg-[#eff6ff] text-[#1e3a8a]"
              }`}
            >
              <Volume2 className="size-3.5" /> {speakingAi ? "Stop" : "Talk (AI)"}
            </button>
          </div>

          <div className="no-print mt-3 rounded-lg border border-border bg-secondary/50 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className={label}>Translate to</span>
              <button
                onClick={() => setLangPickerOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
              >
                {displayLangName(target)} <Languages className="size-3" />
              </button>
            </div>

            {langPickerOpen && (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <span
                      key={lang}
                      className={`group inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                        target === lang
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setTarget(lang);
                          setLangPickerOpen(false);
                        }}
                      >
                        {displayLangName(lang)}
                      </button>
                      <button
                        aria-label={`Remove ${lang}`}
                        onClick={() => setLanguages((l) => l.filter((x) => x !== lang))}
                        className="opacity-50 hover:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="Add a language"
                    className={`${field} mt-0 flex-1`}
                  />
                  <button
                    onClick={() => {
                      const v = newLanguage.trim();
                      if (!v) return;
                      setLanguages((l) => (l.includes(v) ? l : [...l, v]));
                      setNewLanguage("");
                    }}
                    className="rounded-md border border-border px-3 text-sm font-medium text-foreground"
                  >
                    Add
                  </button>
                </div>
              </>
            )}

            <button
              onClick={handleTranslate}
              disabled={!!busy}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              <Languages className="size-4" /> Translate to {displayLangName(target)}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <span className={label}>Attachments</span>
          <div className="no-print mt-2 grid grid-cols-3 gap-3">
            <button
              onClick={() => galleryRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium"
            >
              <ImageIcon className="size-4" /> Gallery
            </button>
            <button
              onClick={() => void openCamera()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium"
            >
              <Camera className="size-4" /> Camera
            </button>
            <button
              onClick={() => fileUploadRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium"
            >
              <FileUp className="size-4" /> File
            </button>
          </div>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only absolute size-px opacity-0"
            onChange={(e) => {
              const input = e.currentTarget;
              const files = input.files;
              void addFiles(files).finally(() => {
                input.value = "";
              });
            }}
          />
          <input
            ref={fileUploadRef}
            type="file"
            multiple
            className="sr-only absolute size-px opacity-0"
            onChange={(e) => {
              const input = e.currentTarget;
              const files = input.files;
              void addFiles(files).finally(() => {
                input.value = "";
              });
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only absolute size-px opacity-0"
            onChange={(e) => {
              const input = e.currentTarget;
              const files = input.files;
              void addFiles(files).finally(() => {
                input.value = "";
              });
            }}
          />

          <div className="mt-4 space-y-3">
            {attachments.map((a) => (
              <div key={a.id} className="flex gap-3 rounded-lg border border-border p-2">
                {a.kind === "image" ? (
                  <img
                    src={a.dataUrl}
                    alt={a.caption || "Attachment preview"}
                    className="size-20 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-secondary/30 p-1 text-center">
                    <FileText className="size-5 text-muted-foreground" />
                    <p className="w-full truncate text-[10px] text-muted-foreground">{a.fileName}</p>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {a.mode === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => useAutoCaption(a.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary"
                      >
                        <Sparkles className="size-3" /> Auto (AI)
                      </button>
                      <button
                        onClick={() => useManualCaption(a.id)}
                        className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium"
                      >
                        Tulis manual
                      </button>
                    </div>
                  ) : a.captioning ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> Writing caption…
                    </p>
                  ) : (
                    <textarea
                      value={a.caption}
                      onChange={(e) =>
                        setAttachments((prev) =>
                          prev.map((x) => (x.id === a.id ? { ...x, caption: e.target.value } : x)),
                        )
                      }
                      rows={3}
                      placeholder={
                        a.kind === "file" ? "Describe this file…" : a.mode === "manual" ? "Write the caption yourself…" : ""
                      }
                      className={`${field} mt-0 text-xs`}
                    />
                  )}
                </div>
                <button
                  aria-label="Remove attachment"
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                  className="no-print self-start text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {!attachments.length && (
              <p className="text-xs text-muted-foreground">No attachments yet.</p>
            )}
          </div>
        </section>

        <section className="no-print rounded-xl border border-border bg-card p-3 shadow-sm">
          <span className={label}>Finish</span>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button onClick={saveTxt} className="rounded-md border border-border px-2 py-2.5 text-xs font-medium">
              <Download className="mx-auto mb-1 size-4" /> TXT
            </button>
            <button onClick={() => window.print()} className="rounded-md border border-border px-2 py-2.5 text-xs font-medium">
              <Download className="mx-auto mb-1 size-4" /> PDF
            </button>
            <button onClick={saveDoc} className="rounded-md border border-border px-2 py-2.5 text-xs font-medium">
              <Download className="mx-auto mb-1 size-4" /> DOC
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              onClick={() => void shareNote("whatsapp")}
              className="rounded-md border border-border px-2 py-2.5 text-xs font-medium"
            >
              <Send className="mx-auto mb-1 size-4" /> WhatsApp
            </button>
            <button
              onClick={() => void shareNote("email")}
              className="rounded-md border border-border px-2 py-2.5 text-xs font-medium"
            >
              <Send className="mx-auto mb-1 size-4" /> Email
            </button>
            <button
              onClick={() => void shareNote("other")}
              className="rounded-md border border-border px-2 py-2.5 text-xs font-medium"
            >
              <Send className="mx-auto mb-1 size-4" /> Other
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={startAgain}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcw className="size-4" /> Start again
            </button>
            <button
              onClick={() => void saveToHistory()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold"
            >
              <Save className="size-4" /> Save
            </button>
            <button
              onClick={() => window.close()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold"
            >
              <Power className="size-4" /> Exit
            </button>
          </div>
        </section>

        <footer className="no-print pt-2 text-center">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <Link to="/history" className="underline underline-offset-2 hover:text-foreground">
              History
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/how-to-use" className="underline underline-offset-2 hover:text-foreground">
              {t("howToUse")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
              {t("terms")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              {t("privacy")}
            </Link>
            <span aria-hidden="true">·</span>
            <button
              onClick={resetPreferences}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Reset preferences
            </button>
          </p>
        </footer>
      </div>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-[70vh] w-full max-w-md rounded-lg bg-black object-contain"
          />
          <div className="flex gap-3">
            <button
              onClick={() => void capturePhoto()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              <Camera className="size-4" /> Capture
            </button>
            <button
              onClick={closeCamera}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground"
            >
              <X className="size-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {busy && (
        <div className="fixed inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
          <Loader2 className="size-4 animate-spin" /> {busy}
        </div>
      )}
    </main>
  );
}
