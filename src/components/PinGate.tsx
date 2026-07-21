import { useEffect, useState, type ReactNode } from "react";
import { Fingerprint, Delete, Lock } from "lucide-react";
import { authenticateBiometric, hasBiometric, isBiometricSupported, verifyPin } from "@/lib/auth-store";
import { useLang } from "@/lib/settings-store";

/**
 * Wraps children behind a PIN/biometric re-check, using the SAME PIN and
 * WebAuthn credential as the main app login (not a separate secret) — the
 * point is "prove it's still you" for something more sensitive, not a
 * second password to remember.
 *
 * Unlock is remembered for the browser tab's session (sessionStorage) — it
 * clears when the tab/app is closed, but doesn't re-prompt on every single
 * visit within the same session. Pass a unique `storageKey` per gated
 * section if you use this in more than one place.
 */
export function PinGate({
  storageKey,
  title,
  children,
}: {
  storageKey: string;
  title?: string;
  children: ReactNode;
}) {
  const [lang] = useLang();
  const [unlocked, setUnlocked] = useState<boolean | null>(null); // null = not checked yet (avoids a flash)
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const bioAvailable = isBiometricSupported() && hasBiometric();

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  useEffect(() => {
    if (pin.length === 6) {
      verifyPin(pin).then((ok) => {
        if (ok) {
          sessionStorage.setItem(storageKey, "1");
          setUnlocked(true);
        } else {
          setErr(true);
          setTimeout(() => {
            setErr(false);
            setPin("");
          }, 600);
        }
      });
    }
  }, [pin, storageKey]);

  async function tryBio() {
    const ok = await authenticateBiometric();
    if (ok) {
      sessionStorage.setItem(storageKey, "1");
      setUnlocked(true);
    }
  }

  const press = (d: string) => {
    if (d === "del") setPin((p) => p.slice(0, -1));
    else if (pin.length < 6) setPin((p) => p + d);
  };

  if (unlocked === null) return null; // brief check, avoids flashing the lock screen unnecessarily
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <div className="mx-auto max-w-md w-full px-6 pt-16 flex-1 flex flex-col">
        <div className="text-center mb-8">
          <div className="grid place-items-center w-12 h-12 rounded-full bg-primary/15 text-primary mx-auto mb-3">
            <Lock size={20} />
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            {title ?? (lang === "id" ? "Terkunci" : "Locked")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "id" ? "Masukkan PIN untuk membuka" : "Enter your PIN to unlock"}
          </p>
        </div>

        <div className={`flex justify-center gap-3 mb-8 ${err ? "shake" : ""}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-colors ${
                i < pin.length ? (err ? "bg-destructive" : "bg-primary") : "bg-muted"
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
      </div>
    </div>
  );
}

function Key({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
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
