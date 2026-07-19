import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mic, Camera, Languages, Calculator as CalculatorIcon } from "lucide-react";
import { CalculatorPanel } from "./CalculatorPanel";
import { usePluginState } from "@/lib/plugins-store";
import { useLang } from "@/lib/settings-store";
import type { ItemType } from "@/lib/db";

export function CategoryToolbar({ type }: { type: ItemType }) {
  const [lang] = useLang();
  const navigate = useNavigate();
  const plugins = usePluginState();
  const [calcOpen, setCalcOpen] = useState(false);

  const btnClass =
    "grid place-items-center w-10 h-10 rounded-full border border-border bg-card text-foreground active:scale-95 transition-transform";

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate({ to: "/record", search: { type } as never })}
          aria-label="Record"
          className={btnClass}
          title={lang === "id" ? "Rekam suara" : "Record voice"}
        >
          <Mic size={17} />
        </button>
        {plugins.camera && (
          <button
            onClick={() => navigate({ to: "/camera", search: { type } as never })}
            aria-label="Camera"
            className={btnClass}
            title={lang === "id" ? "Kamera" : "Camera"}
          >
            <Camera size={17} />
          </button>
        )}
        {plugins.translator && (
          <button
            onClick={() => navigate({ to: "/translate", search: { type } as never })}
            aria-label="Translator"
            className={btnClass}
            title={lang === "id" ? "Penerjemah" : "Translator"}
          >
            <Languages size={17} />
          </button>
        )}
        {plugins.calculator && (
          <button
            onClick={() => setCalcOpen(true)}
            aria-label="Calculator"
            className={btnClass}
            title={lang === "id" ? "Kalkulator" : "Calculator"}
          >
            <CalculatorIcon size={17} />
          </button>
        )}
      </div>
      {calcOpen && <CalculatorPanel presetType={type} onClose={() => setCalcOpen(false)} />}
    </>
  );
}
