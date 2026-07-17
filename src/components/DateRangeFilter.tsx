import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export function DateRangeFilter({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  const [lang] = useLang();
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {t(lang, "from")}
        <input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground"
        />
      </label>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {t(lang, "to")}
        <input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground"
        />
      </label>
    </div>
  );
}

export function inRange(ts: number, from: string, to: string) {
  const f = from ? new Date(from).getTime() : 0;
  const t2 = to ? new Date(to).getTime() + 86_400_000 : Infinity;
  return ts >= f && ts <= t2;
}
