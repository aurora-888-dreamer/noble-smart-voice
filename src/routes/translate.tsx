import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X, Check, Languages, Loader2, Lock, ArrowLeftRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { usePlugin } from "@/lib/plugins-store";
import { translateText, structureCapture } from "@/lib/ai.functions";
import { saveCapturedEntry } from "@/lib/capture";
import { isPremium } from "@/lib/auth-store";
import type { ItemType } from "@/lib/db";

const COMMON_LANGS = ["English", "Bahasa Indonesia", "Spanish", "Mandarin Chinese", "Japanese", "Arabic", "French", "German"];
const TYPES: ItemType[] = ["note", "task", "meeting", "appointment", "contact", "message", "diary", "trip", "project"];

export const Route = createFileRoute("/translate")({
  head: () => ({ meta: [{ title: "Translator — Noble" }] }),
  validateSearch: (search: Record<string, unknown>): { type?: ItemType } => ({
    type: TYPES.includes(search.type as ItemType) ? (search.type as ItemType) : undefined,
  }),
  component: TranslatePage,
});

type Phase = "translate" | "category" | "editing";

function TranslatePage() {
  const [lang] = useLang();
  const enabled = usePlugin("translator");
  const navigate = useNavigate();
  const { type: presetType } = Route.useSearch();

  const [phase, setPhase] = useState<Phase>("translate");
  const [original, setOriginal] = useState("");
  const [targetLang, setTargetLang] = useState(lang === "id" ? "English" : "Bahasa Indonesia");
  const [translated, setTranslated] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<ItemType>(presetType ?? "note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [structBusy, setStructBusy] = useState(false);

  useEffect(() => {
    const draft = sessionStorage.getItem("noble:translateDraft");
    if (draft) {
      setOriginal(draft);
      sessionStorage.removeItem("noble:translateDraft");
    }
  }, []);

  if (!enabled) {
    return (
      <AppShell title={lang === "id" ? "Penerjemah" : "Translator"}>
        <div className="flex flex-col items-center text-center py-16 gap-3">
          <div className="grid place-items-center w-14 h-14 rounded-full bg-secondary text-muted-foreground">
            <Lock size={24} />
          </div>
          <p className="text-sm font-semibold">
            {lang === "id" ? "Plugin Penerjemah belum aktif" : "Translator plugin isn't enabled"}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {lang === "id"
              ? "Fitur ini bagian dari plugin tambahan Noble. Hubungi admin untuk mengaktifkannya."
              : "This feature is part of a Noble add-on plugin. Contact the admin to enable it."}
          </p>
        </div>
      </AppShell>
    );
  }

  async function runTranslate() {
    if (!original.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await translateText({ data: { text: original, targetLang } });
      if (res.ok) setTranslated(res.text);
      else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function swapAndUseTranslated() {
    setOriginal(translated);
    setTranslated("");
  }

  function goToCategory() {
    setContent(translated || original);
    setTitle((translated || original).slice(0, 60));
    if (presetType) {
      pickCategory(presetType);
    } else {
      setPhase("category");
    }
  }

  function pickCategory(picked: ItemType) {
    setType(picked);
    setPhase("editing");
    if (isPremium() && typeof navigator !== "undefined" && navigator.onLine) {
      setStructBusy(true);
      structureCapture({ data: { transcript: translated || original, type: picked, nowISO: new Date().toISOString() } })
        .then((res) => {
          if (!res.ok) return;
          if (res.result.title) setTitle(res.result.title);
          if (res.result.content) setContent(res.result.content);
        })
        .catch(() => {})
        .finally(() => setStructBusy(false));
    }
  }

  async function handleSave() {
    await saveCapturedEntry({ type, title, body: content }, lang);
    navigate({ to: "/" });
  }

  // ---- Phase: translate (split view) ----
  if (phase === "translate") {
    return (
      <div className="min-h-dvh flex flex-col bg-background text-foreground">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <button onClick={() => navigate({ to: "/" })} aria-label="Close" className="grid place-items-center w-9 h-9 rounded-full border border-border active:scale-95">
            <X size={16} />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-2">
            <Languages size={15} /> {lang === "id" ? "Penerjemah" : "Translator"}
          </h1>
          <span className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {lang === "id" ? "Teks asli" : "Original text"}
            </label>
            <textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              rows={6}
              placeholder={lang === "id" ? "Tempel atau ketik teks di sini…" : "Paste or type text here…"}
              className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="flex-1 rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm"
            >
              {COMMON_LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <button
              onClick={runTranslate}
              disabled={busy || !original.trim()}
              className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Languages size={15} />}
              {lang === "id" ? "Terjemahkan" : "Translate"}
            </button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground block">
                {lang === "id" ? "Hasil terjemahan" : "Translation"}
              </label>
              {translated && (
                <button onClick={swapAndUseTranslated} className="text-[11px] text-primary flex items-center gap-1">
                  <ArrowLeftRight size={11} /> {lang === "id" ? "Tukar & terjemahkan lagi" : "Swap & translate again"}
                </button>
              )}
            </div>
            <textarea
              value={translated}
              onChange={(e) => setTranslated(e.target.value)}
              rows={6}
              placeholder={lang === "id" ? "Hasil akan muncul di sini…" : "Result will appear here…"}
              className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={goToCategory}
            disabled={!original.trim() && !translated.trim()}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Check size={16} /> {lang === "id" ? "Lanjutkan" : "Continue"}
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
          <button onClick={() => setPhase("translate")} aria-label="Back" className="grid place-items-center w-9 h-9 rounded-full border border-border active:scale-95">
            <X size={16} />
          </button>
          <h1 className="text-sm font-semibold">{t(lang, "recPickCategory")}</h1>
          <span className="w-9" />
        </div>
        <div className="flex-1 p-6 flex flex-col gap-4 max-w-md mx-auto w-full">
          <p className="text-xs text-muted-foreground line-clamp-3">{translated || original}</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {TYPES.map((tp) => (
              <button
                key={tp}
                onClick={() => pickCategory(tp)}
                className="rounded-2xl border px-4 py-4 text-sm font-semibold transition-colors border-border bg-card text-foreground active:scale-[0.98]"
              >
                {t(lang, tp)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Phase: editing (title/content, then save) ----
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <div className="flex justify-between items-center p-4 border-b border-border">
        <button onClick={() => setPhase("category")} aria-label="Back" className="grid place-items-center w-9 h-9 rounded-full border border-border active:scale-95">
          <X size={16} />
        </button>
        <h1 className="text-sm font-semibold">{t(lang, "recReviewTitle")}</h1>
        <span className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        {structBusy && <p className="text-xs text-primary animate-pulse">{t(lang, "recAiRefining")}</p>}

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t(lang, "recSubtitleLabel")}</label>
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

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t(lang, "recContentLabel")}</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm resize-none"
          />
        </div>
      </div>

      <div className="p-4 border-t border-border bg-background flex gap-3 max-w-md mx-auto w-full">
        <button onClick={() => navigate({ to: "/" })} className="flex-1 rounded-2xl border border-border py-3 text-sm font-semibold">
          {t(lang, "recDiscard")}
        </button>
        <button onClick={handleSave} className="flex-1 rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold">
          {t(lang, "recSave")}
        </button>
      </div>
    </div>
  );
}
