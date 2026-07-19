import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, HardDrive } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/settings-store";
import { exportAll, importAll } from "@/lib/db";

export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [{ title: "Backup — Noble" }] }),
  component: BackupPage,
});

function BackupPage() {
  const [lang] = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function doExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const name = `noble-backup-${new Date().toISOString().slice(0, 10)}.json`;

    if (navigator.share && navigator.canShare?.({ files: [new File([blob], name)] })) {
      try {
        await navigator.share({ files: [new File([blob], name, { type: "application/json" })], title: "Noble Backup" });
        URL.revokeObjectURL(url);
        return;
      } catch {
        /* fall through to plain download */
      }
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(lang === "id" ? "Backup diunduh." : "Backup downloaded.");
  }

  async function doImport(file: File) {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      await importAll(parsed);
      setMsg(lang === "id" ? "Berhasil diimpor." : "Imported successfully.");
    } catch (err) {
      setMsg((lang === "id" ? "File tidak valid: " : "Invalid file: ") + String(err));
    }
  }

  return (
    <AppShell title={lang === "id" ? "Cadangan Data" : "Backup"}>
      <div className="rounded-2xl bg-card border border-border p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive size={16} className="text-primary" />
          <p className="text-sm font-semibold">{lang === "id" ? "Cadangkan semua data" : "Back up all your data"}</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {lang === "id"
            ? "Unduh satu file berisi seluruh Catatan, Tugas, Rapat, Janji, Kontak, Diary, Pesan, Perjalanan, dan Proyek kamu."
            : "Download one file containing all your Notes, Tasks, Meetings, Appointments, Contacts, Diary, Messages, Trips, and Projects."}
        </p>
        <button onClick={doExport} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
          <Download size={15} /> {lang === "id" ? "Unduh Backup" : "Download Backup"}
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Upload size={16} className="text-primary" />
          <p className="text-sm font-semibold">{lang === "id" ? "Pulihkan dari file" : "Restore from a file"}</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {lang === "id"
            ? "Data yang dipulihkan akan digabung dengan yang sudah ada, tidak menimpa."
            : "Restored data is merged with what's already here, never overwritten."}
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Upload size={15} /> {lang === "id" ? "Pilih File Backup" : "Choose Backup File"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
      </div>

      {msg && <p className="text-xs text-primary mt-3 text-center">{msg}</p>}

      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
        {lang === "id"
          ? "Catatan: video yang tersimpan lewat fitur Kamera belum ikut ke dalam file backup ini — cuma foto dan data teks."
          : "Note: videos saved via the Camera feature aren't included in this backup file yet — only photos and text data."}
      </p>
    </AppShell>
  );
}
