import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  Cloud,
  Shield,
  Mic,
  Zap,
  Smartphone,
  Fingerprint,
  LogOut,
  ShieldCheck,
  BookOpen,
  HardDrive,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLang, useWakePhrase, useAutoSaveRaw } from "@/lib/settings-store";
import { t, type Lang } from "@/lib/i18n";
import { exportAll, importAll } from "@/lib/db";
import {
  getProfile,
  hasBiometric,
  isBiometricSupported,
  isPremium,
  registerBiometric,
  removeBiometric,
  signOut,
} from "@/lib/auth-store";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Noble" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [lang, setLang] = useLang();
  const [wake, setWake] = useWakePhrase();
  const [autoRaw, setAutoRaw] = useAutoSaveRaw();
  const [bio, setBio] = useState(false);
  const [premium, setPremium] = useState(false);
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const profile = getProfile();

  useEffect(() => {
    setBio(hasBiometric());
    setPremium(isPremium());
  }, []);

  async function doExport(target: "laptop" | "drive" | "storage") {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const name = `noble-backup-${new Date().toISOString().slice(0, 10)}.json`;
    if (target === "drive") {
      // Web share intent to Drive picker (Android) or fallback to download
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], name)] })) {
        try {
          await navigator.share({
            files: [new File([blob], name, { type: "application/json" })],
            title: "Noble Backup",
          });
          URL.revokeObjectURL(url);
          return;
        } catch {
          /* fall through */
        }
      }
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      await importAll(parsed);
      alert(lang === "id" ? "Berhasil diimpor." : "Imported.");
    } catch (err) {
      alert("Invalid file: " + String(err));
    }
  }

  async function toggleBio() {
    if (bio) {
      removeBiometric();
      setBio(false);
    } else {
      const ok = await registerBiometric();
      setBio(ok);
      if (!ok) alert(lang === "id" ? "Gagal mendaftarkan biometrik." : "Biometric registration failed.");
    }
  }

  return (
    <AppShell title={t(lang, "settings")}>
      {profile && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {lang === "id" ? "Pengguna" : "Account"}
            </p>
            <p className="text-sm font-semibold mt-1">{profile.name}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
            {premium && (
              <span className="inline-flex items-center gap-1 mt-2 text-[10px] uppercase tracking-widest text-primary">
                <ShieldCheck size={10} /> Premium
              </span>
            )}
          </div>
          <button
            onClick={() => {
              signOut();
              nav({ to: "/login" });
            }}
            className="text-muted-foreground hover:text-destructive p-2"
            aria-label={t(lang, "signOut")}
          >
            <LogOut size={18} />
          </button>
        </div>
      )}

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
        <Label icon={<Fingerprint size={14} />}>{t(lang, "biometric")}</Label>
        {!isBiometricSupported() ? (
          <p className="text-xs text-muted-foreground mt-2">
            {lang === "id" ? "Perangkat tidak mendukung." : "Not supported on this device."}
          </p>
        ) : (
          <button
            onClick={toggleBio}
            className={`w-full mt-2 rounded-xl py-2.5 text-sm font-semibold ${
              bio
                ? "bg-destructive/15 text-destructive"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {bio ? t(lang, "removeBiometric") : t(lang, "registerBiometric")}
          </button>
        )}
      </Card>

      <Card>
        <Label icon={<ShieldCheck size={14} />}>{t(lang, "premium")}</Label>
        {premium ? (
          <p className="text-xs text-primary mt-2">
            {lang === "id" ? "Premium aktif — AI Gemini terhubung." : "Premium active — Gemini AI enabled."}
          </p>
        ) : (
          <Link
            to="/activate"
            className="inline-block mt-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
          >
            {t(lang, "activatePremium")}
          </Link>
        )}
      </Card>

      <Card>
        <Label icon={<HardDrive size={14} />}>
          {lang === "id" ? "Cadangan & Transfer" : "Backup & Transfer"}
        </Label>
        <div className="grid grid-cols-1 gap-2 mt-2">
          <button
            onClick={() => doExport("laptop")}
            className="w-full rounded-xl bg-secondary text-secondary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Download size={14} /> {t(lang, "backupLaptop")}
          </button>
          <button
            onClick={() => doExport("drive")}
            className="w-full rounded-xl bg-secondary text-secondary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Cloud size={14} /> {t(lang, "backupDrive")}
          </button>
          <button
            onClick={() => doExport("storage")}
            className="w-full rounded-xl bg-secondary text-secondary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <HardDrive size={14} /> {t(lang, "backupStorage")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl bg-secondary text-secondary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Upload size={14} /> {t(lang, "importData")}
          </button>
        </div>
      </Card>

      <Card>
        <Label icon={<BookOpen size={14} />}>{t(lang, "guide")}</Label>
        <Link
          to="/guide"
          className="inline-block mt-2 rounded-xl bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold"
        >
          {lang === "id" ? "Buka panduan" : "Open guide"}
        </Link>
      </Card>

      <Card>
        <Label icon={<Zap size={14} />}>{t(lang, "wakeWord")}</Label>
        <p className="text-xs text-muted-foreground mt-2">
          {lang === "id"
            ? "Saat aktif, aplikasi mendengarkan frasa ini selama layar terbuka. Setelah terdengar, mic terbuka terus-menerus sampai Anda katakan \"close mic\" atau \"standby\"."
            : "When enabled, the app listens for this phrase while the screen is open. Once heard, the mic stays on until you say \"close mic\" or \"standby\"."}
        </p>
        <input
          value={wake}
          onChange={(e) => setWake(e.target.value)}
          placeholder="Aurora Start"
          className="mt-2 w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm"
        />
        <WakeToggle lang={lang} />
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          {lang === "id"
            ? "Untuk membuka aplikasi ini dari layar terkunci HP: buka Google Assistant → Routines → tambah Personal shortcut dengan pemicu \"Aurora Start\" dan aksi \"Buka Noble\". Browser web tidak bisa mendengarkan saat aplikasi ditutup."
            : "To trigger this from a locked phone: open Google Assistant → Routines → add a Personal shortcut with trigger \"Aurora Start\" and action \"Open Noble\". Web browsers cannot listen while the app is closed."}
        </p>
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
        <Label icon={<Shield size={14} />}>{t(lang, "privacy")}</Label>
        <p className="text-xs text-muted-foreground mt-2">{t(lang, "privacyBody")}</p>
      </Card>

      <Card>
        <Label icon={<Smartphone size={14} />}>{t(lang, "androidSetup")}</Label>
        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">
          {t(lang, "androidSetupBody")}
        </p>
      </Card>

      <p className="text-center text-[10px] text-muted-foreground mt-6">
        Noble · v0.2 · {lang === "id" ? "Suara Anda, disimpan lokal" : "Your voice, kept local"}
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
