import { useState } from "react";
import {
  Bluetooth,
  CheckSquare,
  Copy,
  MoveRight,
  Pencil,
  Trash2,
  X,
  Share2,
  Mail,
  Printer,
} from "lucide-react";
import type { ItemType } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export type MoveTarget = Exclude<ItemType, "contact">;

export function SelectionBar({
  count,
  totalVisible,
  onSelectAll,
  onCancel,
  onDelete,
  onDuplicate,
  onEdit,
  onMove,
  onShareWA,
  onShareEmail,
  onPrint,
  onBluetooth,
  moveTargets,
}: {
  count: number;
  totalVisible: number;
  onSelectAll: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onMove?: (target: MoveTarget) => void;
  onShareWA?: () => void;
  onShareEmail?: () => void;
  onPrint?: () => void;
  onBluetooth?: () => void;
  moveTargets?: MoveTarget[];
}) {
  const [lang] = useLang();
  const [showMove, setShowMove] = useState(false);
  if (count === 0 && totalVisible === 0) return null;

  const labels: Record<MoveTarget, string> = {
    note: t(lang, "note"),
    task: t(lang, "task"),
    meeting: t(lang, "meeting"),
    appointment: t(lang, "appointment"),
    message: t(lang, "message"),
    diary: t(lang, "diary"),
    trip: t(lang, "trip"),
    project: t(lang, "project"),
  };

  return (
    <div className="fixed right-2 top-1/2 -translate-y-1/2 z-40">
      <div className="rounded-2xl bg-popover border border-primary/40 shadow-2xl px-1.5 py-2 flex flex-col items-center gap-1 backdrop-blur-lg max-h-[80vh] overflow-y-auto">
        <button
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground"
          aria-label={t(lang, "cancel")}
        >
          <X size={16} />
        </button>
        <span className="text-[11px] font-semibold text-primary py-1">
          {count}/{totalVisible}
        </span>
        <button
          onClick={onSelectAll}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground"
          aria-label={t(lang, "selectAll")}
        >
          <CheckSquare size={16} />
        </button>
        {count === 1 && onEdit && (
          <button onClick={onEdit} className="p-2 rounded-full hover:bg-secondary text-primary" aria-label={t(lang, "edit")}>
            <Pencil size={16} />
          </button>
        )}
        {onDuplicate && count > 0 && (
          <button onClick={onDuplicate} className="p-2 rounded-full hover:bg-secondary text-primary" aria-label={t(lang, "duplicate")}>
            <Copy size={16} />
          </button>
        )}
        {onMove && moveTargets && moveTargets.length > 0 && count > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMove((s) => !s)}
              className="p-2 rounded-full hover:bg-secondary text-primary"
              aria-label={t(lang, "move")}
            >
              <MoveRight size={16} />
            </button>
            {showMove && (
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded-2xl bg-popover border border-border shadow-2xl p-1 min-w-[10rem]">
                {moveTargets.map((tgt) => (
                  <button
                    key={tgt}
                    onClick={() => {
                      setShowMove(false);
                      onMove(tgt);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-secondary"
                  >
                    → {labels[tgt]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {onShareWA && count > 0 && (
          <button onClick={onShareWA} className="p-2 rounded-full hover:bg-secondary text-primary" aria-label="WhatsApp">
            <Share2 size={16} />
          </button>
        )}
        {onShareEmail && count > 0 && (
          <button onClick={onShareEmail} className="p-2 rounded-full hover:bg-secondary text-primary" aria-label="Email">
            <Mail size={16} />
          </button>
        )}
        {onPrint && count > 0 && (
          <button onClick={onPrint} className="p-2 rounded-full hover:bg-secondary text-primary" aria-label="Print">
            <Printer size={16} />
          </button>
        )}
        {onBluetooth && count > 0 && (
          <button
            onClick={onBluetooth}
            className="p-2 rounded-full hover:bg-secondary text-primary"
            aria-label="Bluetooth"
            title="Send via Bluetooth / Nearby Share"
          >
            <Bluetooth size={16} />
          </button>
        )}
        {count > 0 && (
          <button
            onClick={onDelete}
            className="mt-1 p-2 rounded-full bg-destructive/15 hover:bg-destructive/25 text-destructive"
            aria-label={t(lang, "delete")}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
