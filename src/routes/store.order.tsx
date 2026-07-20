import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { QrCode, Copy, Check, Crown, Loader2, Tag } from "lucide-react";
import qrisAsset from "@/assets/qris.png.asset.json";
import {
  PLANS, formatIDR, createOrder, type PlanId, type OrderRecord,
} from "@/lib/aurora-store";
import { getDiscount, isDiscountValid, discountAppliesToPlan, discountAppliesToGroup, applyDiscount, setUserGroupId } from "@/lib/discounts-store";

export const Route = createFileRoute("/store/order")({
  validateSearch: (s: Record<string, unknown>) => ({
    plan: (s.plan as PlanId) ?? "quarterly",
    discount: typeof s.discount === "string" ? (s.discount as string) : undefined,
    group: typeof s.group === "string" ? (s.group as string) : undefined,
  }),
  component: OrderPage,
});

function OrderPage() {
  const { plan: initial, discount: discountId, group: groupId } = Route.useSearch();
  const [planId, setPlanId] = useState<PlanId>(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const plan = useMemo(() => PLANS.find((p) => p.id === planId)!, [planId]);

  // Validate the discount against the current plan/group. If the user swaps
  // to a plan the discount doesn't cover, we quietly drop it.
  const activeDiscount = useMemo(() => {
    if (!discountId) return null;
    const d = getDiscount(discountId);
    if (!d) return null;
    if (!isDiscountValid(d)) return null;
    if (!discountAppliesToPlan(d, planId)) return null;
    if (!discountAppliesToGroup(d, groupId ?? null)) return null;
    return d;
  }, [discountId, planId, groupId]);

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

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan picker */}
        <div className="md:col-span-2 rounded-2xl bg-card border border-border p-4">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Plan</label>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {PLANS.map((p) => (
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
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5">
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

function OrderReceipt({
  order, copied, setCopied,
}: { order: OrderRecord; copied: boolean; setCopied: (v: boolean) => void }) {
  const plan = PLANS.find((p) => p.id === order.planId)!;

  function copySerial() {
    navigator.clipboard.writeText(order.serial);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const waText = encodeURIComponent(
    `Halo Aurora Master 👋\n\nSaya sudah order Noble Smart Voice:\n• Order: ${order.id.slice(0, 8)}\n• Serial: ${order.serial}\n• Plan: ${plan.name} — ${formatIDR(order.priceIDR)}\n\nBerikut bukti transfer QRIS saya. Mohon aktifkan serial saya. Terima kasih!`,
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/40 p-6 text-center">
        <Crown className="mx-auto text-primary mb-2" size={32} />
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-serif, serif)" }}>
          Order Created
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan the QRIS below and complete the transfer of <b className="text-primary">{formatIDR(order.priceIDR)}</b>.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <QrCode size={14} /> QRIS Payment
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

        <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Your Serial Number</div>
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
              Keep this serial safe. It becomes active after our admin confirms your payment.
            </p>
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

          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="block text-center rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold"
          >
            Send Proof via WhatsApp
          </a>
          <Link
            to="/"
            className="block text-center rounded-full border border-border py-3 text-sm font-semibold hover:bg-secondary"
          >
            Open Noble App
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-card border border-border p-4 text-xs text-muted-foreground">
        Next steps: after we confirm your QRIS payment, your serial is marked <b>Delivered</b>.
        Open Noble → <b>Activate Premium</b> → paste your serial. If you have questions,
        contact us via WhatsApp.
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
