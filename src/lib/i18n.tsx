// App-wide UI language switcher — covers the header/tagline, footer nav
// (How to Use / T&C / PP) and the How to Use, Terms and Privacy Policy
// pages. This is separate from the memo *content* translation feature
// (Translate to ...), which translates what you recorded, not the app's UI.
// The language list intentionally matches the transcript translator's
// language list (see DEFAULT_LANGUAGES / SPEECH_LANGS).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang =
  | "id"
  | "en"
  | "zh"
  | "ja"
  | "ko"
  | "hi"
  | "es"
  | "fr"
  | "de"
  | "th"
  | "vi"
  | "ar"
  | "tl"
  | "it"
  | "he";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "id", label: "🇮🇩 Indonesia" },
  { code: "en", label: "🇬🇧 English" },
  { code: "zh", label: "🇨🇳 中文" },
  { code: "ja", label: "🇯🇵 日本語" },
  { code: "ko", label: "🇰🇷 한국어" },
  { code: "hi", label: "🇮🇳 हिन्दी" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "th", label: "🇹🇭 ไทย" },
  { code: "vi", label: "🇻🇳 Tiếng Việt" },
  { code: "ar", label: "🇸🇦 العربية" },
  { code: "tl", label: "🇵🇭 Tagalog" },
  { code: "it", label: "🇮🇹 Italiano" },
  { code: "he", label: "🇮🇱 עברית" },
];

export const RTL_LANGS: Lang[] = ["ar", "he"];

// Shared "flag + native name" display strings, keyed by the English
// demonym used by the transcript translator's language list (SPEECH_LANGS,
// DEFAULT_LANGUAGES) — this keeps the UI language switcher, the "Spoken
// language" picker and the "Translate to" picker visually consistent
// without changing the underlying values sent to the AI translate API.
export const LANGUAGE_DISPLAY: Record<string, string> = {
  Indonesian: "🇮🇩 Indonesia",
  English: "🇬🇧 English",
  Mandarin: "🇨🇳 中文",
  Japanese: "🇯🇵 日本語",
  Korean: "🇰🇷 한국어",
  Hindi: "🇮🇳 हिन्दी",
  Spanish: "🇪🇸 Español",
  French: "🇫🇷 Français",
  German: "🇩🇪 Deutsch",
  Thai: "🇹🇭 ไทย",
  Vietnamese: "🇻🇳 Tiếng Việt",
  Arabic: "🇸🇦 العربية",
  Tagalog: "🇵🇭 Tagalog",
  Italian: "🇮🇹 Italiano",
  Hebrew: "🇮🇱 עברית",
};

export function displayLangName(name: string): string {
  return LANGUAGE_DISPLAY[name] ?? name;
}

// BCP-47 speech/locale codes keyed by the same English language names
// used by the transcript translator's language list.
export const LANGUAGE_BCP47: Record<string, string> = {
  Indonesian: "id-ID",
  English: "en-US",
  Mandarin: "zh-CN",
  Japanese: "ja-JP",
  Korean: "ko-KR",
  Hindi: "hi-IN",
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Thai: "th-TH",
  Vietnamese: "vi-VN",
  Arabic: "ar-SA",
  Tagalog: "fil-PH",
  Italian: "it-IT",
  Hebrew: "he-IL",
};

const STORAGE_KEY = "smartnote.uiLang";
const VALID_CODES = new Set(LANGS.map((l) => l.code));

function detectDefaultLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const short = navigator.language?.toLowerCase().slice(0, 2);
  const match = LANGS.find((l) => l.code === short);
  return match ? match.code : "en";
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && VALID_CODES.has(saved as Lang)) {
      setLangState(saved as Lang);
    } else {
      setLangState(detectDefaultLang());
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  }

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}

// Common strings shared across the header and footer nav on every page.
const common: Record<string, Record<Lang, string>> = {
  tagline: {
    id: "Bicara. Transkrip. Terjemahkan. Kirim.",
    en: "Speak. Transcribe. Translate. Send.",
    zh: "说话。转录。翻译。发送。",
    ja: "話す。文字起こし。翻訳。送信。",
    ko: "말하기. 받아쓰기. 번역. 전송.",
    hi: "बोलें। लिखें। अनुवाद करें। भेजें।",
    es: "Habla. Transcribe. Traduce. Envía.",
    fr: "Parlez. Transcrivez. Traduisez. Envoyez.",
    de: "Sprechen. Transkribieren. Übersetzen. Senden.",
    th: "พูด ถอดเสียง แปล ส่ง",
    vi: "Nói. Phiên âm. Dịch. Gửi.",
    ar: "تحدّث. فرّغ. ترجم. أرسل.",
    tl: "Magsalita. I-transcribe. Isalin. Ipadala.",
    it: "Parla. Trascrivi. Traduci. Invia.",
    he: "דבר. תמלל. תרגם. שלח.",
  },
  backToHome: {
    id: "Kembali ke Magic Talk",
    en: "Back to Magic Talk",
    zh: "返回 Magic Talk",
    ja: "Magic Talk に戻る",
    ko: "Magic Talk로 돌아가기",
    hi: "Magic Talk पर वापस जाएं",
    es: "Volver a Magic Talk",
    fr: "Retour à Magic Talk",
    de: "Zurück zu Magic Talk",
    th: "กลับไปที่ Magic Talk",
    vi: "Quay lại Magic Talk",
    ar: "العودة إلى Magic Talk",
    tl: "Bumalik sa Magic Talk",
    it: "Torna a Magic Talk",
    he: "חזרה ל-Magic Talk",
  },
  howToUse: {
    id: "Cara Pakai",
    en: "How to Use",
    zh: "使用说明",
    ja: "使い方",
    ko: "사용 방법",
    hi: "उपयोग कैसे करें",
    es: "Cómo usar",
    fr: "Mode d'emploi",
    de: "Anleitung",
    th: "วิธีใช้",
    vi: "Cách sử dụng",
    ar: "طريقة الاستخدام",
    tl: "Paano Gamitin",
    it: "Come si usa",
    he: "איך משתמשים",
  },
  terms: {
    id: "S&K",
    en: "T&C",
    zh: "条款",
    ja: "利用規約",
    ko: "약관",
    hi: "नियम",
    es: "T&C",
    fr: "CGU",
    de: "AGB",
    th: "ข้อกำหนด",
    vi: "Điều khoản",
    ar: "الشروط",
    tl: "Mga Tuntunin",
    it: "Termini",
    he: "תנאים",
  },
  privacy: {
    id: "PP",
    en: "PP",
    zh: "隐私",
    ja: "プライバシー",
    ko: "개인정보",
    hi: "गोपनीयता",
    es: "PP",
    fr: "Confidentialité",
    de: "Datenschutz",
    th: "ความเป็นส่วนตัว",
    vi: "Quyền riêng tư",
    ar: "الخصوصية",
    tl: "Privacy",
    it: "Privacy",
    he: "פרטיות",
  },
};

export type CommonKey = keyof typeof common;

export function useT() {
  const { lang } = useLang();
  function t(key: CommonKey): string {
    return common[key]?.[lang] ?? common[key]?.en ?? key;
  }
  return t;
}
