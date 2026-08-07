import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, QrCode } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { activatePremium, isPremium, getProfile, applyRedeemedLicense, markVoucherRedeemed } from "@/lib/auth-store";
import { redeemVoucher } from "@/lib/vouchers.functions";
import { useLang } from "@/lib/settings-store";

export const Route = createFileRoute("/activate")({
  head: () => ({ meta: [{ title: "Activate Premium — Noble" }] }),
  component: ActivatePage,
});

function ActivatePage() {
  const [lang] = useLang();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "bad" | "checking">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const already = isPremium();

  async function submit() {
    setStatus("checking");
    setErrorMsg(null);

    // Local, no-expiry test/admin codes (e.g. the owner code) — no backend needed.
    if (activatePremium(code)) {
      setStatus("ok");
      setTimeout(() => nav({ to: "/settings" }), 800);
      return;
    }

    // Otherwise, try it as a real voucher bound to this account's email/WhatsApp.
    const profile = getProfile();
    const contact = profile?.email || profile?.whatsapp || "";
    if (!contact) {
      setStatus("bad");
      setErrorMsg(lang === "id" ? "Akun kamu belum punya email/WhatsApp terdaftar." : "Your account has no email/WhatsApp on file.");
      return;
    }

    try {
      const res = await redeemVoucher({ data: { code, contact } });
      if (res.ok && res.tier && res.durationDays != null) {
        applyRedeemedLicense({ code: code.trim().toUpperCase(), tier: res.tier, durationDays: res.durationDays });
        markVoucherRedeemed();
        setStatus("ok");
        setTimeout(() => nav({ to: "/settings" }), 800);
      } else {
        setStatus("bad");
        setErrorMsg(res.error ?? (lang === "id" ? "Kode tidak valid." : "Invalid code."));
      }
    } catch (err) {
      setStatus("bad");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
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
            disabled={status === "checking"}
            className="mt-3 w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-60"
          >
            {status === "checking"
              ? lang === "id" ? "Memeriksa…" : "Checking…"
              : lang === "id" ? "Aktifkan" : "Activate"}
          </button>
          {status === "bad" && (
            <p className="text-xs text-destructive mt-2">
              {errorMsg ?? (lang === "id" ? "Kode tidak valid." : "Invalid code.")}
            </p>
          )}
          {status === "ok" && (
            <p className="text-xs text-primary mt-2">
              {lang === "id" ? "Aktivasi berhasil." : "Activation successful."}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-3">
            {lang === "id"
              ? "Kode voucher terikat ke email/WhatsApp akun kamu — hanya bisa dipakai sekali oleh akun yang sama."
              : "Voucher codes are bound to your account's email/WhatsApp — usable once, by that account only."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
