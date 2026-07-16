import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, QrCode } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { activatePremium, isPremium } from "@/lib/auth-store";
import { useLang } from "@/lib/settings-store";

export const Route = createFileRoute("/activate")({
  head: () => ({ meta: [{ title: "Activate Premium — Noble" }] }),
  component: ActivatePage,
});

function ActivatePage() {
  const [lang] = useLang();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "bad">("idle");
  const already = isPremium();

  function submit() {
    const ok = activatePremium(code);
    setStatus(ok ? "ok" : "bad");
    if (ok) setTimeout(() => nav({ to: "/settings" }), 800);
  }

  return (
    <AppShell title={lang === "id" ? "Aktivasi Premium" : "Activate Premium"}>
      <div className="rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/40 p-6 text-center">
        <ShieldCheck className="mx-auto text-primary mb-3" size={40} />
        <h2
          className="text-2xl mb-2"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Noble Premium
        </h2>
        {already ? (
          <p className="text-sm text-primary">
            {lang === "id" ? "Sudah aktif ✨" : "Already active ✨"}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {lang === "id"
              ? "Masukkan kode aktivasi dari QR code Anda."
              : "Enter the activation code from your QR."}
          </p>
        )}
      </div>

      {!already && (
        <div className="mt-4 rounded-2xl bg-card border border-border p-4">
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
            <QrCode size={14} /> {lang === "id" ? "Kode aktivasi" : "Activation code"}
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AURORA-PREMIUM-XXXX"
            className="w-full rounded-xl bg-secondary text-secondary-foreground px-4 py-3 text-sm tracking-widest font-mono outline-none"
          />
          <button
            onClick={submit}
            className="mt-3 w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold"
          >
            {lang === "id" ? "Aktifkan" : "Activate"}
          </button>
          {status === "bad" && (
            <p className="text-xs text-destructive mt-2">
              {lang === "id" ? "Kode tidak valid." : "Invalid code."}
            </p>
          )}
          {status === "ok" && (
            <p className="text-xs text-primary mt-2">
              {lang === "id" ? "Aktivasi berhasil." : "Activation successful."}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-3">
            {lang === "id"
              ? "Admin dapat mengaktifkan tanpa kode."
              : "Admins are activated without a code."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
