import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Home as HomeIcon, Lock, Delete } from "lucide-react";
import {
  loginSchoolStaff, redeemParentCode, useParentCode, useSchoolSession,
  loginTeacherPin, completeTeacherSetup, clearTeacherDevice, routeForRole,
  type TeacherDevice,
} from "@/lib/school-store";
import { listTeacherStaffPublic } from "@/lib/school.functions";
import { getStoredPassword, Hint, ROLE_LABEL, useAsync } from "@/components/school/shared";
import type { SchoolRole } from "@/lib/school.functions";

export const Route = createFileRoute("/school/")({
  component: SchoolEntry,
});

type StaffRow = { id: string; full_name: string; role: SchoolRole; class_id: string | null; division?: string | null; pin_is_default?: boolean };

function SchoolEntry() {
  const navigate = useNavigate();
  const session = useSchoolSession();
  const parentCode = useParentCode();
  const [mode, setMode] = useState<"pick" | "staff" | "parent">("pick");

  // Signed in already? Jump straight to the right dashboard.
  useEffect(() => {
    if (parentCode) { navigate({ to: "/school/parent" }); return; }
    const device = session.teacherDevice;
    if (device && session.teacherUnlocked && device.role) {
      navigate({ to: routeForRole(device.role) });
    }
  }, [parentCode, session.teacherDevice, session.teacherUnlocked, navigate]);

  if (session.teacherDevice && !session.teacherUnlocked) return <StaffPinPad device={session.teacherDevice} />;
  if (session.tier && !session.teacherDevice) return <StaffDirectory />;
  if (mode === "staff") return <StaffLogin onBack={() => setMode("pick")} />;
  if (mode === "parent") return <ParentLogin onBack={() => setMode("pick")} />;
  return <EntryPicker onPick={setMode} />;
}

function EntryPicker({ onPick }: { onPick: (m: "staff" | "parent") => void }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Sample: <span className="font-semibold text-foreground">Stella Maris International School</span>
      </p>
      <h2 className="text-lg font-semibold mb-3">Masuk sebagai</h2>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onPick("staff")} className="rounded-2xl bg-card border border-border p-5 text-left active:scale-[0.98]">
          <Shield size={22} className="text-primary mb-2" />
          <p className="text-sm font-semibold">Staff</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">HoS · Admin HoS · Principal · Guru</p>
        </button>
        <button onClick={() => onPick("parent")} className="rounded-2xl bg-card border border-border p-5 text-left active:scale-[0.98]">
          <HomeIcon size={22} className="text-primary mb-2" />
          <p className="text-sm font-semibold">Orangtua</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pakai kode undangan dari Guru</p>
        </button>
      </div>
    </div>
  );
}

function StaffLogin({ onBack }: { onBack: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true); setErr(null);
    const res = await loginSchoolStaff(pw);
    setChecking(false);
    if (!res.ok) setErr("Password salah.");
  }
  return (
    <div className="max-w-sm mx-auto">
      <button onClick={onBack} className="text-xs text-muted-foreground underline mb-4">Kembali</button>
      <form onSubmit={submit} className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <p className="text-sm font-semibold">Masuk sebagai Staff</p>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password sekolah" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none" autoFocus />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button type="submit" disabled={checking || !pw.trim()} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">{checking ? "Memeriksa" : "Lanjut"}</button>
      </form>
    </div>
  );
}

function ParentLogin({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true); setErr(null);
    const res = await redeemParentCode(code);
    setChecking(false);
    if (!res.ok) setErr(("error" in res && res.error) || "Kode tidak valid.");
  }
  return (
    <div className="max-w-sm mx-auto">
      <button onClick={onBack} className="text-xs text-muted-foreground underline mb-4">Kembali</button>
      <form onSubmit={submit} className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <p className="text-sm font-semibold">Masukkan kode undangan</p>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="mis. XK7QM2NP" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none font-mono tracking-wider text-center" autoFocus />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button type="submit" disabled={checking || !code.trim()} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">{checking ? "Memeriksa" : "Buka"}</button>
      </form>
    </div>
  );
}

/** "Siapa Anda?" — every staff member, whatever their role. */
function StaffDirectory() {
  const pw = getStoredPassword();
  const staff = useAsync(() => listTeacherStaffPublic({ data: { password: pw } }), [pw]);
  const [picked, setPicked] = useState<StaffRow | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const list = (staff.data && "staff" in staff.data ? (staff.data.staff ?? []) : []) as StaffRow[];

  async function finish() {
    if (!picked) return;
    if (!/^\d{4,6}$/.test(pin)) { setErr("PIN harus 4-6 angka."); return; }
    if (pin !== confirmPin) { setErr("Konfirmasi PIN tidak sama."); return; }
    setSaving(true); setErr(null);
    const res = await completeTeacherSetup(pw, picked.id, pin);
    setSaving(false);
    if (!res.ok) setErr(res.error);
  }

  async function signIn() {
    if (!picked) return;
    setSaving(true); setErr(null);
    const res = await loginTeacherPin(picked.id, pin);
    setSaving(false);
    if (!res.ok) { setErr(res.error); setPin(""); }
  }

  if (!picked) {
    const grouped = list.reduce<Record<string, StaffRow[]>>((acc, s) => {
      (acc[s.role] ??= []).push(s);
      return acc;
    }, {});
    return (
      <div className="max-w-sm mx-auto">
        <p className="text-sm font-semibold mb-1">Siapa Anda?</p>
        <p className="text-xs text-muted-foreground mb-3">Pilih nama Anda. Dashboard yang terbuka mengikuti role Anda.</p>
        {Object.entries(grouped).map(([role, rows]) => (
          <div key={role} className="mb-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">{ROLE_LABEL[role as SchoolRole] ?? role}</p>
            <ul className="space-y-2">
              {rows.map((s) => (
                <li key={s.id}>
                  <button onClick={() => { setPicked(s); setPin(""); setConfirmPin(""); setErr(null); }} className="w-full rounded-xl bg-card border border-border p-3 text-left text-sm flex items-center justify-between">
                    {s.full_name}
                    {s.pin_is_default && <span className="text-[10px] text-muted-foreground">PIN default</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {list.length === 0 && <Hint>Belum ada staff terdaftar.</Hint>}
      </div>
    );
  }

  const firstTime = picked.pin_is_default !== false;
  return (
    <div className="max-w-sm mx-auto rounded-2xl bg-card border border-border p-5">
      <p className="text-sm font-semibold mb-1">Halo, {picked.full_name}</p>
      <p className="text-xs text-muted-foreground mb-4">
        {firstTime ? "Buat PIN baru (4-6 angka) untuk masuk. PIN awal 123456 tidak berlaku lagi setelah ini." : "Masukkan PIN Anda."}
      </p>
      <input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder={firstTime ? "PIN baru" : "PIN"} className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none mb-3 text-center tracking-widest" autoFocus />
      {firstTime && (
        <input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} placeholder="Ulangi PIN" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none mb-3 text-center tracking-widest" />
      )}
      {err && <p className="text-xs text-destructive mb-3">{err}</p>}
      <button onClick={firstTime ? finish : signIn} disabled={saving || pin.length < 4} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">
        {saving ? "Memproses…" : firstTime ? "Simpan PIN & Masuk" : "Masuk"}
      </button>
      <button onClick={() => setPicked(null)} className="w-full text-center text-xs text-muted-foreground underline mt-3">Bukan saya</button>
    </div>
  );
}

/** Returning staff — this device remembers who you are. */
function StaffPinPad({ device }: { device: TeacherDevice }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [checking, setChecking] = useState(false);

  async function submit() {
    setChecking(true);
    const res = await loginTeacherPin(device.id, pin);
    setChecking(false);
    if (!res.ok) {
      setErr(true);
      setTimeout(() => { setErr(false); setPin(""); }, 500);
    }
  }

  const press = (d: string) => {
    if (d === "del") setPin((p) => p.slice(0, -1));
    else if (pin.length < 6) setPin((p) => p + d);
  };

  return (
    <div className="max-w-xs mx-auto text-center pt-8">
      <div className="grid place-items-center w-12 h-12 rounded-full bg-primary/15 text-primary mx-auto mb-3"><Lock size={20} /></div>
      <p className="text-sm font-semibold mb-1">Halo, {device.name}</p>
      <p className="text-xs text-muted-foreground mb-6">Masukkan PIN Anda</p>
      <div className={"flex justify-center gap-3 mb-8 " + (err ? "shake" : "")}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={"w-3 h-3 rounded-full " + (i < pin.length ? (err ? "bg-destructive" : "bg-primary") : "bg-muted")} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} disabled={checking} className="aspect-square rounded-full bg-card border border-border text-xl font-light active:scale-90">{d}</button>
        ))}
        <div />
        <button onClick={() => press("0")} disabled={checking} className="aspect-square rounded-full bg-card border border-border text-xl font-light active:scale-90">0</button>
        <button onClick={() => press("del")} disabled={checking} className="aspect-square rounded-full bg-card border border-border grid place-items-center active:scale-90"><Delete size={18} /></button>
      </div>
      <button onClick={submit} disabled={checking || pin.length < 4} className="mt-6 w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">Masuk</button>
      <button onClick={clearTeacherDevice} className="mt-4 text-xs text-muted-foreground underline">Bukan {device.name}?</button>
    </div>
  );
}
