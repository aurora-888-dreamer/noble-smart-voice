import { Share2, Mail, Printer, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { shareToWhatsApp, shareToEmail, printItem } from "@/lib/share";

export function ItemActions({
  title,
  body,
  onDelete,
  onEdit,
}: {
  title: string;
  body: string;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground"
        aria-label="Share"
      >
        <Share2 size={14} />
      </button>
      {open && (
        <div className="absolute mt-8 ml-[-140px] z-40 rounded-2xl bg-popover border border-border shadow-2xl p-1 flex flex-col text-xs w-40">
          <button
            className="px-3 py-2 text-left rounded-xl hover:bg-secondary flex items-center gap-2"
            onClick={() => {
              shareToWhatsApp(`${title}\n\n${body}`);
              setOpen(false);
            }}
          >
            <Share2 size={14} /> WhatsApp
          </button>
          <button
            className="px-3 py-2 text-left rounded-xl hover:bg-secondary flex items-center gap-2"
            onClick={() => {
              shareToEmail(title, body);
              setOpen(false);
            }}
          >
            <Mail size={14} /> Email
          </button>
          <button
            className="px-3 py-2 text-left rounded-xl hover:bg-secondary flex items-center gap-2"
            onClick={() => {
              printItem(title, body);
              setOpen(false);
            }}
          >
            <Printer size={14} /> Print / PDF
          </button>
          {onEdit && (
            <button
              className="px-3 py-2 text-left rounded-xl hover:bg-secondary flex items-center gap-2"
              onClick={() => {
                onEdit();
                setOpen(false);
              }}
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 rounded-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
