import type { Lang } from "./i18n";

type SR = {
  new (): SpeechRecognition;
};

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionResultList {
  length: number;
  [i: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  [i: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export function isVoiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export interface VoiceSession {
  stop(): void;
}

export interface StartVoiceOptions {
  /** Keep the recognizer running across utterances until stop() is called. */
  continuous?: boolean;
}

/**
 * Prime the microphone with echo cancellation, noise suppression and AGC
 * enabled. SpeechRecognition doesn't accept these constraints directly, but
 * granting the mic first with the right constraints lets Chrome pick up the
 * processed stream for subsequent recognition sessions on the same origin.
 */
let _primed = false;
export async function primeMicrophone(): Promise<boolean> {
  if (_primed) return true;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      } as MediaTrackConstraints,
    });
    // Release immediately; SpeechRecognition opens its own capture.
    stream.getTracks().forEach((t) => t.stop());
    _primed = true;
    return true;
  } catch {
    return false;
  }
}

export function startVoice(
  _lang: Lang | undefined,
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (err: string) => void,
  options: StartVoiceOptions = {},
): VoiceSession | null {
  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  // Auto-detect language: use device locale as primary hint. The Indonesian
  // recognizer on Chrome is the most tolerant of code-switched English words,
  // so if the device isn't already Indonesian we still bias to id-ID to keep
  // bilingual (EN + ID) transcripts working out of the box.
  const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
  rec.lang = /^id/i.test(nav) ? "id-ID" : "id-ID";
  rec.continuous = options.continuous === true;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  let finalText = "";
  let stopped = false;
  // Dedup guard: some engines emit the same isFinal result multiple times
  // (or overlap across restarts), which caused 2-3x duplicate saves.
  let lastEmitted = "";
  let lastEmittedAt = 0;
  const seenIndex = new Set<number>();
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      // Pick the alternative with the highest confidence (fall back to first).
      let best = r[0];
      for (let j = 1; j < r.length; j++) {
        if (r[j].confidence > best.confidence) best = r[j];
      }
      if (r.isFinal) {
        if (seenIndex.has(i)) continue;
        seenIndex.add(i);
        const chunk = best.transcript.trim();
        finalText += best.transcript;
        if (options.continuous) {
          const now = Date.now();
          if (chunk && (chunk !== lastEmitted || now - lastEmittedAt > 4000)) {
            lastEmitted = chunk;
            lastEmittedAt = now;
            onFinal(chunk);
          }
          finalText = "";
        }
      } else {
        interim += best.transcript;
      }
    }
    if (interim) onInterim(finalText + interim);
  };
  rec.onerror = (e) => onError(e.error);
  rec.onend = () => {
    if (stopped) return;
    if (!options.continuous) onFinal(finalText.trim());
  };
  try {
    rec.start();
  } catch (err) {
    onError(String(err));
    return null;
  }
  return {
    stop: () => {
      stopped = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
