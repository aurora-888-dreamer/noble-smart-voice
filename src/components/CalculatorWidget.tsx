import { useEffect, useState } from "react";
import { Delete } from "lucide-react";

type Op = "+" | "-" | "×" | "÷";

export function CalculatorWidget({ onChangeDisplay }: { onChangeDisplay?: (value: string) => void } = {}) {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [overwrite, setOverwrite] = useState(true);

  useEffect(() => {
    onChangeDisplay?.(display);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display]);

  function inputDigit(d: string) {
    if (overwrite) {
      setDisplay(d === "." ? "0." : d);
      setOverwrite(false);
    } else {
      if (d === "." && display.includes(".")) return;
      setDisplay((cur) => (cur === "0" && d !== "." ? d : cur + d));
    }
  }

  function compute(a: number, b: number, op: Op): number {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
    }
  }

  function chooseOp(op: Op) {
    const current = parseFloat(display);
    if (stored != null && pendingOp && !overwrite) {
      const result = compute(stored, current, pendingOp);
      setStored(result);
      setDisplay(String(result));
    } else {
      setStored(current);
    }
    setPendingOp(op);
    setOverwrite(true);
  }

  function equals() {
    if (stored == null || !pendingOp) return;
    const current = parseFloat(display);
    const result = compute(stored, current, pendingOp);
    setDisplay(Number.isNaN(result) ? "Error" : trimNumber(result));
    setStored(null);
    setPendingOp(null);
    setOverwrite(true);
  }

  function trimNumber(n: number): string {
    if (!Number.isFinite(n)) return "Error";
    const s = n.toString();
    return s.length > 14 ? n.toPrecision(10).replace(/\.?0+$/, "") : s;
  }

  function clear() {
    setDisplay("0");
    setStored(null);
    setPendingOp(null);
    setOverwrite(true);
  }

  function backspace() {
    if (overwrite) return;
    setDisplay((cur) => (cur.length > 1 ? cur.slice(0, -1) : "0"));
  }

  function toggleSign() {
    setDisplay((cur) => (cur.startsWith("-") ? cur.slice(1) : cur === "0" ? cur : "-" + cur));
  }

  function percent() {
    setDisplay((cur) => trimNumber(parseFloat(cur) / 100));
  }

  const btnBase = "rounded-2xl text-xl font-semibold py-4 active:scale-[0.96] transition-transform";

  return (
    <div className="max-w-sm mx-auto">
      <div className="rounded-2xl bg-card border border-border p-6 mb-4 text-right">
        <p className="text-4xl font-mono truncate">{display}</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <button onClick={clear} className={`${btnBase} bg-secondary text-secondary-foreground`}>C</button>
        <button onClick={toggleSign} className={`${btnBase} bg-secondary text-secondary-foreground`}>±</button>
        <button onClick={percent} className={`${btnBase} bg-secondary text-secondary-foreground`}>%</button>
        <button onClick={() => chooseOp("÷")} className={`${btnBase} bg-primary/15 text-primary`}>÷</button>

        {["7", "8", "9"].map((d) => (
          <button key={d} onClick={() => inputDigit(d)} className={`${btnBase} bg-card border border-border`}>{d}</button>
        ))}
        <button onClick={() => chooseOp("×")} className={`${btnBase} bg-primary/15 text-primary`}>×</button>

        {["4", "5", "6"].map((d) => (
          <button key={d} onClick={() => inputDigit(d)} className={`${btnBase} bg-card border border-border`}>{d}</button>
        ))}
        <button onClick={() => chooseOp("-")} className={`${btnBase} bg-primary/15 text-primary`}>−</button>

        {["1", "2", "3"].map((d) => (
          <button key={d} onClick={() => inputDigit(d)} className={`${btnBase} bg-card border border-border`}>{d}</button>
        ))}
        <button onClick={() => chooseOp("+")} className={`${btnBase} bg-primary/15 text-primary`}>+</button>

        <button onClick={() => inputDigit("0")} className={`${btnBase} bg-card border border-border col-span-2`}>0</button>
        <button onClick={() => inputDigit(".")} className={`${btnBase} bg-card border border-border`}>.</button>
        <button onClick={backspace} className={`${btnBase} bg-secondary text-secondary-foreground grid place-items-center`}>
          <Delete size={20} />
        </button>

        <button onClick={equals} className={`${btnBase} bg-primary text-primary-foreground col-span-4`}>=</button>
      </div>
    </div>
  );
}
