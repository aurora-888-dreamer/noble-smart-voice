import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UserRound, Mail, Phone, Lock } from "lucide-react";
import { register } from "@/lib/auth-store";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create Account — Noble" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const [lang] = useLang();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wa, setWa] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (!name.trim() || !email.includes("@") || wa.replace(/\D/g, "").length < 6) {
      setErr(lang === "id" ? "Lengkapi semua kolom." : "Please complete all fields.");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setErr(lang === "id" ? "PIN harus 6 digit angka." : "PIN must be 6 digits.");
      return;
    }
    if (pin !== pin2) {
      setErr(lang === "id" ? "PIN tidak cocok." : "PINs don't match.");
      return;
    }
    await register({ name, email, whatsapp: wa, pin });
    nav({ to: "/" });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground page-slide">
      <div className="mx-auto max-w-md px-6 py-10 flex flex-col min-h-dvh">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Noble</p>
          <h1 className="text-3xl font-semibold mt-2" style={{ fontFamily: "var(--font-serif)" }}>
            {lang === "id" ? "Daftar Akun" : "Create Account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "id"
              ? "Data tersimpan di perangkat Anda saja."
              : "Everything stays on this device."}
          </p>
        </div>

        <div className="space-y-3">
          <Field icon={<UserRound size={16} />} label={t(lang, "name")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent outline-none py-2 text-sm"
              placeholder={lang === "id" ? "Nama lengkap" : "Full name"}
            />
          </Field>
          <Field icon={<Mail size={16} />} label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none py-2 text-sm"
              placeholder="you@email.com"
            />
          </Field>
          <Field icon={<Phone size={16} />} label="WhatsApp">
            <input
              value={wa}
              onChange={(e) => setWa(e.target.value)}
              className="w-full bg-transparent outline-none py-2 text-sm"
              placeholder="+62 812 3456 7890"
            />
          </Field>
          <Field icon={<Lock size={16} />} label={lang === "id" ? "PIN 6 digit" : "6-digit PIN"}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-transparent outline-none py-2 text-sm tracking-[0.6em]"
              placeholder="••••••"
            />
          </Field>
          <Field icon={<Lock size={16} />} label={lang === "id" ? "Ulangi PIN" : "Confirm PIN"}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-transparent outline-none py-2 text-sm tracking-[0.6em]"
              placeholder="••••••"
            />
          </Field>
        </div>

        {err && <p className="mt-4 text-xs text-destructive">{err}</p>}

        <button
          onClick={submit}
          className="mt-6 w-full rounded-full bg-primary text-primary-foreground py-4 font-semibold shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
        >
          {lang === "id" ? "Buat Akun" : "Create Account"}
        </button>
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          {lang === "id"
            ? "Dengan mendaftar, Anda menyetujui penyimpanan lokal."
            : "By registering you agree to local device storage."}
        </p>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-2xl bg-card border border-border px-4 py-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </label>
  );
}
