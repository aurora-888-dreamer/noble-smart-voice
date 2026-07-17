import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bluetooth, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/settings-store";
import { importPacket } from "@/lib/bluetooth-share";

export const Route = createFileRoute("/receive")({
  head: () => ({ meta: [{ title: "Receive — Noble" }] }),
  component: ReceivePage,
});

type Status =
  | { kind: "idle" }
  | { kind: "importing" }
  | { kind: "ok"; type: string; count: number; route: string }
  | { kind: "error"; message: string };

function ReceivePage() {
  const [lang] = useLang();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleFile(file: File) {
    setStatus({ kind: "importing" });
    try {
      const text = await file.text();
      const packet = JSON.parse(text);
      const res = await importPacket(packet);
      if (!res.ok) {
        setStatus({ kind: "error", message: res.error ?? "Unknown error" });
        return;
      }
      setStatus({
        kind: "ok",
        type: res.type!,
        count: res.count!,
        route: res.route!,
      });
      // Auto-navigate to the matching menu after a short pause
      setTimeout(() => nav({ to: res.route as never }), 1200);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Handle File Handling API (opened via .noble.json association)
  useEffect(() => {
    const w = window as Window & {
      launchQueue?: {
        setConsumer: (cb: (params: { files: FileSystemFileHandle[] }) => void) => void;
      };
    };
    if (!w.launchQueue) return;
    w.launchQueue.setConsumer(async ({ files }) => {
      if (!files || files.length === 0) return;
      const handle = files[0];
      const file = await handle.getFile();
      await handleFile(file);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell title={lang === "id" ? "Terima Transfer" : "Receive Transfer"}>
      <div className="rounded-2xl bg-card border border-border p-5 text-center">
        <Bluetooth size={40} className="mx-auto text-primary" />
        <h2 className="mt-3 font-semibold">
          {lang === "id" ? "Impor Paket Noble" : "Import Noble Packet"}
        </h2>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {lang === "id"
            ? "Pilih file .noble.json yang diterima melalui Bluetooth, Nearby Share, atau Quick Share. Isinya otomatis masuk ke menu yang sesuai."
            : "Pick the .noble.json file you received via Bluetooth, Nearby Share, or Quick Share. Contents auto-import into the matching menu."}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json,.noble"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={status.kind === "importing"}
          className="mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Upload size={16} />
          {status.kind === "importing"
            ? lang === "id"
              ? "Mengimpor…"
              : "Importing…"
            : lang === "id"
              ? "Pilih file"
              : "Choose file"}
        </button>

        {status.kind === "ok" && (
          <div className="mt-4 rounded-xl bg-primary/10 border border-primary/30 p-3 text-sm flex items-center gap-2 justify-center text-primary">
            <CheckCircle2 size={18} />
            {lang === "id"
              ? `${status.count} ${status.type} diimpor. Membuka…`
              : `Imported ${status.count} ${status.type}${status.count > 1 ? "s" : ""}. Opening…`}
          </div>
        )}
        {status.kind === "error" && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-sm flex items-center gap-2 justify-center text-destructive">
            <AlertCircle size={18} />
            {status.message}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4 text-center leading-relaxed">
        {lang === "id"
          ? "Tip: pasang Noble di kedua HP, lalu di menu apa pun pilih item → tombol Bluetooth. Penerima buka file .noble.json di sini."
          : "Tip: install Noble on both phones, then in any menu select items → Bluetooth button. Receiver opens the .noble.json file here."}
      </p>
    </AppShell>
  );
}
