import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fingerprint, Delete } from "lucide-react";
import {
  authenticateBiometric,
  getProfile,
  hasBiometric,
  isBiometricSupported,
  verifyPin,
} from "@/lib/auth-store";
import { useLang } from "@/lib/settings-store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — Noble" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [lang] = useLang();
  const nav = useNavigate();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const profile = getProfile();
  const bioAvailable = isBiometricSupported() && hasBiometric();

  useEffect(() => {
    if (pin.length === 6) {
      verifyPin(pin).then((ok) => {
        if (ok) nav({ to: "/" });
        else {
          setErr(true);
          setTimeout(() => {
            setErr(false);
            setPin("");
          }, 600);
        }
      });
    }
  }, [pin, nav]);

  async function tryBio() {
    const ok = await authenticateBiometric();
    if (ok) nav({ to: "/" });
  }

  const press = (d: string) => {
    if (d === "del") setPin((p) => p.slice(0, -1));
    else if (pin.length < 6) setPin((p) => p + d);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground page-slide flex flex-col">
      <div className="mx-auto max-w-md w-full px-6 pt-16 flex-1 flex flex-col">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Noble</p>
          <h1
            className="text-3xl font-semibold mt-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {lang === "id" ? "Selamat kembali" : "Welcome back"}
          </h1>
          {profile && (
            <p className="text-sm text-muted-foreground mt-1">{profile.name}</p>
          )}
        </div>

        <div className={`flex justify-center gap-3 mb-8 ${err ? "shake" : ""}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-colors ${
                i < pin.length
                  ? err
                    ? "bg-destructive"
                    : "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto w-full">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onClick={() => press(d)}>
              {d}
            </Key>
          ))}
          <Key onClick={bioAvailable ? tryBio : undefined} disabled={!bioAvailable}>
            {bioAvailable ? <Fingerprint size={22} /> : ""}
          </Key>
          <Key onClick={() => press("0")}>0</Key>
          <Key onClick={() => press("del")}>
            <Delete size={20} />
          </Key>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          {lang === "id"
            ? "Masuk dengan PIN atau biometrik."
            : "Sign in with PIN or biometrics."}
        </p>
      </div>
    </div>
  );
}

function Key({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="aspect-square rounded-full bg-card border border-border text-2xl font-light active:scale-90 active:bg-primary/20 transition-transform disabled:opacity-30 grid place-items-center"
    >
      {children}
    </button>
  );
}
