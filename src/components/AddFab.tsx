import { Plus } from "lucide-react";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

/**
 * Compact "+ Add" pill button used above list menus. Sits inline with the
 * counter/Select row so it doesn't overlap the floating selection bar.
 */
export function AddFab({ onClick, label }: { onClick: () => void; label?: string }) {
  const [lang] = useLang();
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      <Plus size={14} /> {label ?? t(lang, "addManually")}
    </button>
  );
}
