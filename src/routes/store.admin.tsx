import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Lock, LogOut, ShieldCheck, Search, Trash2, CheckCircle2, Send,
  Download, Copy, Check, RefreshCw, TrendingUp, Users, Megaphone,
  AlertTriangle, Mail, Tag, Percent, Plus, Pencil, X, KeyRound,
} from "lucide-react";
import {
  useOrders, useAdmin, adminLogin, adminLogout, getAdminSessionPassword,
  markPaid, markDelivered, cancelOrder, deleteOrder, generateSerialPreview, verifySerial,
  wipeAllOrders, formatIDR, statusLabel, type OrderRecord, type OrderStatus, PLANS, type PlanId,
} from "@/lib/aurora-store";
import {
  useAdminDiscounts, useAdminGroups, upsertDiscount, deleteDiscount, upsertGroup, deleteGroup,
  type Discount, type DiscountKind, type CustomerGroup,
} from "@/lib/discounts-store";
import { PLUGIN_REGISTRY } from "@/lib/plugins";
import { requestStoreAdminReset, resetStoreAdminPassword } from "@/lib/store-admin.functions";

export const Route = createFileRoute("/store/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — AURORA MASTER" }] }),
  component: AdminPage,
});

function AdminPage() {
  const ok = useAdmin();
  const [pw, setPw] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setPw(getAdminSessionPassword());
    sync();
    window.addEventListener("aurora:store", sync);
    return () => window.removeEventListener("aurora:store", sync);
  }, []);
  if (!ok || !pw) return <AdminLogin />;
  return <AdminDashboard adminPassword={pw} />;
}

function AdminLogin() {
  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setChecking(true);
    const ok = await adminLogin(userId, pw);
    setChecking(false);
    if (!ok) setErr("UserID atau PIN salah");
  }

  if (forgot) return <ForgotPassword onDone={() => setForgot(false)} />;

  return (
    <div className="max-w-sm mx-auto mt-16 rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="text-primary" size={20} />
        <h1 className="text-xl font-semibold">Admin Login</h1>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="UserID"
          autoCapitalize="none"
          className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none"
        />
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pw}
          onChange={(e) => setPw(e.target.value.replace(/\D/g, ""))}
          placeholder="PIN 6 angka"
          className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none tracking-[0.4em]"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button
          type="submit"
          disabled={checking || !userId.trim() || pw.length !== 6}
          className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50"
        >
          {checking ? "Checking…" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => setForgot(true)}
          className="w-full text-xs text-muted-foreground underline pt-1"
        >
          Lupa PIN?
        </button>
      </form>
    </div>
  );
}

// Two-step reset: an emailed 6-digit code, then a new password. The code is
// only ever sent to the configured admin email — entering any other address
// silently does nothing, so this form can't be used to fish for it.
function ForgotPassword({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await requestStoreAdminReset({ data: { email } });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    setNote("Jika email tersebut terdaftar sebagai admin, kode reset sudah dikirim. Berlaku 15 menit.");
    setStep("code");
  }

  async function applyReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await resetStoreAdminPassword({ data: { code, newPassword: newPw } });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    const ok = await adminLogin(newPw);
    if (!ok) {
      setNote("PIN berhasil diubah. Silakan masuk dengan PIN baru.");
      onDone();
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="text-primary" size={20} />
        <h1 className="text-xl font-semibold">Reset PIN</h1>
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Masukkan email admin. Kami akan mengirim kode 6 digit untuk mengatur ulang PIN.
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@email.com"
            className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none"
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Mengirim…" : "Kirim kode"}
          </button>
        </form>
      ) : (
        <form onSubmit={applyReset} className="space-y-3">
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Kode 6 digit"
            className="w-full rounded-xl bg-secondary px-4 py-3 text-sm tracking-[0.4em] text-center outline-none"
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value.replace(/\D/g, ""))}
            placeholder="PIN baru (6 angka)"
            className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none"
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={busy || code.length !== 6 || newPw.length !== 6}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Menyimpan…" : "Simpan PIN baru"}
          </button>
        </form>
      )}

      <button onClick={onDone} className="w-full text-xs text-muted-foreground underline pt-4">
        Kembali ke login
      </button>
    </div>
  );
}


function AdminDashboard({ adminPassword }: { adminPassword: string }) {
  const orders = useOrders(adminPassword);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [tab, setTab] = useState<"orders" | "analytics" | "customers" | "discounts" | "tools" | "settings">("orders");

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
      <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
        {(["orders", "analytics", "customers", "discounts", "tools", "settings"] as const).map((tKey) => (
          <button
            key={tKey}
            onClick={() => setTab(tKey)}
            className={`px-4 py-2 text-sm capitalize border-b-2 transition shrink-0 ${
              tab === tKey
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tKey}
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
              No orders match. Every order — from any device — appears here.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((o) => (
                <OrderRow key={o.id} order={o} adminPassword={adminPassword} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "analytics" && <AnalyticsTab orders={orders} />}
      {tab === "customers" && <CustomersTab orders={orders} />}
      {tab === "discounts" && <DiscountsTab adminPassword={adminPassword} />}
      {tab === "tools" && <ToolsTab orders={orders} adminPassword={adminPassword} />}
      {tab === "settings" && <SettingsTab orders={orders} adminPassword={adminPassword} />}
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

function OrderRow({ order, adminPassword }: { order: OrderRecord; adminPassword: string }) {
  const plan = PLANS.find((p) => p.id === order.planId);
  const [expanded, setExpanded] = useState(false);
  const [ref, setRef] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function copySerial() {
    navigator.clipboard.writeText(order.serial);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setActionError(null);
    const res = await action();
    setBusy(false);
    if (!res.ok) setActionError(res.error ?? "Action failed.");
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
                disabled={busy}
                onClick={() => run(() => markPaid(order.id, adminPassword, ref || undefined))}
                className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 text-blue-400 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Mark Paid
              </button>
            </div>
          )}
          {order.status === "pending" && (
            <p className="text-[11px] text-muted-foreground">
              Marking this Paid also issues a real, redeemable voucher — the buyer's serial becomes
              usable at Noble's Activate page right away.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {order.status === "paid" && (
              <button
                disabled={busy}
                onClick={() => run(() => markDelivered(order.id, adminPassword))}
                className="inline-flex items-center gap-1 rounded-full bg-primary/20 text-primary px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
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
                disabled={busy}
                onClick={() => run(() => cancelOrder(order.id, adminPassword))}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("Delete this order permanently?")) run(() => deleteOrder(order.id, adminPassword));
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-destructive/20 text-destructive px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>

          {actionError && <p className="text-xs text-destructive">{actionError}</p>}
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

function ToolsTab({ orders, adminPassword }: { orders: OrderRecord[]; adminPassword: string }) {
  const [serial, setSerial] = useState(generateSerialPreview());
  const [check, setCheck] = useState("");
  const [checkResult, setCheckResult] = useState<{ found: boolean; order: OrderRecord | null } | null>(null);
  const [checking, setChecking] = useState(false);

  async function runCheck() {
    if (!check.trim()) return;
    setChecking(true);
    const res = await verifySerial(check.trim(), adminPassword);
    setChecking(false);
    if (res.ok) setCheckResult({ found: !!res.order, order: res.order });
    else setCheckResult({ found: false, order: null });
  }

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={16} className="text-primary" />
          <h3 className="font-semibold">Generate Serial (preview)</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          For hand-issued licenses (giveaways, resellers). This only formats a string — issue it as a
          real voucher via Supabase (see the example in <code className="font-mono">noble_vouchers.sql</code>)
          for it to actually activate anything.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-mono">{serial}</code>
          <button
            onClick={() => setSerial(generateSerialPreview())}
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
        <div className="flex gap-2">
          <input
            value={check}
            onChange={(e) => { setCheck(e.target.value.toUpperCase()); setCheckResult(null); }}
            onKeyDown={(e) => e.key === "Enter" && runCheck()}
            placeholder="NBL-202607-XXXX-XX"
            className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-mono outline-none"
          />
          <button
            onClick={runCheck}
            disabled={checking || !check.trim()}
            className="rounded-lg bg-primary text-primary-foreground px-3 text-xs font-semibold disabled:opacity-50"
          >
            {checking ? "…" : "Check"}
          </button>
        </div>
        {checkResult && (
          <div className="mt-2 text-xs">
            {checkResult.found && checkResult.order ? (
              <p className="text-primary">
                ✓ Found — {checkResult.order.buyer.name}, {statusLabel(checkResult.order.status, "en")}
              </p>
            ) : (
              <p className="text-destructive">✗ No matching order found.</p>
            )}
          </div>
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

function AnalyticsTab({ orders }: { orders: OrderRecord[] }) {
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
    const os = paidOrders.filter((o) => (o.paidAt ? new Date(o.paidAt).getTime() : new Date(o.createdAt).getTime()) >= cutoff);
    return { count: os.length, revenue: os.reduce((s, o) => s + o.priceIDR, 0) };
  };
  const s7 = windowStats(7);
  const s30 = windowStats(30);
  const s90 = windowStats(90);

  const buckets: { label: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now - i * DAY);
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + DAY;
    const rev = paidOrders
      .filter((o) => {
        const t = o.paidAt ? new Date(o.paidAt).getTime() : new Date(o.createdAt).getTime();
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

function CustomersTab({ orders }: { orders: OrderRecord[] }) {
  const [q, setQ] = useState("");

  const customers = useMemo(() => {
    const map = new Map<string, CustomerAgg>();
    for (const o of orders) {
      const key = (o.buyer.email || o.buyer.whatsapp || o.buyer.name).toLowerCase();
      const spent = o.status === "paid" || o.status === "delivered" ? o.priceIDR : 0;
      const createdAtMs = new Date(o.createdAt).getTime();
      const prev = map.get(key);
      if (prev) {
        prev.orders += 1;
        prev.spent += spent;
        if (createdAtMs > prev.lastAt) {
          prev.lastAt = createdAtMs;
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
          lastAt: createdAtMs,
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

function SettingsTab({ orders, adminPassword }: { orders: OrderRecord[]; adminPassword: string }) {
  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4">
        <h3 className="font-semibold mb-2">Admin access</h3>
        <p className="text-xs text-muted-foreground">
          Login memakai UserID <code className="font-mono">Noble888</code> + PIN 6 angka. PIN bisa
          direset lewat &ldquo;Lupa PIN?&rdquo; di layar login (kode dikirim ke email admin).
        </p>
      </div>

      <BroadcastCard orders={orders} />

      <DangerZone orders={orders} adminPassword={adminPassword} />

      <div className="rounded-2xl bg-card border border-border p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Note on storage</p>
        <p>
          Orders now live in Supabase (<code className="font-mono">store_orders</code>) — shared across
          every device, admin included. Marking an order Paid also issues a real voucher in{" "}
          <code className="font-mono">noble_vouchers</code>, so the buyer's serial works immediately at
          Noble's Activate page.
        </p>
      </div>
    </div>
  );
}

function BroadcastCard({ orders }: { orders: OrderRecord[] }) {
  const [audience, setAudience] = useState<"all" | OrderStatus | PlanId>("all");
  const [msg, setMsg] = useState(
    "Halo {name} 👋\n\nSalam dari AURORA MASTER — kami ingin memberi info terbaru tentang Noble Smart Voice.\n\nTerima kasih!",
  );

  const recipients = useMemo(() => {
    const seen = new Set<string>();
    const list: OrderRecord[] = [];
    for (const o of orders) {
      if (!o.buyer.whatsapp) continue;
      const key = o.buyer.whatsapp.replace(/\D/g, "");
      if (seen.has(key)) continue;
      if (audience === "all") {
        // ok
      } else if (["pending", "paid", "delivered", "cancelled"].includes(audience)) {
        if (o.status !== audience) continue;
      } else {
        if (o.planId !== audience) continue;
      }
      seen.add(key);
      list.push(o);
    }
    return list;
  }, [orders, audience]);

  function openFirst() {
    if (recipients.length === 0) return;
    for (const r of recipients) {
      const text = encodeURIComponent(msg.replace(/\{name\}/g, r.buyer.name).replace(/\{serial\}/g, r.serial));
      const url = `https://wa.me/${r.buyer.whatsapp.replace(/\D/g, "")}?text=${text}`;
      window.open(url, "_blank", "noopener");
    }
  }

  function mailtoAll() {
    const emails = Array.from(
      new Set(orders.filter((o) => o.buyer.email).map((o) => o.buyer.email)),
    ).join(",");
    if (!emails) return;
    const subject = encodeURIComponent("Update from AURORA MASTER — Noble Smart Voice");
    const body = encodeURIComponent(msg.replace(/\{name\}/g, "").replace(/\{serial\}/g, ""));
    window.location.href = `mailto:?bcc=${emails}&subject=${subject}&body=${body}`;
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone size={16} className="text-primary" />
        <h3 className="font-semibold">Broadcast to customers</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Use tokens <code className="font-mono">{"{name}"}</code> and{" "}
        <code className="font-mono">{"{serial}"}</code>. WhatsApp opens one tab per recipient — allow popups.
      </p>
      <div className="space-y-2">
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as typeof audience)}
          className="w-full rounded-lg bg-secondary px-3 py-2 text-sm"
        >
          <option value="all">All customers ({new Set(orders.map((o) => o.buyer.whatsapp)).size})</option>
          <option value="pending">Pending payment</option>
          <option value="paid">Paid</option>
          <option value="delivered">Delivered</option>
          {PLANS.map((p) => (
            <option key={p.id} value={p.id}>Plan · {p.name}</option>
          ))}
        </select>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={5}
          className="w-full rounded-lg bg-secondary px-3 py-2 text-sm outline-none font-mono"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users size={12} /> {recipients.length} WA recipients
          </span>
          <div className="flex gap-2">
            <button
              onClick={mailtoAll}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
            >
              <Mail size={12} /> Email all
            </button>
            <button
              onClick={openFirst}
              disabled={recipients.length === 0}
              className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              <Send size={12} /> Send via WA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DangerZone({ orders, adminPassword }: { orders: OrderRecord[]; adminPassword: string }) {
  const [confirmText, setConfirmText] = useState("");
  const [wiping, setWiping] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function wipeAll() {
    if (confirmText !== "DELETE") return;
    if (!confirm(`Permanently delete all ${orders.length} orders? This cannot be undone.`)) return;
    setWiping(true);
    setErr(null);
    const res = await wipeAllOrders(adminPassword);
    setWiping(false);
    if (!res.ok) setErr(res.error);
    else setConfirmText("");
  }

  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className="text-destructive" />
        <h3 className="font-semibold text-destructive">Danger zone</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Wipe every order (all devices). Type <code className="font-mono">DELETE</code> to enable.
      </p>
      <div className="flex gap-2">
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={wipeAll}
          disabled={confirmText !== "DELETE" || wiping}
          className="rounded-full bg-destructive text-destructive-foreground px-4 text-xs font-semibold disabled:opacity-40"
        >
          {wiping ? "Wiping…" : "Wipe all"}
        </button>
      </div>
      {err && <p className="text-xs text-destructive mt-2">{err}</p>}
    </div>
  );
}

// ————————— Discounts & Groups (still local-only — flagged separately) —————————
function DiscountsTab({ adminPassword }: { adminPassword: string }) {
  const discounts = useAdminDiscounts(adminPassword);
  const groups = useAdminGroups(adminPassword);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6">
      {/* Groups */}
      <section className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <h3 className="font-semibold">Customer Groups</h3>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Groups let you target discounts to specific customer segments (e.g. Early Bird, Reseller, VIP).
          Users type the <b>code</b> on the Upgrade page to join.
        </p>
        <GroupEditor adminPassword={adminPassword} />
        {groups.length > 0 && (
          <ul className="mt-3 divide-y divide-border border border-border rounded-xl">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{g.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{g.code}</div>
                </div>
                <button
                  onClick={() => confirm(`Delete group "${g.name}"?`) && deleteGroup(g.id, adminPassword)}
                  className="text-destructive p-1"
                  aria-label="Delete group"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Discounts */}
      <section className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-primary" />
            <h3 className="font-semibold">Discounts</h3>
          </div>
          <button
            onClick={() => { setEditing(null); setShowNew(true); }}
            className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold"
          >
            <Plus size={12} /> New Discount
          </button>
        </div>

        {discounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No discounts yet. Create one to offer per-plan pricing, group-exclusive deals, or time-limited promos.
          </p>
        ) : (
          <ul className="space-y-2">
            {discounts.map((d) => (
              <DiscountRow
                key={d.id}
                discount={d}
                groups={groups}
                adminPassword={adminPassword}
                onEdit={() => { setEditing(d); setShowNew(true); }}
              />
            ))}
          </ul>
        )}

        {showNew && (
          <DiscountEditor
            initial={editing}
            groups={groups}
            adminPassword={adminPassword}
            onClose={() => { setShowNew(false); setEditing(null); }}
          />
        )}
      </section>
    </div>
  );
}

function GroupEditor({ adminPassword }: { adminPassword: string }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    await upsertGroup({ name: name.trim(), code: code.trim() }, adminPassword);
    setSaving(false);
    setName(""); setCode("");
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name (e.g. Early Bird)"
        className="rounded-lg bg-secondary px-3 py-2 text-sm outline-none"
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="CODE"
        className="rounded-lg bg-secondary px-3 py-2 text-sm outline-none font-mono tracking-wider"
      />
      <button
        onClick={save}
        disabled={!name.trim() || !code.trim() || saving}
        className="rounded-full bg-primary text-primary-foreground px-4 text-xs font-semibold disabled:opacity-40"
      >
        {saving ? "…" : "Add"}
      </button>
    </div>
  );
}

function DiscountRow({
  discount, groups, adminPassword, onEdit,
}: { discount: Discount; groups: CustomerGroup[]; adminPassword: string; onEdit: () => void }) {
  const planNames = discount.planIds.length === 0
    ? "All plans"
    : discount.planIds.map((id) => PLANS.find((p) => p.id === id)?.name ?? id).join(", ");
  const groupNames = discount.groupIds.length === 0
    ? "Public"
    : discount.groupIds.map((id) => groups.find((g) => g.id === id)?.name ?? "?").join(", ");
  const upgrade = discount.upgradeGroupId
    ? groups.find((g) => g.id === discount.upgradeGroupId)?.name
    : null;
  const validity = [
    discount.validFrom ? `from ${new Date(discount.validFrom).toLocaleDateString()}` : null,
    discount.validUntil ? `until ${new Date(discount.validUntil).toLocaleDateString()}` : null,
  ].filter(Boolean).join(" ") || "no limit";

  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{discount.name}</span>
            <span className="text-[10px] uppercase tracking-widest rounded-full bg-primary/15 text-primary px-2 py-0.5">
              {discount.kind === "percent" ? `${discount.value}% off` : `Fixed ${formatIDR(discount.value)}`}
            </span>
            {!discount.active && (
              <span className="text-[10px] uppercase tracking-widest rounded-full bg-muted text-muted-foreground px-2 py-0.5">
                inactive
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <div>Plans: {planNames}</div>
            <div>Audience: {groupNames}</div>
            {upgrade && <div>Upgrade to group: <b className="text-primary">{upgrade}</b></div>}
            <div>Validity: {validity}</div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-secondary" aria-label="Edit">
            <Pencil size={14} />
          </button>
          <button
            onClick={() => confirm(`Delete discount "${discount.name}"?`) && deleteDiscount(discount.id, adminPassword)}
            className="p-1.5 rounded hover:bg-destructive/20 text-destructive"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}

function DiscountEditor({
  initial, groups, adminPassword, onClose,
}: { initial: Discount | null; groups: CustomerGroup[]; adminPassword: string; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<DiscountKind>(initial?.kind ?? "percent");
  const [value, setValue] = useState<number>(initial?.value ?? 10);
  const [planIds, setPlanIds] = useState<PlanId[]>(initial?.planIds ?? []);
  const [groupIds, setGroupIds] = useState<string[]>(initial?.groupIds ?? []);
  const [upgradeGroupId, setUpgradeGroupId] = useState<string>(initial?.upgradeGroupId ?? "");
  const [validFrom, setValidFrom] = useState<string>(
    initial?.validFrom ? new Date(initial.validFrom).toISOString().slice(0, 10) : "",
  );
  const [validUntil, setValidUntil] = useState<string>(
    initial?.validUntil ? new Date(initial.validUntil).toISOString().slice(0, 10) : "",
  );
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function togglePlan(id: PlanId) {
    setPlanIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleGroup(id: string) {
    setGroupIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setErr(null);
    const res = await upsertDiscount(
      {
        id: initial?.id,
        name: name.trim(),
        kind,
        value: Number(value) || 0,
        planIds,
        groupIds,
        upgradeGroupId: upgradeGroupId || undefined,
        validFrom: validFrom ? new Date(validFrom).getTime() : null,
        validUntil: validUntil ? new Date(validUntil + "T23:59:59").getTime() : null,
        active,
      },
      adminPassword,
    );
    setSaving(false);
    if (!res.ok) { setErr(res.error); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-card border border-border p-5 max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{initial ? "Edit Discount" : "New Discount"}</h3>
          <button onClick={onClose} className="p-1" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-muted-foreground">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Early bird 20%"
              className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-muted-foreground">Type</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as DiscountKind)}
                className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm"
              >
                <option value="percent">Percent off (%)</option>
                <option value="fixed">Fixed final price (IDR)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">
                {kind === "percent" ? "Discount %" : "Final price"}
              </span>
              <div className="mt-1 flex items-center rounded-lg bg-secondary px-3">
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="flex-1 bg-transparent py-2 text-sm outline-none"
                />
                <span className="text-xs text-muted-foreground">
                  {kind === "percent" ? <Percent size={12} /> : "IDR"}
                </span>
              </div>
            </label>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Applies to plans (empty = all)</div>
            <div className="flex flex-wrap gap-1.5">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlan(p.id)}
                  className={`text-xs rounded-full px-3 py-1 border ${
                    planIds.includes(p.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-secondary"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Validity group (empty = public)</div>
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No groups yet — add one above.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`text-xs rounded-full px-3 py-1 border ${
                      groupIds.includes(g.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-secondary"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-xs text-muted-foreground">Upgrade group (after purchase)</span>
            <select
              value={upgradeGroupId}
              onChange={(e) => setUpgradeGroupId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-muted-foreground">Valid from</span>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Valid until</span>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm outline-none"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>

          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-xs">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Create discount"}
          </button>
        </div>
      </div>
    </div>
  );
}
