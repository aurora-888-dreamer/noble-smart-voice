import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, KeyRound, ArrowLeft } from "lucide-react";
import { schoolLogin, forgotSchoolPin, useSchoolSession, routeForRole } from "@/lib/school-store";

export const Route = createFileRoute("/school/")({
  head: () => ({
    meta: [
      { title: "Masuk — School Dashboard" },
      { name: "description", content: "Masuk ke School Dashboard dengan UserID dan PIN Anda." },
      { property: "og:title", content: "Masuk — School Dashboard" },
      { property: "og:description", content: "Masuk ke School Dashboard dengan UserID dan PIN Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolEntry,
});

function SchoolEntry() {
  const navigate = useNavigate();
  const { session, ready } = useSchoolSession();
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    if (!session) return;
    navigate({ to: session.kind === "parent" ? "/school/parent" : routeForRole(session.role) });
  }, [session, navigate]);

  if (!ready) return null;
  if (session) return null;
  return forgot ? <ForgotPin onBack={() => setForgot(false)} /> : <LoginForm onForgot={() => setForgot(true)} />;
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await schoolLogin(userId, pin);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      setPin("");
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-4">
      <div className="grid place-items-center w-12 h-12 rounded-full bg-primary/15 text-primary mx-auto mb-3"><Lock size={20} /></div>
      <h1 className="text-lg font-semibold text-center">School Dashboard</h1>
      <p className="text-xs text-muted-foreground text-center mb-5">Stella Maris International School</p>
      <form onSubmit={submit} className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="school-userid">UserID</label>
          <input
            id="school-userid" value={userId} onChange={(e) => setUserId(e.target.value.trim())}
            placeholder="mis. Noble888" autoCapitalize="none" autoCorrect="off" autoFocus
            className="w-full mt-1 rounded-xl bg-secondary px-4 py-3 text-sm outline-none font-mono tracking-wide"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="school-pin">PIN</label>
          <input
            id="school-pin" type="password" inputMode="numeric" maxLength={6}
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="6 angka"
            className="w-full mt-1 rounded-xl bg-secondary px-4 py-3 text-sm outline-none text-center tracking-[0.4em]"
          />
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button type="submit" disabled={busy || !userId || pin.length < 4} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">
          {busy ? "Memeriksa…" : "Masuk"}
        </button>
        <button type="button" onClick={onForgot} className="w-full text-center text-xs text-primary underline">Lupa PIN?</button>
      </form>
      <p className="text-[11px] text-muted-foreground text-center mt-4">
        UserID staff dibuat oleh Head of School. UserID orangtua dikirim oleh Guru kelas.
      </p>
    </div>
  );
}

function ForgotPin({ onBack }: { onBack: () => void }) {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setDone(null);
    const res = await forgotSchoolPin(userId, email);
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setDone(res.defaultPin);
  }

  return (
    <div className="max-w-sm mx-auto pt-4">
      <button onClick={onBack} className="text-xs text-muted-foreground flex items-center gap-1 mb-4"><ArrowLeft size={13} /> Kembali ke login</button>
      <form onSubmit={submit} className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><KeyRound size={15} className="text-primary" /> Reset PIN</p>
        <p className="text-xs text-muted-foreground">Masukkan UserID dan email yang terdaftar di akun Anda. PIN akan dikembalikan ke PIN default.</p>
        <input value={userId} onChange={(e) => setUserId(e.target.value.trim())} placeholder="UserID" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none font-mono" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email terdaftar" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none" />
        {err && <p className="text-xs text-destructive">{err}</p>}
        {done && (
          <p className="text-xs rounded-lg bg-primary/10 text-primary p-3">
            PIN sudah direset ke <code className="font-mono font-semibold">{done}</code>. Masuk sekarang, lalu segera ganti PIN Anda lewat menu Ganti PIN.
          </p>
        )}
        <button type="submit" disabled={busy || !userId || !email} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">
          {busy ? "Memproses…" : "Reset PIN"}
        </button>
        <p className="text-[11px] text-muted-foreground">Tidak punya email terdaftar? Hubungi Admin HoS untuk reset manual.</p>
      </form>
    </div>
  );
}
