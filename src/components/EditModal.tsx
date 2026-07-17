import { useEffect, useState } from "react";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export interface EditField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "datetime-local" | "date";
  value: string;
}

export function EditModal({
  title,
  fields,
  onClose,
  onSave,
}: {
  title: string;
  fields: EditField[];
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [lang] = useLang();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );

  useEffect(() => {
    setValues(Object.fromEntries(fields.map((f) => [f.key, f.value])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-primary/30 p-4 shadow-2xl">
        <p className="text-sm font-semibold text-primary mb-3">{title}</p>
        <div className="space-y-2">
          {fields.map((f) => (
            <label key={f.key} className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {f.label}
              {f.type === "textarea" ? (
                <textarea
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground font-normal normal-case tracking-normal"
                />
              ) : (
                <input
                  type={f.type ?? "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground font-normal normal-case tracking-normal"
                />
              )}
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
            {t(lang, "cancel")}
          </button>
          <button
            onClick={() => onSave(values)}
            className="flex-1 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            {t(lang, "save")}
          </button>
        </div>
      </div>
    </div>
  );
}
