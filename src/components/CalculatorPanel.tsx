import { useState } from "react";
import { X, Check } from "lucide-react";
import { CalculatorWidget } from "./CalculatorWidget";
import { saveCapturedEntry } from "@/lib/capture";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import type { ItemType } from "@/lib/db";

export function CalculatorPanel({ presetType, onClose }: { presetType?: ItemType; onClose: () => void }) {
  const [lang] = useLang();
  const [value, setValue] = useState("0");
  const [saved, setSaved] = useState(false);

  async function saveResult() {
    if (!presetType) return;
    await saveCapturedEntry(
      { type: presetType, title: value, body: `${lang === "id" ? "Hasil hitung" : "Calculation result"}: ${value}` },
      lang,
    );
    setSaved(true);
    setTimeout(onClose, 700);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">
            {lang === "id" ? "Kalkulator" : "Calculator"}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <CalculatorWidget onChangeDisplay={setValue} />
        {presetType && (
          <button
            onClick={saveResult}
            className="mt-3 w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Check size={15} />
            {saved
              ? lang === "id" ? "Tersimpan!" : "Saved!"
              : `${lang === "id" ? "Simpan sebagai" : "Save as"} ${t(lang, presetType)}`}
          </button>
        )}
      </div>
    </div>
  );
}
