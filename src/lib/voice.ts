import type { Lang } from "./i18n";

type SR = {
  new (): SpeechRecognition;
};

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
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
}

export function isVoiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export interface VoiceSession {
  stop(): void;
}

export function startVoice(
  lang: Lang,
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (err: string) => void,
): VoiceSession | null {
  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = lang === "id" ? "id-ID" : "en-US";
  rec.continuous = false;
  rec.interimResults = true;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim) onInterim(finalText + interim);
  };
  rec.onerror = (e) => onError(e.error);
  rec.onend = () => onFinal(finalText.trim());
  try {
    rec.start();
  } catch (err) {
    onError(String(err));
    return null;
  }
  return { stop: () => rec.stop() };
}