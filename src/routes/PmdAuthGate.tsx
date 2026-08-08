import { useState } from "react";
import { registerPmdUser, loginPmdUser, requestPmdPinReset, resetPmdPin } from "@/lib/pmd-auth.functions";
import { setPmdSession } from "@/lib/pmd-session";

type Mode = "login" | "register" | "forgot";

export function PmdAuthGate({ lang }: { lang: "en" | "id" }) {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-serif, serif)" }}>
          Project Management Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "id" ? "Masuk atau daftar untuk melanjutkan." : "Sign in or register to continue."}
        </p>
      </div>

      {mode === "login" && <LoginForm lang={lang} onRegister={() => setMode("register")} onForgot={() => setMode("forgot")} />}
      {mode === "register" && <RegisterForm lang={lang} onLogin={() => setMode("login")} />}
      {mode === "forgot" && <ForgotPinForm lang={lang} onBack={() => setMode("login")} />}
    </div>
  );
}

function LoginForm({ lang, onRegister, onForgot }: { lang: "en" | "id"; onRegister: () => void; onForgot: () => void }) {
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await loginPmdUser({ data: { userId, pin } });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setPmdSession(res.profile);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm" />
      <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit PIN" inputMode="numeric" required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm font-mono tracking-widest" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50">
        {busy ? "…" : lang === "id" ? "Masuk" : "Sign In"}
      </button>
      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={onForgot} className="text-primary underline">
          {lang === "id" ? "Lupa PIN?" : "Forgot PIN?"}
        </button>
        <button type="button" onClick={onRegister} className="text-primary underline">
          {lang === "id" ? "Belum punya akun? Daftar" : "No account? Register"}
        </button>
      </div>
    </form>
  );
}

function RegisterForm({ lang, onLogin }: { lang: "en" | "id"; onLogin: () => void }) {
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== confirmPin) { setError(lang === "id" ? "PIN dan konfirmasi PIN tidak sama." : "PIN and PIN confirmation don't match."); return; }
    setBusy(true);
    setError(null);
    const res = await registerPmdUser({ data: { fullName, company, position, whatsapp, email, pin } });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setSavedUserId(res.profile.userId);
  }

  if (savedUserId) {
    return (
      <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-center space-y-3">
        <p className="text-sm font-semibold">{lang === "id" ? "Profil tersimpan!" : "Profile saved!"}</p>
        <p className="text-xs text-muted-foreground">{lang === "id" ? "User ID kamu:" : "Your User ID:"}</p>
        <p className="text-xl font-mono font-bold tracking-widest">{savedUserId}</p>
        <p className="text-xs text-muted-foreground">{lang === "id" ? "Simpan ini — kamu pakai User ID + PIN untuk masuk selanjutnya." : "Save this — you'll use this User ID + PIN to sign in from now on."}</p>
        <button onClick={onLogin} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold">
          {lang === "id" ? "Lanjut ke Masuk" : "Continue to Sign In"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={lang === "id" ? "Nama" : "Full Name"} required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm" />
      <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={lang === "id" ? "Perusahaan (opsional)" : "Company (optional)"} className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm" />
      <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder={lang === "id" ? "Jabatan (opsional)" : "Position (optional)"} className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm" />
      <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder={lang === "id" ? "No. WhatsApp" : "WhatsApp Number"} required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm" />
      <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={lang === "id" ? "PIN 6 digit" : "6-digit PIN"} inputMode="numeric" required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm font-mono tracking-widest" />
      <input value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={lang === "id" ? "Konfirmasi PIN" : "Confirm PIN"} inputMode="numeric" required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm font-mono tracking-widest" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50">
        {busy ? "…" : lang === "id" ? "Simpan & Daftar" : "Submit & Save"}
      </button>
      <button type="button" onClick={onLogin} className="w-full text-center text-xs text-primary underline">
        {lang === "id" ? "Sudah punya akun? Masuk" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

function ForgotPinForm({ lang, onBack }: { lang: "en" | "id"; onBack: () => void }) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await requestPmdPinReset({ data: { email } });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setNote(lang === "id" ? "Kalau email ini terdaftar, kode reset sudah dikirim. Berlaku 15 menit." : "If that email is registered, a reset code has been sent. Valid for 15 minutes.");
    setStep("reset");
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await resetPmdPin({ data: { email, code, newPin } });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setNote(lang === "id" ? "PIN berhasil diubah. Silakan masuk dengan PIN baru." : "PIN changed successfully. Please sign in with your new PIN.");
    setTimeout(onBack, 1200);
  }

  return (
    <form onSubmit={step === "request" ? requestCode : submitReset} className="space-y-3">
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required disabled={step === "reset"} className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm disabled:opacity-60" />
      {step === "reset" && (
        <>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={lang === "id" ? "Kode 6 digit" : "6-digit code"} inputMode="numeric" required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm font-mono tracking-widest" />
          <input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={lang === "id" ? "PIN baru 6 digit" : "New 6-digit PIN"} inputMode="numeric" required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm font-mono tracking-widest" />
        </>
      )}
      {note && <p className="text-xs text-primary">{note}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50">
        {busy ? "…" : step === "request" ? (lang === "id" ? "Kirim Kode" : "Send Code") : (lang === "id" ? "Simpan PIN Baru" : "Save New PIN")}
      </button>
      <button type="button" onClick={onBack} className="w-full text-center text-xs text-primary underline">
        {lang === "id" ? "← Kembali ke Masuk" : "← Back to Sign In"}
      </button>
    </form>
  );
}
