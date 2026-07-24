// Reuses the same standard tools as the main Noble app: voice, camera,
// translator, calculator. These are just links/buttons; the pages they
// open (in the main app) already handle capture + auto-EN/ID transcription.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mic, Camera, Languages, Calculator as CalcIcon } from "lucide-react";
import { CalculatorPanel } from "./CalculatorPanel";

export function SchoolTools() {
  const nav = useNavigate();
  const [calc, setCalc] = useState(false);
  const btn = "grid place-items-center w-10 h-10 rounded-full border border-border bg-card text-foreground active:scale-95";
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <button className={btn} title="Voice capture" onClick={() => nav({ to: "/record", search: { type: "note" } as never })}><Mic size={17} /></button>
        <button className={btn} title="Camera" onClick={() => nav({ to: "/camera", search: { type: "note" } as never })}><Camera size={17} /></button>
        <button className={btn} title="Translator" onClick={() => nav({ to: "/translate", search: { type: "note" } as never })}><Languages size={17} /></button>
        <button className={btn} title="Calculator" onClick={() => setCalc(true)}><CalcIcon size={17} /></button>
      </div>
      {calc && <CalculatorPanel presetType="note" onClose={() => setCalc(false)} />}
    </>
  );
}
