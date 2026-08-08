import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QrCode, Copy, Check, Crown, Loader2, Tag } from "lucide-react";
import qrisAsset from "@/assets/qris.png.asset.json";
import {
  PLANS, formatIDR, createOrder, useEffectivePlans, getSiteFeature, type PlanId, type OrderRecord,
} from "@/lib/aurora-store";
import { getDiscount, isDiscountValid, discountAppliesToPlan, discountAppliesToGroup, applyDiscount, setUserGroupId, useDiscounts } from "@/lib/discounts-store";
import { markOrderPlaced } from "@/lib/auth-store";

export const Route = createFileRoute("/store/order")({
  validateSearch: (s: Record<string, unknown>): { plan?: PlanId; discount?: string; group?: string } => ({
    plan: (s.plan as PlanId) ?? "quarterly",
    discount: typeof s.discount === "string" ? (s.discount as string) : undefined,
    group: typeof s.group === "string" ? (s.group as string) : undefined,
  }),
  component: OrderPage,
});

function OrderPage() {
  const { plan: initial, discount: discountFromUrl, group: groupId } = Route.useSearch();
  const [planId, setPlanId] = useState<PlanId>(initial ?? "quarterly");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const plans = useEffectivePlans();
  const plan = useMemo(() => plans.find((p) => p.id === planId)!, [planId, plans]);
  const discounts = useDiscounts();

  // Auto-detect: if the buyer didn't arrive via a special promo link
  // (?discount=xyz), find any currently-active, general (no specific
  // Group required) discount that covers this plan and apply it
  // automatically — that's the whole point of an "active site-wide
  // discount," it shouldn't require a secret link to ever be seen.
  const activeDiscount = useMemo(() => {
    if (discountFromUrl) {
      const d = getDiscount(discountFromUrl, discounts);
      if (d && isDiscountValid(d) && discountAppliesToPlan(d, planId) && discountAppliesToGroup(d, groupId ?? null)) return d;
    }
    const candidates = discounts.filter(
      (d) => isDiscountValid(d) && discountAppliesToPlan(d, planId) && d.groupIds.length === 0,
    );
    return candidates[0] ?? null;
  }, [discountFromUrl, planId, groupId, discounts]);

  const finalPrice = activeDiscount ? applyDiscount(plan, activeDiscount) : plan.priceIDR;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || (!email.trim() && !whatsapp.trim())) return;
    setSubmitting(true);
    setError(null);
    const res = await createOrder({
      planId,
      buyer: { name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim(), note: note.trim() || undefined },
      priceIDR: finalPrice,
      originalPriceIDR: activeDiscount ? plan.priceIDR : undefined,
      discountId: activeDiscount?.id,
      discountLabel: activeDiscount?.name,
      groupId: groupId,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // If the discount promotes to an upgrade group, remember it locally.
    if (activeDiscount?.upgradeGroupId) setUserGroupId(activeDiscount.upgradeGroupId);
    markOrderPlaced();
    setOrder(res.order);
  }

  if (order) return <OrderReceipt order={order} copied={copied} setCopied={setCopied} />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-serif, serif)" }}>
          Order — Noble Smart Voice
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete this form, pay via QRIS, and we'll issue your Serial Number.
        </p>
      </div>

      {activeDiscount && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/40 p-4">
          <div className="shrink-0 w-14 h-14 rounded-full bg-red-600 text-white flex flex-col items-center justify-center text-center leading-none font-bold">
            <span className="text-sm">{activeDiscount.kind === "percent" ? `${activeDiscount.value}%` : "PROMO"}</span>
            <span className="text-[8px] uppercase">off</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-600">Diskon aktif: {activeDiscount.name}</p>
            <p className="text-xs text-muted-foreground">Otomatis diterapkan ke harga paket kamu.</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan picker */}
        <div className="md:col-span-2 rounded-2xl bg-card border border-border p-4">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Plan</label>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {plans.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  planId === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                }`}
              >
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{p.tier}</div>
                <div className="text-sm font-semibold mt-1">{p.name}</div>
                <div className="text-primary font-bold text-sm mt-2">{formatIDR(p.priceIDR)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {p.durationDays == null ? "Lifetime" : `${p.durationDays} days`}
                </div>
              </button>
            ))}
          </div>
        </div>

        <Field label="Full name" required value={name} onChange={setName} placeholder="Budi Santoso" />
        <Field label="WhatsApp number" value={whatsapp} onChange={setWhatsapp} placeholder="08123456789" />
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field label="Note (optional)" value={note} onChange={setNote} placeholder="Reseller code, requests, etc." />

        <div className="md:col-span-2 flex items-center justify-between rounded-2xl bg-card border border-border p-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Total</div>
            {activeDiscount && (
              <div className="text-xs text-muted-foreground line-through">{formatIDR(plan.priceIDR)}</div>
            )}
            <div className="text-2xl font-bold text-primary">{formatIDR(finalPrice)}</div>
            {activeDiscount && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-600 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5">
                <Tag size={10} /> {activeDiscount.name}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !name.trim() || (!email.trim() && !whatsapp.trim())}
            className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <Crown size={16} />}
            Create Order
          </button>
        </div>

        {error && (
          <p className="md:col-span-2 text-sm text-destructive rounded-xl bg-destructive/10 border border-destructive/30 p-3">
            {error}
          </p>
        )}

        <p className="md:col-span-2 text-[11px] text-muted-foreground">
          By ordering you agree to our{" "}
          <Link to="/store/terms" className="underline">Terms & Conditions</Link> and{" "}
          <Link to="/store/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="rounded-2xl bg-card border border-border p-4 block">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent outline-none text-sm"
      />
    </label>
  );
}

/** Automated payment via Komerce — creates a QRIS transaction, shows the
 * live QR (via Komerce's own qr_string, rendered through a public QR-image
 * endpoint since that string isn't secret, it's literally what gets
 * scanned), and polls status every few seconds. Shows the actual error if
 * it fails (used to hide itself silently — dangerous if Manual Payment is
 * toggled off, since the buyer would be left with literally no way to pay
 * and no explanation why). */
export function KomerceCheckout({ order }: { order: OrderRecord }) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(order.status === "paid" || order.status === "delivered");

  async function start() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/komerce-create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo: `INV-${order.serial}`,
          amount: order.priceIDR,
          paymentType: "qris",
          customer: { name: order.buyer.name, email: order.buyer.email, phone: order.buyer.whatsapp },
          items: [{ id: order.planId, name: order.planId, price: order.priceIDR, quantity: 1 }],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.data?.qr_string) {
        console.error("[komerce-create-transaction] failed:", data);
        setErrorMsg(data?.error || "Gagal membuat transaksi pembayaran.");
        setLoading(false);
        return;
      }
      setQr(data.data.qr_string);
    } catch (e) {
      console.error("[komerce-create-transaction] network error:", e);
      setErrorMsg("Gagal terhubung ke server pembayaran.");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!qr || paid) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/komerce-check-status?invoiceNo=INV-${order.serial}`);
        const data = await res.json();
        if (data?.data?.status === "PAID") { setPaid(true); clearInterval(interval); }
      } catch { /* keep polling */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [qr, paid, order.serial]);

  if (paid) {
    return (
      <div className="mt-4 rounded-2xl bg-primary/10 border border-primary/40 p-4 text-center text-sm text-primary font-semibold">
        ✓ Pembayaran diterima — serial kamu sudah aktif, tinggal redeem di NSV.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-card border border-border p-5 text-center">
      {!qr ? (
        <>
          <button onClick={start} disabled={loading} className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
            {loading ? "Menyiapkan…" : "Payment Processing Here"}
          </button>
          {errorMsg && (
            <div className="mt-3 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive text-left">
              {errorMsg}
              <button onClick={start} className="block mt-2 underline font-semibold">Coba lagi</button>
            </div>
          )}
        </>
      ) : (
        <>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`}
            alt="QRIS Komerce"
            className="mx-auto rounded-xl bg-white p-2"
          />
          <p className="text-xs text-muted-foreground mt-3">Menunggu pembayaran… halaman ini update otomatis.</p>
        </>
      )}
    </div>
  );
}

function OrderReceipt({
  order, copied, setCopied,
}: { order: OrderRecord; copied: boolean; setCopied: (v: boolean) => void }) {
  const plan = PLANS.find((p) => p.id === order.planId)!;
  const [manualPaymentEnabled, setManualPaymentEnabled] = useState(true);

  useEffect(() => {
    getSiteFeature({ data: { key: "manual_payment_enabled" } }).then((r) => { if (r.ok) setManualPaymentEnabled(r.enabled); });
  }, []);

  function copySerial() {
    navigator.clipboard.writeText(order.serial);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const waText = encodeURIComponent(
    `Halo Aurora Master 👋\n\nSaya sudah order Noble Smart Voice:\n• Order: ${order.id.slice(0, 8)}\n• Plan: ${plan.name} — ${formatIDR(order.priceIDR)}\n\nBerikut bukti transfer QRIS saya. Mohon aktifkan serial saya. Terima kasih!`,
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/40 p-6 text-center">
        <Crown className="mx-auto text-primary mb-2" size={32} />
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-serif, serif)" }}>
          Order Created
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {manualPaymentEnabled
            ? "Pay automatically below, or scan the QRIS manually and we'll confirm within a few hours."
            : "Pay automatically below — your serial activates instantly once confirmed."}
        </p>
      </div>

      <KomerceCheckout order={order} />

      <div className={"mt-6 grid grid-cols-1 gap-4 " + (manualPaymentEnabled ? "md:grid-cols-2" : "")}>
        {manualPaymentEnabled && (
          <div className="rounded-2xl bg-card border border-border p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <QrCode size={14} /> QRIS Payment (manual)
            </div>
            <img
              src={qrisAsset.url}
              alt="QRIS AURORA MASTER, DIGITAL & KREATIF"
              className="w-full rounded-xl bg-white p-2"
            />
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              Merchant: <b>AURORA MASTER, DIGITAL & KREATIF</b><br />
              NMID: ID1026535963593
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Your Serial Number</div>
            {order.status === "pending" ? (
              <div className="mt-2 rounded-xl bg-secondary/50 px-3 py-4 text-center text-xs text-muted-foreground">
                Serial number akan muncul di sini otomatis setelah pembayaran kami terima. Nggak perlu dicatat manual sekarang.
              </div>
            ) : (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-xl bg-secondary px-3 py-3 text-sm font-mono tracking-wider break-all">
                    {order.serial}
                  </code>
                  <button
                    onClick={copySerial}
                    className="rounded-xl border border-border p-3 hover:bg-secondary"
                    aria-label="Copy serial"
                  >
                    {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Pembayaran dikonfirmasi — serial ini sudah aktif dan siap dipakai.
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl bg-secondary/50 p-3 text-xs space-y-1">
            <Row label="Order ID" value={order.id.slice(0, 8).toUpperCase()} />
            <Row label="Plan" value={plan.name} />
            <Row label="Duration" value={plan.durationDays == null ? "Lifetime" : `${plan.durationDays} days`} />
            <Row label="Amount" value={formatIDR(order.priceIDR)} />
            <Row label="Buyer" value={order.buyer.name} />
            {order.buyer.whatsapp && <Row label="WA" value={order.buyer.whatsapp} />}
            {order.buyer.email && <Row label="Email" value={order.buyer.email} />}
          </div>

          {manualPaymentEnabled && (
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="block text-center rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold"
            >
              Send Proof via WhatsApp
            </a>
          )}
          <Link
            to="/"
            className="block text-center rounded-full border border-border py-3 text-sm font-semibold hover:bg-secondary"
          >
            Open Noble App
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-card border border-border p-4 text-xs text-muted-foreground">
        {manualPaymentEnabled
          ? <>Next steps: after we confirm your QRIS payment, your serial is marked <b>Delivered</b>. Open Noble → <b>Activate Premium</b> → paste your serial. If you have questions, contact us via WhatsApp.</>
          : <>Next steps: your serial activates automatically the instant your Komerce payment is confirmed — no need to contact us. Open Noble → <b>Activate Premium</b> → paste your serial.</>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
