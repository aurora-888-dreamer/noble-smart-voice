import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Crown } from "lucide-react";
import { formatIDR, createPluginOrder, getPluginPrices, type OrderRecord } from "@/lib/aurora-store";
import { PLUGIN_REGISTRY, type PluginId } from "@/lib/plugins";
import { markOrderPlaced } from "@/lib/auth-store";
import { KomerceCheckout } from "./store.order";

export const Route = createFileRoute("/store/plugin-order")({
  validateSearch: (s: Record<string, unknown>): { plugin?: PluginId } => ({
    plugin: typeof s.plugin === "string" ? (s.plugin as PluginId) : undefined,
  }),
  component: PluginOrderPage,
});

function PluginOrderPage() {
  const { plugin: pluginIdParam } = Route.useSearch();
  const [pluginId, setPluginId] = useState<PluginId | undefined>(pluginIdParam);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPluginPrices().then((r) => { if (r.ok) setPrices(r.prices); });
  }, []);

  const sellablePlugins = PLUGIN_REGISTRY.filter((p) => prices[p.id] != null);
  const selected = PLUGIN_REGISTRY.find((p) => p.id === pluginId);
  const price = pluginId ? prices[pluginId] : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pluginId || price == null) return;
    setSubmitting(true);
    setError(null);
    const res = await createPluginOrder({ data: { pluginId, priceIDR: price, buyer: { name, email, whatsapp } } });
    setSubmitting(false);
    if (!res.ok) { setError(res.error); return; }
    markOrderPlaced();
    setOrder(res.order);
  }

  if (order) {
    return (
      <div className="max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-serif, serif)" }}>Order Created</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selected?.nameId} — {formatIDR(order.priceIDR)}
          </p>
        </div>
        <KomerceCheckout order={order} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-serif, serif)" }}>Beli Plugin</h1>
        <p className="text-sm text-muted-foreground mt-1">Beli satu plugin secara terpisah, tanpa perlu langganan Premium.</p>
      </div>

      {!pluginId ? (
        <div className="space-y-2">
          {sellablePlugins.map((p) => (
            <button
              key={p.id}
              onClick={() => setPluginId(p.id)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:opacity-90"
            >
              <div>
                <p className="text-sm font-semibold">{p.nameId}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.descriptionId}</p>
              </div>
              <span className="text-sm font-bold text-primary shrink-0">{formatIDR(prices[p.id])}</span>
            </button>
          ))}
          {sellablePlugins.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada plugin yang dijual saat ini.</p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{selected?.nameId}</p>
              <p className="text-xs text-muted-foreground">{selected?.descriptionId}</p>
            </div>
            <span className="text-lg font-bold text-primary shrink-0">{price != null ? formatIDR(price) : ""}</span>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm" />
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Nomor WhatsApp" required className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm" />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setPluginId(undefined)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
              ← Ganti
            </button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50">
              {submitting ? "…" : "Buat Order"}
            </button>
          </div>
        </form>
      )}

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Setelah bayar, serial aktivasi plugin dikirim otomatis ke email kamu — atau langsung kelihatan di{" "}
        <Link to="/" className="text-primary underline">Home</Link> untuk diaktivasi 1 klik.
      </p>
    </div>
  );
}
