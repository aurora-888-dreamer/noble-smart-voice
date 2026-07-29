import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { X, Copy, Check, Printer } from "lucide-react";

type PreviewContent = { title: string; body: ReactNode } | null;

const PreviewCtx = createContext<{
  content: PreviewContent;
  openPreview: (c: PreviewContent) => void;
  closePreview: () => void;
} | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<PreviewContent>(null);
  return (
    <PreviewCtx.Provider value={{ content, openPreview: setContent, closePreview: () => setContent(null) }}>
      {children}
    </PreviewCtx.Provider>
  );
}

export function usePreview() {
  const ctx = useContext(PreviewCtx);
  if (!ctx) throw new Error("usePreview must be used inside PreviewProvider");
  return ctx;
}

/** Docked column on wide screens (lg+), full-screen slide-over below that.
 * Mount this once near the root of the /school layout — it reads from
 * context, so any page can call usePreview().openPreview(...) to fill it. */
export function PreviewPanel() {
  const { content, closePreview } = usePreview();
  const open = !!content;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Prevent background scroll while the mobile slide-over is open.
  useEffect(() => {
    if (open && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  function handleCopy() {
    const text = bodyRef.current?.innerText ?? "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handlePrint() {
    const html = bodyRef.current?.innerHTML ?? "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${content?.title ?? "Preview"}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111} h1{font-size:16px}</style>
      </head><body><h1>${content?.title ?? ""}</h1>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <>
      {/* Mobile scrim */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={closePreview} />
      )}
      <div
        className={
          "fixed top-0 right-0 h-dvh bg-background border-l border-border z-50 shadow-xl flex flex-col " +
          "w-full lg:w-[420px] transition-transform duration-200 " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <p className="text-sm font-semibold truncate">{content?.title ?? ""}</p>
          <button onClick={closePreview} aria-label="Tutup preview" className="rounded-lg border border-border p-1.5 shrink-0">
            <X size={14} />
          </button>
        </div>
        <div ref={bodyRef} className="p-4 overflow-y-auto flex-1">
          {content?.body}
        </div>
        {open && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
            <button onClick={handleCopy} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5">
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={handlePrint} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5">
              <Printer size={13} /> Print / PDF
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/** Small reusable trigger button — put next to any list row to open it in
 * the Preview panel instead of (or alongside) an inline expand. */
export function PreviewButton({ title, body, label = "Preview" }: { title: string; body: ReactNode; label?: string }) {
  const { openPreview } = usePreview();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openPreview({ title, body }); }}
      className="text-[10px] text-primary underline shrink-0"
    >
      {label}
    </button>
  );
}
