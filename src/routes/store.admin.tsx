import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Lock, LogOut, ShieldCheck, Search, Trash2, CheckCircle2, Send,
  KeyRound, Download, Copy, Check, RefreshCw, TrendingUp, Users, Megaphone,
  AlertTriangle, Mail,
} from "lucide-react";
import {
  useOrders, useAdmin, adminLogin, adminLogout, setAdminPassword, getAdminPassword,
  markPaid, markDelivered, cancelOrder, deleteOrder, generateSerial, verifySerial,
  formatIDR, statusLabel, type OrderRecord, type OrderStatus, PLANS, type PlanId,
} from "@/lib/aurora-store";
import { PLUGIN_REGISTRY } from "@/lib/plugins";

export const Route = createFileRoute("/store/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — AURORA MASTER" }] }),
  component: AdminPage,
});

function AdminPage() {
  const ok = useAdmin();
  if (!ok) return <AdminLogin />;
  return <AdminDashboard />;
}

function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!adminLogin(pw)) setErr("Incorrect password");
  }
  return (
    <div className="max-w-sm mx-auto mt-16 rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="text-primary" size={20} />
        <h1 className="text-xl font-semibold">Admin Login</h1>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Admin password"
          className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold"
        >
          Sign in
        </button>
        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Default password: <code className="font-mono">AURORA-ADMIN</code> — change it after login.
        </p>
      </form>
    </div>
  );
}

function AdminDashboard() {
  const orders = useOrders();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [tab, setTab] = useState<"orders" | "analytics" | "customers" | "tools" | "settings">("orders");

  const filtered = useMemo(() => {
    const qs = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!qs) return true;
      return (
        o.serial.toLowerCase().includes(qs) ||
        o.buyer.name.toLowerCase().includes(qs) ||
        o.buyer.email.toLowerCase().includes(qs) ||
        o.buyer.whatsapp.toLowerCase().includes(qs) ||
        o.id.toLowerCase().includes(qs)
      );
    });
  }, [orders, q, filter]);

  const stats = useMemo(() => {
    const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "delivered");
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      revenue: paidOrders.reduce((s, o) => s + o.priceIDR, 0),
      delivered: orders.filter((o) => o.status === "delivered").length,
    };
  }, [orders]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" size={22} />
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-serif, serif)" }}>
            Admin Dashboard
          </h1>
        </div>
        <button
          onClick={adminLogout}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total Orders" value={String(stats.total)} />
        <Stat label="Pending" value={String(stats.pending)} />
        <Stat label="Delivered" value={String(stats.delivered)} />
        <Stat label="Revenue (paid)" value={formatIDR(stats.revenue)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-4">
        {(["orders", "analytics", "customers", "tools", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize border-b-2 transition ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <>
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-card border border-border px-3">
              <Search size={14} className="text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search serial, name, email, WhatsApp…"
                className="flex-1 bg-transparent py-2 text-sm outline-none"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded-xl bg-card border border-border px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">
              No orders match. Orders placed on this device will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "analytics" && <AnalyticsTab />}
      {tab === "customers" && <CustomersTab />}
      {tab === "tools" && <ToolsTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function OrderRow({ order }: { order: OrderRecord }) {
  const plan = PLANS.find((p) => p.id === order.planId);
  const [expanded, setExpanded] = useState(false);
  const [ref, setRef] = useState("");
  const [copied, setCopied] = useState(false);

  function copySerial() {
    navigator.clipboard.writeText(order.serial);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const waText = encodeURIComponent(
    `Halo ${order.buyer.name} 👋\n\nTerima kasih sudah order Noble Smart Voice — ${plan?.name}.\n\nSerial Number:\n${order.serial}\n\nCara aktivasi: buka aplikasi Noble → Activate Premium → paste serial di atas.\n\nSalam,\nAURORA MASTER`,
  );
  const waHref = order.buyer.whatsapp
    ? `https://wa.me/${order.buyer.whatsapp.replace(/\D/g, "")}?text=${waText}`
    : `https://wa.me/?text=${waText}`;

  const statusColor: Record<OrderStatus, string> = {
    pending: "bg-yellow-500/20 text-yellow-500",
    paid: "bg-blue-500/20 text-blue-400",
    delivered: "bg-primary/20 text-primary",
    cancelled: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="rounded-2xl bg-card border border-border">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{order.buyer.name}</span>
            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${statusColor[order.status]}`}>
              {statusLabel(order.status, "en")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
            {order.serial}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-primary">{formatIDR(order.priceIDR)}</div>
          <div className="text-[10px] text-muted-foreground">{plan?.name}</div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Info label="Order ID" value={order.id.slice(0, 8).toUpperCase()} />
            <Info label="Created" value={new Date(order.createdAt).toLocaleString()} />
            <Info label="Email" value={order.buyer.email || "—"} />
            <Info label="WhatsApp" value={order.buyer.whatsapp || "—"} />
            {order.buyer.note && <Info label="Note" value={order.buyer.note} full />}
            {order.paymentRef && <Info label="Payment ref" value={order.paymentRef} full />}
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-xs font-mono">
              {order.serial}
            </code>
            <button
              onClick={copySerial}
              className="rounded-lg border border-border p-2 hover:bg-secondary"
              aria-label="Copy serial"
            >
              {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
            </button>
          </div>

          {order.status === "pending" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Payment ref (last 4, note…)"
                className="flex-1 min-w-40 rounded-lg bg-secondary px-3 py-2 text-xs outline-none"
              />
              <button
                onClick={() => markPaid(order.id, ref || undefined)}
                className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 text-blue-400 px-3 py-1.5 text-xs font-semibold"
              >
                <CheckCircle2 size={14} /> Mark Paid
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {order.status === "paid" && (
              <button
                onClick={() => markDelivered(order.id)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/20 text-primary px-3 py-1.5 text-xs font-semibold"
              >
                <CheckCircle2 size={14} /> Mark Delivered
              </button>
            )}
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80"
            >
              <Send size={14} /> Send Serial via WA
            </a>
            {order.status !== "cancelled" && order.status !== "delivered" && (
              <button
                onClick={() => cancelOrder(order.id)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Delete this order permanently?")) deleteOrder(order.id);
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-destructive/20 text-destructive px-3 py-1.5 text-xs font-semibold"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xs font-medium break-all">{value}</div>
    </div>
  );
}

function ToolsTab() {
  const [serial, setSerial] = useState(generateSerial());
  const [check, setCheck] = useState("");
  const orders = useOrders();

  function exportCSV() {
    const rows = [
      ["id", "serial", "status", "plan", "amount", "name", "email", "whatsapp", "created", "paid", "delivered", "note"].join(","),
      ...orders.map((o) =>
        [
          o.id, o.serial, o.status, o.planId, o.priceIDR,
          `"${o.buyer.name}"`, o.buyer.email, o.buyer.whatsapp,
          new Date(o.createdAt).toISOString(),
          o.paidAt ? new Date(o.paidAt).toISOString() : "",
          o.deliveredAt ? new Date(o.deliveredAt).toISOString() : "",
          `"${(o.buyer.note ?? "").replace(/"/g, "'")}"`,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurora-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const checkResult = check.trim() ? verifySerial(check) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={16} className="text-primary" />
          <h3 className="font-semibold">Generate Serial</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          For hand-issued licenses (giveaways, resellers) — not tied to an order record.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-mono">{serial}</code>
          <button
            onClick={() => setSerial(generateSerial())}
            className="rounded-lg border border-border p-2 hover:bg-secondary"
            aria-label="Regenerate"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(serial)}
            className="rounded-lg border border-border p-2 hover:bg-secondary"
            aria-label="Copy"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={16} className="text-primary" />
          <h3 className="font-semibold">Verify Serial</h3>
        </div>
        <input
          value={check}
          onChange={(e) => setCheck(e.target.value.toUpperCase())}
          placeholder="NBL-202607-XXXX-XX"
          className="w-full rounded-lg bg-secondary px-3 py-2 text-sm font-mono outline-none"
        />
        {checkResult !== null && (
          <p className={`mt-2 text-xs ${checkResult ? "text-primary" : "text-destructive"}`}>
            {checkResult ? "✓ Checksum valid" : "✗ Invalid checksum"}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Download size={16} className="text-primary" />
          <h3 className="font-semibold">Export Orders</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Download every order as CSV for bookkeeping or backup.
        </p>
        <button
          onClick={exportCSV}
          disabled={orders.length === 0}
          className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold disabled:opacity-60"
        >
          Download CSV ({orders.length})
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 md:col-span-2">
        <h3 className="font-semibold mb-2">Plugin Registry</h3>
        <p className="text-xs text-muted-foreground mb-3">
          These plugins are included with every Premium plan. Users can toggle them per device at{" "}
          <code>/admin</code> inside the app.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {PLUGIN_REGISTRY.map((p) => (
            <div key={p.id} className="rounded-lg bg-secondary/50 p-3">
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{p.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const orders = useOrders();
  const now = Date.now();
  const DAY = 86400_000;

  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "delivered");

  const byPlan = PLANS.map((p) => {
    const os = paidOrders.filter((o) => o.planId === p.id);
    return { plan: p, count: os.length, revenue: os.reduce((s, o) => s + o.priceIDR, 0) };
  });
  const maxRev = Math.max(1, ...byPlan.map((b) => b.revenue));

  const windowStats = (days: number) => {
    const cutoff = now - days * DAY;
    const os = paidOrders.filter((o) => (o.paidAt ?? o.createdAt) >= cutoff);
    return { count: os.length, revenue: os.reduce((s, o) => s + o.priceIDR, 0) };
  };
  const s7 = windowStats(7);
  const s30 = windowStats(30);
  const s90 = windowStats(90);

  // Daily revenue for last 14 days sparkline
  const buckets: { label: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now - i * DAY);
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + DAY;
    const rev = paidOrders
      .filter((o) => {
        const t = o.paidAt ?? o.createdAt;
        return t >= start.getTime() && t < end;
      })
      .reduce((s, o) => s + o.priceIDR, 0);
    buckets.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, revenue: rev });
  }
  const maxDay = Math.max(1, ...buckets.map((b) => b.revenue));

  const conversion = orders.length ? Math.round((paidOrders.length / orders.length) * 100) : 0;
  const avgTicket = paidOrders.length ? Math.round(paidOrders.reduce((s, o) => s + o.priceIDR, 0) / paidOrders.length) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Revenue · 7d" value={formatIDR(s7.revenue)} />
        <Stat label="Revenue · 30d" value={formatIDR(s30.revenue)} />
        <Stat label="Revenue · 90d" value={formatIDR(s90.revenue)} />
        <Stat label="Avg. Order" value={formatIDR(avgTicket)} />
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-primary" />
          <h3 className="font-semibold">Daily revenue · last 14 days</h3>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {buckets.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors"
                style={{ height: `${(b.revenue / maxDay) * 100}%`, minHeight: b.revenue > 0 ? 2 : 0 }}
                title={formatIDR(b.revenue)}
              />
              <span className="text-[9px] text-muted-foreground">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <h3 className="font-semibold mb-3">Revenue by plan</h3>
        <div className="space-y-2">
          {byPlan.map((b) => (
            <div key={b.plan.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{b.plan.name}</span>
                <span className="text-muted-foreground">
                  {b.count} × · <span className="text-primary font-semibold">{formatIDR(b.revenue)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(b.revenue / maxRev) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Stat label="Conversion" value={`${conversion}%`} />
        <Stat label="Paid Customers" value={String(paidOrders.length)} />
      </div>
    </div>
  );
}

interface CustomerAgg {
  key: string;
  name: string;
  email: string;
  whatsapp: string;
  orders: number;
  spent: number;
  lastAt: number;
  lastStatus: OrderStatus;
}

function CustomersTab() {
  const orders = useOrders();
  const [q, setQ] = useState("");

  const customers = useMemo(() => {
    const map = new Map<string, CustomerAgg>();
    for (const o of orders) {
      const key = (o.buyer.email || o.buyer.whatsapp || o.buyer.name).toLowerCase();
      const spent = o.status === "paid" || o.status === "delivered" ? o.priceIDR : 0;
      const prev = map.get(key);
      if (prev) {
        prev.orders += 1;
        prev.spent += spent;
        if (o.createdAt > prev.lastAt) {
          prev.lastAt = o.createdAt;
          prev.lastStatus = o.status;
        }
      } else {
        map.set(key, {
          key,
          name: o.buyer.name,
          email: o.buyer.email,
          whatsapp: o.buyer.whatsapp,
          orders: 1,
          spent,
          lastAt: o.createdAt,
          lastStatus: o.status,
        });
      }
    }
    const all = Array.from(map.values()).sort((a, b) => b.spent - a.spent || b.lastAt - a.lastAt);
    const qs = q.trim().toLowerCase();
    if (!qs) return all;
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(qs) ||
        c.email.toLowerCase().includes(qs) ||
        c.whatsapp.toLowerCase().includes(qs),
    );
  }, [orders, q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-3">
        <Search size={14} className="text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers…"
          className="flex-1 bg-transparent py-2 text-sm outline-none"
        />
      </div>

      {customers.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">
          No customers yet.
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
            <span>Customer</span>
            <span className="text-right">Orders</span>
            <span className="text-right">Spent</span>
          </div>
          {customers.map((c) => (
            <div
              key={c.key}
              className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 border-b border-border last:border-0 items-center"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.email || "—"} {c.whatsapp && `· ${c.whatsapp}`}
                </div>
              </div>
              <div className="text-sm text-right">{c.orders}</div>
              <div className="text-sm font-bold text-primary text-right">{formatIDR(c.spent)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const [newPw, setNewPw] = useState("");
  const [saved, setSaved] = useState(false);
  const current = getAdminPassword();

  function save() {
    if (!newPw.trim()) return;
    setAdminPassword(newPw.trim());
    setNewPw("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4">
        <h3 className="font-semibold mb-2">Admin password</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Current: <code className="font-mono">{current}</code>. Change it now if you're still on the default.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password"
            className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={save}
            className="rounded-full bg-primary text-primary-foreground px-4 text-xs font-semibold"
          >
            Save
          </button>
        </div>
        {saved && <p className="text-xs text-primary mt-2">Updated.</p>}
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Note on storage</p>
        <p>
          Orders and admin credentials are stored in your browser's local storage on this device.
          To share the dashboard across devices, plug in Lovable Cloud (Supabase) and migrate
          <code className="font-mono"> aurora-store.ts</code> to server-backed reads.
        </p>
      </div>
    </div>
  );
}
