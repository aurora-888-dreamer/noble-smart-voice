import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Download, Upload, Cloud, Shield, Mic, Zap, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLang, useWakePhrase, useAutoSaveRaw } from "@/lib/settings-store";
import { t, type Lang } from "@/lib/i18n";
import { exportAll, importAll } from "@/lib/db";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Noble" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [lang, setLang] = useLang();
  const [wake, setWake] = useWakePhrase();
  const [autoRaw, setAutoRaw] = useAutoSaveRaw();
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voicetag-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      await importAll(parsed);
      alert("Imported.");
    } catch (err) {
      alert("Invalid file: " + String(err));
    }
  }

  return (
    <AppShell title={t(lang, "settings")}>
      <Card>
        <Label icon={<Mic size={14} />}>{t(lang, "language")}</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {(["en", "id"] as const).map((L: Lang) => (
            <button
              key={L}
              onClick={() => setLang(L)}
              className={`rounded-xl border p-2.5 text-sm font-medium ${
                lang === L
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background"
              }`}
            >
              {L === "en" ? "English" : "Bahasa Indonesia"}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <Label icon={<Download size={14} />}>{t(lang, "exportData")}</Label>
        <button
          onClick={doExport}
          className="w-full mt-2 rounded-xl bg-secondary text-secondary-foreground py-2.5 text-sm font-semibold"
        >
          {t(lang, "exportData")}
        </button>
        <Label icon={<Upload size={14} />}>{t(lang, "importData")}</Label>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full mt-2 rounded-xl bg-secondary text-secondary-foreground py-2.5 text-sm font-semibold"
        >
          {t(lang, "importData")}
        </button>
      </Card>

      <Card>
        <Label icon={<Cloud size={14} />}>{t(lang, "driveSync")}</Label>
        <p className="text-xs text-muted-foreground mt-2">{t(lang, "driveSyncSoon")}</p>
      </Card>

      <Card>
        <Label icon={<Shield size={14} />}>{t(lang, "privacy")}</Label>
        <p className="text-xs text-muted-foreground mt-2">{t(lang, "privacyBody")}</p>
      </Card>

      <Card>
        <Label icon={<Mic size={14} />}>{t(lang, "assistantHelp")}</Label>
        <p className="text-xs text-muted-foreground mt-2">{t(lang, "assistantBody")}</p>
      </Card>

      <Card>
        <Label icon={<Zap size={14} />}>{t(lang, "wakeWord")}</Label>
        <p className="text-xs text-muted-foreground mt-2">{t(lang, "wakeWordHint")}</p>
        <input
          value={wake}
          onChange={(e) => setWake(e.target.value)}
          placeholder="open voicetag"
          className="mt-2 w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm"
        />
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Label icon={<Mic size={14} />}>{t(lang, "autoSaveRaw")}</Label>
            <p className="text-xs text-muted-foreground mt-2">{t(lang, "autoSaveRawHint")}</p>
          </div>
          <button
            onClick={() => setAutoRaw(!autoRaw)}
            role="switch"
            aria-checked={autoRaw}
            className={`shrink-0 mt-1 w-11 h-6 rounded-full relative transition-colors ${
              autoRaw ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                autoRaw ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </Card>

      <Card>
        <Label icon={<Smartphone size={14} />}>{t(lang, "androidSetup")}</Label>
        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">
          {t(lang, "androidSetupBody")}
        </p>
      </Card>

      <p className="text-center text-[10px] text-muted-foreground mt-6">
        Noble prototype · v0.1
      </p>
    </AppShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-card border border-border p-4 mb-3">{children}</div>;
}
function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {icon}
      {children}
    </div>
  );
}