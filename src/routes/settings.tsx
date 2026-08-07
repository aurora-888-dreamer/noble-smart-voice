import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  Cloud,
  Shield,
  Mic,
  Smartphone,
  Fingerprint,
  LogOut,
  ShieldCheck,
  BookOpen,
  HardDrive,
  Bluetooth,
  X as XIcon,
  Grid3x3,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLang, useAutoSaveRaw, useRecordTimeoutMin } from "@/lib/settings-store";
import { t, type Lang } from "@/lib/i18n";
import { exportAll, importAll } from "@/lib/db";
import {
  useShortcutEnabledMap,
  setShortcutEnabled,
  useAllShortcuts,
  addCustomShortcut,
  removeCustomShortcut,
  updateShortcutUrl,
} from "@/lib/app-shortcuts-store";
import type { AppShortcut } from "@/lib/app-shortcuts";
import {
  getProfile,
  hasBiometric,
  isBiometricSupported,
  useLicenseInfo,
  setPremiumTestOverride,
  registerBiometric,
  removeBiometric,
  signOut,
} from "@/lib/auth-store";
import {
  addPairedDevice,
  canShareBluetooth,
  getPairedDevices,
  isWebBluetoothSupported,
  removePairedDevice,
  scanBluetoothDevice,
  type BTDeviceInfo,
} from "@/lib/bluetooth-share";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Noble" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [lang] = useLang();
  const [autoRaw, setAutoRaw] = useAutoSaveRaw();
  const [recordTimeout, setRecordTimeout] = useRecordTimeoutMin();
  const [bio, setBio] = useState(false);
  const license = useLicenseInfo();
  const premium = license.hasLicense && !license.expired && !license.manuallyOff;
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const profile = getProfile();

  useEffect(() => {
    setBio(hasBiometric());
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

        {license.manuallyOff && (
          <p className="text-xs text-muted-foreground mt-2">
            {lang === "id"
              ? "Premium sedang dinonaktifkan sementara (mode uji Standard)."
              : "Premium is temporarily switched off (testing Standard)."}
          </p>
        )}

        {!license.manuallyOff && premium && (
          <p className="text-xs text-primary mt-2">
            {lang === "id" ? "Premium aktif — AI Gemini terhubung." : "Premium active — Gemini AI enabled."}
            {license.daysLeft != null && (
              <span className="block text-muted-foreground mt-0.5">
                {license.source === "trial"
                  ? lang === "id"
                    ? `Masa uji coba: ${license.daysLeft} hari lagi`
                    : `Trial: ${license.daysLeft} days left`
                  : lang === "id"
                    ? `Berlaku ${license.daysLeft} hari lagi`
                    : `Expires in ${license.daysLeft} days`}
              </span>
            )}
            {license.daysLeft == null && (
              <span className="block text-muted-foreground mt-0.5">
                {lang === "id" ? "Tanpa batas waktu" : "No expiry"}
              </span>
            )}
          </p>
        )}

        {!license.manuallyOff && !premium && license.hasLicense && license.expired && (
          <p className="text-xs text-destructive mt-2">
            {lang === "id" ? "Masa uji coba/lisensi sudah habis." : "Your trial/license has expired."}
          </p>
        )}

        {!premium && !license.hasLicense && (
          <Link
            to="/activate"
            className="inline-block mt-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
          >
            {t(lang, "activatePremium")}
          </Link>
        )}

        {license.hasLicense && (
          <div className="mt-3 flex flex-wrap gap-2">
            {license.manuallyOff ? (
              <button
                onClick={() => setPremiumTestOverride(false)}
                className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
              >
                {lang === "id" ? "Aktifkan kembali Premium" : "Turn Premium back on"}
              </button>
            ) : (
              premium && (
                <button
                  onClick={() => setPremiumTestOverride(true)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
                >
                  {lang === "id" ? "Nonaktifkan sementara (uji Standard)" : "Switch off temporarily (test Standard)"}
                </button>
              )
            )}
            {license.expired && license.source !== "admin" && (
              <Link
                to="/activate"
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              >
                {lang === "id" ? "Masukkan kode lain" : "Enter a different code"}
              </Link>
            )}
          </div>
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

      <AppShortcutsCard lang={lang} />

      <Card>
        <Label icon={<Bluetooth size={14} />}>{lang === "id" ? "Sinkronisasi Perangkat" : "Sync Devices"}</Label>
        <p className="text-xs text-muted-foreground mt-2">
          {lang === "id"
            ? "Hubungkan langsung ke perangkat lain milikmu (WiFi yang sama) untuk menyamakan data — tanpa lewat server mana pun."
            : "Connect directly to your other device (same WiFi) to bring data in sync — never through any server."}
        </p>
        <Link
          to="/sync"
          className="mt-3 inline-block rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
        >
          {lang === "id" ? "Buka Sinkronisasi" : "Open Sync"}
        </Link>
      </Card>

      <BluetoothCard lang={lang} />



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
        <Label icon={<Mic size={14} />}>{t(lang, "recTimeoutSetting")}</Label>
        <p className="text-xs text-muted-foreground mt-2">{t(lang, "recTimeoutHint")}</p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={60}
            value={recordTimeout}
            onChange={(e) => setRecordTimeout(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm"
          />
          <span className="text-sm text-muted-foreground">{t(lang, "recMinutes")}</span>
        </div>
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

function AppShortcutsCard({ lang }: { lang: Lang }) {
  const enabled = useShortcutEnabledMap();
  const all = useAllShortcuts();
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");

  function submitCustom() {
    if (!newName.trim() || !newUrl.trim()) return;
    addCustomShortcut(newName.trim(), newUrl.trim());
    setNewName("");
    setNewUrl("");
    setAdding(false);
  }

  function startEdit(s: AppShortcut) {
    setEditingId(s.id);
    setEditUrl(s.url);
  }

  function saveEdit() {
    if (!editingId) return;
    updateShortcutUrl(editingId, editUrl.trim());
    setEditingId(null);
  }

  return (
    <Card>
      <Label icon={<Grid3x3 size={14} />}>
        {lang === "id" ? "Pintasan Aplikasi (Home)" : "App Shortcuts (Home)"}
      </Label>
      <p className="text-xs text-muted-foreground mt-2 mb-3">
        {lang === "id"
          ? "Pilih aplikasi luar yang mau ditampilkan sebagai tombol cepat di halaman Home. Ketuk ikon pensil untuk lihat/ubah link-nya (misal isi nomor WhatsApp kamu sendiri)."
          : "Choose which outside apps show up as quick-launch buttons on Home. Tap the pencil to view/edit the link (e.g. fill in your own WhatsApp number)."}
      </p>
      <div className="space-y-2">
        {all.map((s) => (
          <div key={s.id} className="rounded-xl border border-border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{lang === "id" ? s.nameId : s.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => (editingId === s.id ? setEditingId(null) : startEdit(s))}
                  className="text-muted-foreground p-1"
                  aria-label={`Edit ${s.name} URL`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setShortcutEnabled(s.id, !enabled[s.id])}
                  className={`w-11 h-6 rounded-full transition-colors relative ${enabled[s.id] ? "bg-primary" : "bg-secondary"}`}
                  aria-label={`Toggle ${s.name}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${enabled[s.id] ? "translate-x-[22px]" : "translate-x-0.5"}`}
                  />
                </button>
                {s.custom && (
                  <button onClick={() => removeCustomShortcut(s.id)} className="text-muted-foreground" aria-label="Remove">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {editingId === s.id ? (
              <div className="mt-2 flex gap-2">
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://... atau mailto:... / wa.me/62..."
                  className="flex-1 rounded-lg bg-secondary text-secondary-foreground px-2.5 py-1.5 text-xs"
                  autoFocus
                />
                <button onClick={saveEdit} className="rounded-lg bg-primary text-primary-foreground px-3 text-xs font-semibold">
                  {lang === "id" ? "Simpan" : "Save"}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{s.url}</p>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={lang === "id" ? "Nama app" : "App name"}
            className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 rounded-xl border border-border py-2 text-sm font-semibold">
              {lang === "id" ? "Batal" : "Cancel"}
            </button>
            <button onClick={submitCustom} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2 text-sm font-semibold">
              {lang === "id" ? "Tambah" : "Add"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <Plus size={14} /> {lang === "id" ? "Tambah pintasan lain" : "Add another shortcut"}
        </button>
      )}
    </Card>
  );
}

function BluetoothCard({ lang }: { lang: Lang }) {
  const [paired, setPaired] = useState<BTDeviceInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const shareOk = canShareBluetooth();
  const btOk = isWebBluetoothSupported();

  useEffect(() => {
    setPaired(getPairedDevices());
  }, []);

  async function pair() {
    setMsg(null);
    setScanning(true);
    try {
      const d = await scanBluetoothDevice();
      if (d) {
        addPairedDevice(d);
        setPaired(getPairedDevices());
        setMsg(lang === "id" ? `Tersimpan: ${d.name}` : `Saved: ${d.name}`);
      }
    } finally {
      setScanning(false);
    }
  }

  function unpair(id: string) {
    removePairedDevice(id);
    setPaired(getPairedDevices());
  }

  return (
    <Card>
      <Label icon={<Bluetooth size={14} />}>Bluetooth</Label>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        {lang === "id"
          ? "Di menu mana pun, pilih item lalu ketuk ikon Bluetooth untuk mengirim via Bluetooth / Nearby Share. Penerima buka file .noble.json — isinya masuk otomatis ke menu yang sama."
          : "In any menu, select items and tap the Bluetooth icon to send via Bluetooth / Nearby Share. Receiver opens the .noble.json file — contents auto-import into the matching menu."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span
          className={`px-2 py-1 rounded-full ${
            shareOk ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {lang === "id" ? "Berbagi file" : "File share"}: {shareOk ? "✓" : "—"}
        </span>
        <span
          className={`px-2 py-1 rounded-full ${
            btOk ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          Web Bluetooth: {btOk ? "✓" : "—"}
        </span>
      </div>

      {btOk && (
        <button
          onClick={pair}
          disabled={scanning}
          className="mt-3 w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {scanning
            ? lang === "id"
              ? "Memindai…"
              : "Scanning…"
            : lang === "id"
              ? "Pasangkan perangkat baru"
              : "Pair new device"}
        </button>
      )}

      {paired.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {paired.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs"
            >
              <span className="truncate flex-1">{d.name}</span>
              <button
                onClick={() => unpair(d.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove"
              >
                <XIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/receive"
        className="mt-3 inline-block rounded-xl bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold"
      >
        {lang === "id" ? "Terima transfer" : "Receive transfer"}
      </Link>

      {msg && <p className="text-[11px] text-primary mt-2">{msg}</p>}
      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        {lang === "id"
          ? "Catatan: browser tidak bisa mengirim byte Bluetooth langsung ke HP lain. Kami serahkan file ke Bluetooth/Nearby Share HP — cara transfer HP-ke-HP paling andal."
          : "Note: browsers can't send raw Bluetooth bytes to another phone. We hand the file to your phone's Bluetooth/Nearby Share — the most reliable phone-to-phone path."}
      </p>
    </Card>
  );
}



function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {icon}
      {children}
    </div>
  );
}
