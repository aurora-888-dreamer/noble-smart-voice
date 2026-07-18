import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Languages, Loader2, ExternalLink } from "lucide-react";
import { translateText } from "@/lib/ai.functions";
import { useLang } from "@/lib/settings-store";

const COMMON_LANGS = ["English", "Bahasa Indonesia", "Spanish", "Mandarin Chinese", "Japanese", "Arabic"];

export function TranslateInline({ text }: { text: string }) {
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const [targetLang, setTargetLang] = useState(lang === "id" ? "English" : "Bahasa Indonesia");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(nextTarget?: string) {
    const target = nextTarget ?? targetLang;
    setBusy(true);
    setError(null);
    try {
      const res = await translateText({ data: { text, targetLang: target } });
      if (res.ok) setResult(res.text);
      else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !result && !busy) void run();
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-primary hover:border-primary/40"
      >
        <Languages size={12} />
        {lang === "id" ? "Terjemahkan" : "Translate"}
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-secondary/60 border border-border p-3">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <select
              value={targetLang}
              onChange={(e) => {
                setTargetLang(e.target.value);
                setResult(null);
                void run(e.target.value);
              }}
              className="rounded-lg bg-background border border-border px-2 py-1 text-xs"
            >
              {COMMON_LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {busy && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {result && !busy && <p className="text-sm whitespace-pre-wrap leading-relaxed">{result}</p>}
          <Link
            to="/translate"
            onClick={() => sessionStorage.setItem("noble:translateDraft", text)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary"
          >
            <ExternalLink size={11} /> {lang === "id" ? "Buka halaman penuh" : "Open full page"}
          </Link>
        </div>
      )}
    </div>
  );
}
