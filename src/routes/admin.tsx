import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  ArrowLeft,
  Download,
  Loader2,
  LockKeyhole,
  Plus,
  Power,
  RefreshCw,
  Send,
  Ticket,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  adminChangePin,
  adminCreateVoucher,
  adminCreateCreditVoucher,
  adminDeleteCreditPack,
  adminDeletePricePlan,
  adminGrantCredits,
  adminListPricing,
  adminLogin,
  adminOverview,
  adminResetPin,
  adminSaveCreditPack,
  adminSavePricePlan,
  adminSetOrderStatus,
  adminUpdateCreditCosts,
  adminUpdateRates,
  adminUploadQris,
  adminUsageSummary,
  adminUserUsage,
} from "@/lib/admin.functions";
import { fileToDataUrl } from "@/lib/audio";
import { formatIDR } from "@/lib/device";
import { creditVoucherDeliveryUrl, voucherDeliveryUrl } from "@/lib/voucher-delivery";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Magic Talk Admin Dashboard" },
      { name: "description", content: "Manage Magic Talk orders, vouchers, QRIS and user subscriptions." },
      { property: "og:title", content: "Magic Talk Admin Dashboard" },
      { property: "og:description", content: "Orders, vouchers, QRIS and subscription monitoring for Magic Talk." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Overview = Awaited<ReturnType<typeof adminOverview>>;
type UsageSummary = Awaited<ReturnType<typeof adminUsageSummary>>;
type Pricing = Awaited<ReturnType<typeof adminListPricing>>;
type UserUsage = Awaited<ReturnType<typeof adminUserUsage>>;

const card = "rounded-xl border border-border bg-card p-4 shadow-sm";
const label = "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground";
const field =
  "mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

function AdminPage() {
  const login = useServerFn(adminLogin);
  const overviewFn = useServerFn(adminOverview);
  const uploadQris = useServerFn(adminUploadQris);
  const createVoucher = useServerFn(adminCreateVoucher);
  const createCreditVoucher = useServerFn(adminCreateCreditVoucher);
  const setOrderStatus = useServerFn(adminSetOrderStatus);
  const changePin = useServerFn(adminChangePin);
  const resetPin = useServerFn(adminResetPin);
  const usageFn = useServerFn(adminUsageSummary);
  const updateRates = useServerFn(adminUpdateRates);
  const pricingFn = useServerFn(adminListPricing);
  const savePricePlan = useServerFn(adminSavePricePlan);
  const deletePricePlan = useServerFn(adminDeletePricePlan);
  const saveCreditPack = useServerFn(adminSaveCreditPack);
  const deleteCreditPack = useServerFn(adminDeleteCreditPack);
  const updateCreditCosts = useServerFn(adminUpdateCreditCosts);
  const grantCredits = useServerFn(adminGrantCredits);
  const userUsageFn = useServerFn(adminUserUsage);

  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [backupView, setBackupView] = useState<{
    exportedAt: string;
    orders: Overview["orders"];
    usage: UsageSummary["perUser"];
  } | null>(null);
  const prevPendingRef = useRef(0);

  const [rateChat, setRateChat] = useState("0");
  const [rateTranscribe, setRateTranscribe] = useState("0");
  const [rateCaption, setRateCaption] = useState("0");

  const [ccTranscribe, setCcTranscribe] = useState("2");
  const [ccTranslate, setCcTranslate] = useState("2");
  const [ccCaption, setCcCaption] = useState("30");
  const [ccTrial, setCcTrial] = useState("200");

  const [resetEmail, setResetEmail] = useState("");
  const [newPin, setNewPin] = useState("");

  const [voucherPlan, setVoucherPlan] = useState<"monthly" | "yearly">("monthly");
  const [voucherTo, setVoucherTo] = useState("");
  const [creditVoucherAmount, setCreditVoucherAmount] = useState("100");
  const [creditVoucherTo, setCreditVoucherTo] = useState("");

  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [planLabel, setPlanLabel] = useState("");
  const [planMonthly, setPlanMonthly] = useState("10000");
  const [planYearly, setPlanYearly] = useState("100000");
  const [planActive, setPlanActive] = useState(true);
  const [planSort, setPlanSort] = useState("0");

  const [packId, setPackId] = useState<string | undefined>(undefined);
  const [packLabel, setPackLabel] = useState("");
  const [packCredits, setPackCredits] = useState("100");
  const [packAmount, setPackAmount] = useState("15000");
  const [packActive, setPackActive] = useState(true);
  const [packSort, setPackSort] = useState("0");

  const [usersSearch, setUsersSearch] = useState("");
  const [usersSort, setUsersSort] = useState<"credits_used" | "credits_balance" | "last_seen">(
    "credits_used",
  );
  const [usersPage, setUsersPage] = useState(0);
  const [grantAmountByUser, setGrantAmountByUser] = useState<Record<string, string>>({});

  const qrisRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);

  const loadUsers = useCallback(
    async (usePin: string, page = usersPage, search = usersSearch, sort = usersSort) => {
      const res = await userUsageFn({ data: { pin: usePin, search: search || undefined, sort, page, pageSize: 20 } });
      setUserUsage(res);
    },
    [userUsageFn, usersPage, usersSearch, usersSort],
  );

  const refresh = useCallback(
    async (usePin: string) => {
      const [overviewRes, usageRes, pricingRes] = await Promise.all([
        overviewFn({ data: { pin: usePin } }),
        usageFn({ data: { pin: usePin } }),
        pricingFn({ data: { pin: usePin } }),
      ]);
      setData(overviewRes);
      setUsage(usageRes);
      setPricing(pricingRes);
      const pending = overviewRes.orders.filter((o) => o.status === "pending").length;
      setPendingCount(pending);
      prevPendingRef.current = pending;
      setRateChat(String(usageRes.rates.rateChatPer1kTokens));
      setRateTranscribe(String(usageRes.rates.rateTranscribePerMinute));
      setRateCaption(String(usageRes.rates.rateCaptionPerCall));
      setCcTranscribe(String(pricingRes.creditCosts.transcribePerMinute));
      setCcTranslate(String(pricingRes.creditCosts.translatePer1kChars));
      setCcCaption(String(pricingRes.creditCosts.captionPerPicture));
      setCcTrial(String(pricingRes.creditCosts.trialCredits));
      await loadUsers(usePin, 0, "", "credits_used");
    },
    [overviewFn, usageFn, pricingFn, loadUsers],
  );

  async function doLogin() {
    if (!/^\d{6}$/.test(pin)) {
      toast.error("PIN must be 6 digits.");
      return;
    }
    setBusy("Signing in…");
    try {
      await login({ data: { pin } });
      setAuthed(true);
      await refresh(pin);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (authed && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const id = setInterval(async () => {
      try {
        const res = await overviewFn({ data: { pin } });
        const pending = res.orders.filter((o) => o.status === "pending").length;
        if (pending > prevPendingRef.current) {
          const newCount = pending - prevPendingRef.current;
          toast.success(`🔔 ${newCount} new order${newCount > 1 ? "s" : ""} just came in!`);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Magic Talk Admin", {
              body: `${newCount} new order${newCount > 1 ? "s" : ""} waiting to be processed.`,
            });
          }
        }
        prevPendingRef.current = pending;
        setPendingCount(pending);
        setData(res);
      } catch {
        // Non-critical — retry on the next tick.
      }
    }, 25000);
    return () => clearInterval(id);
  }, [authed, pin, overviewFn]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = pendingCount > 0 ? `(${pendingCount}) Magic Talk Admin` : "Magic Talk Admin";
    return () => {
      document.title = "Magic Talk Admin";
    };
  }, [pendingCount]);

  function downloadBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      orders: data?.orders ?? [],
      usage: usage?.perUser ?? [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `magictalk-admin-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded.");
  }

  async function restoreBackup(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed?.orders) || !Array.isArray(parsed?.usage)) {
        throw new Error("This doesn't look like a Magic Talk backup file.");
      }
      setBackupView({
        exportedAt: parsed.exportedAt ?? new Date().toISOString(),
        orders: parsed.orders,
        usage: parsed.usage,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that backup file.");
    }
  }

  async function copyRow(row: unknown) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(row, null, 2));
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  function deleteBackupOrder(id: string) {
    setBackupView((v) => (v ? { ...v, orders: v.orders.filter((o) => o.id !== id) } : v));
  }

  function deleteBackupUsageRow(index: number) {
    setBackupView((v) => (v ? { ...v, usage: v.usage.filter((_, i) => i !== index) } : v));
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Toaster position="top-center" />
        <div className="w-full max-w-sm space-y-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> Back to Magic Talk
          </Link>
          <div className={card}>
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Admin Login</h1>
            </div>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit PIN"
              inputMode="numeric"
              className={`${field} text-center tracking-[0.3em]`}
              onKeyDown={(e) => e.key === "Enter" && void doLogin()}
            />
            <button
              onClick={() => void doLogin()}
              disabled={!!busy}
              className="mt-3 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ?? "Sign in"}
            </button>

            <details className="mt-4">
              <summary className={`${label} cursor-pointer`}>Forgot the PIN?</summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Enter the registered recovery email to reset the PIN to the default (440077).
              </p>
              <input
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="recovery email"
                className={field}
              />
              <button
                onClick={async () => {
                  try {
                    await resetPin({ data: { email: resetEmail.trim() } });
                    toast.success("PIN reset to 440077. Sign in and change it right away.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not reset the PIN.");
                  }
                }}
                className="mt-2 w-full rounded-md border border-border px-4 py-2 text-sm font-medium"
              >
                Reset PIN
              </button>
            </details>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <Toaster position="top-center" />
      <header className="flex items-center justify-between border-b border-border bg-card/70 px-5 py-5">
        <div>
          <h1 className="text-2xl leading-none text-foreground">Admin dashboard</h1>
          <p className="mt-1 text-xs text-muted-foreground">Recovery email: {data?.recoveryEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refresh(pin)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium"
          >
            <Power className="size-4" /> Exit
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        {pendingCount > 0 && (
          <a
            href="#orders"
            className="block animate-pulse rounded-lg border border-destructive bg-destructive/15 px-4 py-3 text-center text-sm font-semibold text-destructive"
          >
            🔔 {pendingCount} new order{pendingCount > 1 ? "s" : ""} waiting to be processed
          </a>
        )}

        <nav className="flex flex-wrap gap-2 rounded-lg border border-border bg-secondary/40 p-2 text-xs">
          <a href="#credit-costs" className="rounded-full border border-border bg-card px-2.5 py-1 font-medium">
            ⚙️ Credit costs
          </a>
          <a href="#price-plans" className="rounded-full border border-border bg-card px-2.5 py-1 font-medium">
            Price plans
          </a>
          <a href="#credit-packs" className="rounded-full border border-border bg-card px-2.5 py-1 font-medium">
            Credit packs
          </a>
          <a href="#orders" className="rounded-full border border-border bg-card px-2.5 py-1 font-medium">
            Orders
          </a>
          <a href="#users" className="rounded-full border border-border bg-card px-2.5 py-1 font-medium">
            Users
          </a>
          <a href="#vouchers" className="rounded-full border border-border bg-card px-2.5 py-1 font-medium">
            Vouchers
          </a>
          <a href="#history-backup" className="rounded-full border border-border bg-card px-2.5 py-1 font-medium">
            History backup
          </a>
        </nav>

        <section className={card}>
          <span className={label}>QRIS image</span>
          <div className="mt-2 flex items-start gap-4">
            {data?.qrisUrl ? (
              <img src={data.qrisUrl} alt="QRIS" className="h-40 w-40 rounded-lg border border-border object-cover" />
            ) : (
              <p className="text-sm text-muted-foreground">No QRIS uploaded yet.</p>
            )}
            <button
              onClick={() => qrisRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium"
            >
              <Upload className="size-4" /> Upload QRIS
            </button>
            <input
              ref={qrisRef}
              type="file"
              accept="image/*"
              className="sr-only absolute size-px opacity-0"
              onChange={(e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                void fileToDataUrl(file)
                  .then(async (dataUrl) => {
                    await uploadQris({ data: { pin, dataUrl } });
                    toast.success("QRIS updated.");
                    await refresh(pin);
                  })
                  .catch((e) => toast.error(e instanceof Error ? e.message : "Upload failed."))
                  .finally(() => {
                    input.value = "";
                  });
              }}
            />
          </div>
        </section>

        <section id="credit-costs" className={card}>
          <span className={label}>⚙️ Credit costs — kredit terpakai per aksi user (di sini settingnya)</span>
          <p className="mt-1 text-xs text-muted-foreground">
            Ini beda dari "Rp cost rates" di bagian API cost tracking (itu estimasi biaya kamu sendiri) — ini adalah
            kredit yang dikurangi dari saldo user tiap kali mereka pakai fitur AI.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Transcribe (kredit/menit)</label>
              <input value={ccTranscribe} onChange={(e) => setCcTranscribe(e.target.value)} className={field} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Translate (kredit/1000 karakter)</label>
              <input value={ccTranslate} onChange={(e) => setCcTranslate(e.target.value)} className={field} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Caption AI (kredit/foto)</label>
              <input value={ccCaption} onChange={(e) => setCcCaption(e.target.value)} className={field} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Kredit gratis untuk user baru (trial)</label>
              <input value={ccTrial} onChange={(e) => setCcTrial(e.target.value)} className={field} />
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await updateCreditCosts({
                  data: {
                    pin,
                    transcribePerMinute: Number(ccTranscribe) || 0,
                    translatePer1kChars: Number(ccTranslate) || 0,
                    captionPerPicture: Number(ccCaption) || 0,
                    trialCredits: Number(ccTrial) || 0,
                  },
                });
                toast.success("Credit costs saved.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not save credit costs.");
              }
            }}
            className="mt-3 w-full rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Save credit costs
          </button>
        </section>

        <section id="price-plans" className={card}>
          <span className={label}>Price plans</span>
          <p className="mt-1 text-xs text-muted-foreground">Normal / Promo / Group, dst — bisa tambah/edit/hapus.</p>
          <div className="mt-2 space-y-2">
            {pricing?.pricePlans.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs">
                <div>
                  <p className="font-medium text-foreground">
                    {p.label} {!p.active && <span className="text-muted-foreground">(inactive)</span>}
                  </p>
                  <p className="text-muted-foreground">
                    {formatIDR(p.monthly_amount)} / bulan · {formatIDR(p.yearly_amount)} / tahun
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setPlanId(p.id);
                      setPlanLabel(p.label);
                      setPlanMonthly(String(p.monthly_amount));
                      setPlanYearly(String(p.yearly_amount));
                      setPlanActive(p.active);
                      setPlanSort(String(p.sort_order));
                    }}
                    className="rounded-md border border-border px-2 py-1 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await deletePricePlan({ data: { pin, id: p.id } });
                        toast.success("Plan deleted.");
                        await refresh(pin);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not delete.");
                      }
                    }}
                    className="rounded-md border border-border p-1 text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <span className={label}>{planId ? "Edit plan" : "Add new plan"}</span>
            <input value={planLabel} onChange={(e) => setPlanLabel(e.target.value)} placeholder="Label (e.g. Promo)" className={field} />
            <div className="grid grid-cols-2 gap-2">
              <input value={planMonthly} onChange={(e) => setPlanMonthly(e.target.value)} placeholder="Monthly price" className={field} />
              <input value={planYearly} onChange={(e) => setPlanYearly(e.target.value)} placeholder="Yearly price" className={field} />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={planActive} onChange={(e) => setPlanActive(e.target.checked)} className="size-4 accent-primary" />
              Active (shown to users)
            </label>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!planLabel.trim()) {
                    toast.error("Label is required.");
                    return;
                  }
                  try {
                    await savePricePlan({
                      data: {
                        pin,
                        ...(planId ? { id: planId } : {}),
                        label: planLabel.trim(),
                        monthly: Number(planMonthly) || 0,
                        yearly: Number(planYearly) || 0,
                        active: planActive,
                        sortOrder: Number(planSort) || 0,
                      },
                    });
                    toast.success("Plan saved.");
                    setPlanId(undefined);
                    setPlanLabel("");
                    await refresh(pin);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not save plan.");
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="size-4" /> {planId ? "Save changes" : "Add plan"}
              </button>
              {planId && (
                <button
                  onClick={() => {
                    setPlanId(undefined);
                    setPlanLabel("");
                    setPlanMonthly("10000");
                    setPlanYearly("100000");
                  }}
                  className="rounded-md border border-border px-3 text-sm font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </section>

        <section id="credit-packs" className={card}>
          <span className={label}>Credit top-up packs</span>
          <p className="mt-1 text-xs text-muted-foreground">100 / 500 / 1000 kredit, dst — harga bisa diedit.</p>
          <div className="mt-2 space-y-2">
            {pricing?.creditPacks.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs">
                <div>
                  <p className="font-medium text-foreground">
                    {p.label} {!p.active && <span className="text-muted-foreground">(inactive)</span>}
                  </p>
                  <p className="text-muted-foreground">
                    {p.credits} kredit · {formatIDR(p.amount)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setPackId(p.id);
                      setPackLabel(p.label);
                      setPackCredits(String(p.credits));
                      setPackAmount(String(p.amount));
                      setPackActive(p.active);
                      setPackSort(String(p.sort_order));
                    }}
                    className="rounded-md border border-border px-2 py-1 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await deleteCreditPack({ data: { pin, id: p.id } });
                        toast.success("Pack deleted.");
                        await refresh(pin);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not delete.");
                      }
                    }}
                    className="rounded-md border border-border p-1 text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <span className={label}>{packId ? "Edit pack" : "Add new pack"}</span>
            <input value={packLabel} onChange={(e) => setPackLabel(e.target.value)} placeholder="Label (e.g. 500 Credits)" className={field} />
            <div className="grid grid-cols-2 gap-2">
              <input value={packCredits} onChange={(e) => setPackCredits(e.target.value)} placeholder="Credits" className={field} />
              <input value={packAmount} onChange={(e) => setPackAmount(e.target.value)} placeholder="Price (Rp)" className={field} />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={packActive} onChange={(e) => setPackActive(e.target.checked)} className="size-4 accent-primary" />
              Active (shown to users)
            </label>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!packLabel.trim()) {
                    toast.error("Label is required.");
                    return;
                  }
                  try {
                    await saveCreditPack({
                      data: {
                        pin,
                        ...(packId ? { id: packId } : {}),
                        label: packLabel.trim(),
                        credits: Number(packCredits) || 0,
                        amount: Number(packAmount) || 0,
                        active: packActive,
                        sortOrder: Number(packSort) || 0,
                      },
                    });
                    toast.success("Pack saved.");
                    setPackId(undefined);
                    setPackLabel("");
                    await refresh(pin);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not save pack.");
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="size-4" /> {packId ? "Save changes" : "Add pack"}
              </button>
              {packId && (
                <button
                  onClick={() => {
                    setPackId(undefined);
                    setPackLabel("");
                    setPackCredits("100");
                    setPackAmount("15000");
                  }}
                  className="rounded-md border border-border px-3 text-sm font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </section>

        <section className={card}>
          <span className={label}>Generate voucher — Subscription</span>
          <div className="mt-2 flex gap-2">
            <select
              value={voucherPlan}
              onChange={(e) => setVoucherPlan(e.target.value as "monthly" | "yearly")}
              className={`${field} mt-0`}
            >
              <option value="monthly">30 Days</option>
              <option value="yearly">1 Year</option>
            </select>
          </div>
          <input
            value={voucherTo}
            onChange={(e) => setVoucherTo(e.target.value)}
            placeholder="Deliver to (WhatsApp or email) — optional"
            className={field}
          />
          <button
            onClick={async () => {
              try {
                const res = await createVoucher({
                  data: {
                    pin,
                    plan: voucherPlan,
                    ...(voucherTo.trim() ? { deliveredTo: voucherTo.trim() } : {}),
                  },
                });
                await refresh(pin);
                toast.success(`Voucher: ${res.code}`);
                const delivery = voucherTo.trim()
                  ? voucherDeliveryUrl(voucherTo.trim(), res.code, voucherPlan)
                  : null;
                if (delivery) {
                  window.open(delivery.url, "_blank");
                  toast.info(`Opened ${delivery.channel === "whatsapp" ? "WhatsApp" : "email"} to send the code.`);
                }
                setVoucherTo("");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not create voucher.");
              }
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Ticket className="size-4" /> Create voucher code
          </button>
        </section>

        <section className={card}>
          <span className={label}>Generate voucher — Credit top-up</span>
          <p className="mt-1 text-xs text-muted-foreground">
            Ini bukan top-up otomatis — customer redeem kode ini di kotak "Have a voucher code?" untuk menambah
            kreditnya.
          </p>
          <input
            value={creditVoucherAmount}
            onChange={(e) => setCreditVoucherAmount(e.target.value)}
            placeholder="Jumlah kredit"
            className={field}
          />
          <input
            value={creditVoucherTo}
            onChange={(e) => setCreditVoucherTo(e.target.value)}
            placeholder="Deliver to (WhatsApp or email) — optional"
            className={field}
          />
          <button
            onClick={async () => {
              const credits = Number(creditVoucherAmount) || 0;
              if (credits <= 0) {
                toast.error("Enter a valid credit amount.");
                return;
              }
              try {
                const res = await createCreditVoucher({
                  data: {
                    pin,
                    credits,
                    ...(creditVoucherTo.trim() ? { deliveredTo: creditVoucherTo.trim() } : {}),
                  },
                });
                await refresh(pin);
                toast.success(`Credit voucher: ${res.code}`);
                const delivery = creditVoucherTo.trim()
                  ? creditVoucherDeliveryUrl(creditVoucherTo.trim(), res.code, credits)
                  : null;
                if (delivery) {
                  window.open(delivery.url, "_blank");
                  toast.info(`Opened ${delivery.channel === "whatsapp" ? "WhatsApp" : "email"} to send the code.`);
                }
                setCreditVoucherTo("");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not create credit voucher.");
              }
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            <Ticket className="size-4" /> Create credit voucher
          </button>
        </section>

        <section id="orders" className={card}>
          <span className={label}>Orders ({data?.orders.length ?? 0})</span>
          <div className="mt-2 space-y-2">
            {data?.orders.map((o) => (
              <div key={o.id} className="rounded-lg border border-border p-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {o.name} · {o.plan === "credits" ? `${o.credits} credits` : o.plan} · {formatIDR(o.amount)}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      o.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : o.status === "rejected"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {o.whatsapp} · {o.email} · {new Date(o.createdAt).toLocaleString()}
                </p>
                {o.receiptUrl && (
                  <a href={o.receiptUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-primary underline">
                    View receipt
                  </a>
                )}
                {o.status === "pending" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        try {
                          if (o.plan === "credits") {
                            const res = await createCreditVoucher({
                              data: { pin, credits: o.credits, deliveredTo: o.whatsapp || o.email, orderId: o.id },
                            });
                            await refresh(pin);
                            toast.success(`Credit voucher for ${o.name}: ${res.code}`);
                            const delivery = creditVoucherDeliveryUrl(o.whatsapp || o.email, res.code, o.credits, o.name);
                            if (delivery) {
                              window.open(delivery.url, "_blank");
                              toast.info(`Opened ${delivery.channel === "whatsapp" ? "WhatsApp" : "email"} to send the code.`);
                            }
                          } else {
                            const plan = o.plan === "yearly" ? "yearly" : "monthly";
                            const res = await createVoucher({
                              data: { pin, plan, deliveredTo: o.whatsapp || o.email, orderId: o.id },
                            });
                            await refresh(pin);
                            toast.success(`Voucher for ${o.name}: ${res.code}`);
                            const delivery = voucherDeliveryUrl(o.whatsapp || o.email, res.code, plan, o.name);
                            if (delivery) {
                              window.open(delivery.url, "_blank");
                              toast.info(`Opened ${delivery.channel === "whatsapp" ? "WhatsApp" : "email"} to send the code.`);
                            }
                          }
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Could not approve order.");
                        }
                      }}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Approve & issue voucher
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await setOrderStatus({ data: { pin, orderId: o.id, status: "rejected" } });
                          await refresh(pin);
                          toast.success("Order rejected.");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Could not reject order.");
                        }
                      }}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!data?.orders.length && <p className="text-xs text-muted-foreground">No orders yet.</p>}
          </div>
        </section>

        <section id="users" className={card}>
          <span className={label}>Users ({userUsage?.total ?? 0})</span>
          <p className="mt-1 text-xs text-muted-foreground">
            Total kredit tersisa (semua user): {userUsage?.totals.creditsLeft ?? 0} · total terpakai:{" "}
            {userUsage?.totals.creditsUsed ?? 0}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={usersSearch}
              onChange={(e) => setUsersSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setUsersPage(0);
                  void loadUsers(pin, 0, usersSearch, usersSort);
                }
              }}
              placeholder="Cari nama / WA / email / kode..."
              className={`${field} mt-0 flex-1`}
            />
            <select
              value={usersSort}
              onChange={(e) => {
                const sort = e.target.value as typeof usersSort;
                setUsersSort(sort);
                setUsersPage(0);
                void loadUsers(pin, 0, usersSearch, sort);
              }}
              className={`${field} mt-0`}
            >
              <option value="credits_used">Pemakaian terbanyak</option>
              <option value="credits_balance">Sisa kredit terbanyak</option>
              <option value="last_seen">Terakhir aktif</option>
            </select>
          </div>

          <div className="mt-3 space-y-2">
            {userUsage?.rows.map((u) => (
              <div key={u.id} className="rounded-lg border border-border p-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {u.name || u.userCode} · <span className="text-muted-foreground">{u.presence}</span>
                  </p>
                  <p className="text-muted-foreground">
                    {u.creditsBalance} kredit tersisa · {u.creditsUsed} terpakai
                  </p>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {u.whatsapp} · {u.email} · {u.plan} ({u.daysLeft}d)
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={grantAmountByUser[u.id] ?? ""}
                    onChange={(e) => setGrantAmountByUser((m) => ({ ...m, [u.id]: e.target.value }))}
                    placeholder="+/- kredit"
                    className={`${field} mt-0 w-28`}
                  />
                  <button
                    onClick={async () => {
                      const amt = Number(grantAmountByUser[u.id] ?? "0") || 0;
                      if (!amt) return;
                      try {
                        await grantCredits({ data: { pin, userId: u.id, credits: amt } });
                        toast.success("Credits adjusted.");
                        setGrantAmountByUser((m) => ({ ...m, [u.id]: "" }));
                        await loadUsers(pin);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not adjust credits.");
                      }
                    }}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
                  >
                    Adjust
                  </button>
                </div>
              </div>
            ))}
            {!userUsage?.rows.length && <p className="text-xs text-muted-foreground">No users found.</p>}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <button
              disabled={usersPage === 0}
              onClick={() => {
                const p = usersPage - 1;
                setUsersPage(p);
                void loadUsers(pin, p);
              }}
              className="rounded-md border border-border px-3 py-1.5 font-medium disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-muted-foreground">
              Page {(userUsage?.page ?? 0) + 1} of {Math.max(1, Math.ceil((userUsage?.total ?? 0) / 20))}
            </span>
            <button
              disabled={(usersPage + 1) * 20 >= (userUsage?.total ?? 0)}
              onClick={() => {
                const p = usersPage + 1;
                setUsersPage(p);
                void loadUsers(pin, p);
              }}
              className="rounded-md border border-border px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </section>

        <section id="vouchers" className={card}>
          <span className={label}>Vouchers</span>
          <div className="mt-2 space-y-2">
            {data?.vouchers.map((v) => {
              const isCredit = v.plan === "credits";
              const delivery = v.deliveredTo
                ? isCredit
                  ? creditVoucherDeliveryUrl(v.deliveredTo, v.code, v.credits)
                  : voucherDeliveryUrl(v.deliveredTo, v.code, v.plan === "yearly" ? "yearly" : "monthly")
                : null;
              return (
                <div key={v.code} className="rounded-lg border border-border p-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm text-foreground">{v.code}</p>
                    {delivery && (
                      <button
                        onClick={() => window.open(delivery.url, "_blank")}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium"
                      >
                        <Send className="size-3" /> Send via {delivery.channel === "whatsapp" ? "WhatsApp" : "Email"}
                      </button>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {isCredit ? `${v.credits} credits` : v.plan === "yearly" ? "1 year" : "30 days"} · to{" "}
                    {v.deliveredTo ?? "—"} · {v.usedAt ? `used ${new Date(v.usedAt).toLocaleString()}` : "unused"}
                  </p>
                </div>
              );
            })}
            {!data?.vouchers.length && <p className="text-xs text-muted-foreground">No vouchers yet.</p>}
          </div>
        </section>

        <section className={card}>
          <span className={label}>Usage history</span>
          <div className="mt-2 space-y-1">
            {data?.activity.map((a) => (
              <p key={a.id} className="text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()} — {a.action}
                {a.detail ? `: ${a.detail}` : ""}
              </p>
            ))}
          </div>
        </section>

        <section className={card}>
          <span className={label}>API cost tracking</span>
          <p className="mt-1 text-xs text-muted-foreground">
            Estimated cost — set your own Rp rates below, then usage is priced automatically per call.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border p-2">
              <p className="text-[11px] text-muted-foreground">This week</p>
              <p className="mt-1 font-display text-lg text-foreground">{formatIDR(Math.round(usage?.totals.week ?? 0))}</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[11px] text-muted-foreground">This month</p>
              <p className="mt-1 font-display text-lg text-foreground">{formatIDR(Math.round(usage?.totals.month ?? 0))}</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[11px] text-muted-foreground">This year</p>
              <p className="mt-1 font-display text-lg text-foreground">{formatIDR(Math.round(usage?.totals.year ?? 0))}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <span className={label}>Rp cost rates (estimasi biaya kamu, BUKAN kredit user)</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className="text-[11px] text-muted-foreground">Rp per 1,000 chat tokens</label>
                <input value={rateChat} onChange={(e) => setRateChat(e.target.value)} inputMode="decimal" className={field} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Rp per minute transcribed</label>
                <input value={rateTranscribe} onChange={(e) => setRateTranscribe(e.target.value)} inputMode="decimal" className={field} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Rp per caption call</label>
                <input value={rateCaption} onChange={(e) => setRateCaption(e.target.value)} inputMode="decimal" className={field} />
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await updateRates({
                    data: {
                      pin,
                      rateChatPer1kTokens: Number(rateChat) || 0,
                      rateTranscribePerMinute: Number(rateTranscribe) || 0,
                      rateCaptionPerCall: Number(rateCaption) || 0,
                    },
                  });
                  toast.success("Rates saved. New calls will use these rates.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to save rates.");
                }
              }}
              className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Save rates
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <span className={label}>Per user (all time / week / month / year)</span>
            {!usage?.perUser.length && <p className="text-sm text-muted-foreground">No usage yet.</p>}
            {usage?.perUser.map((u, i) => (
              <div key={i} className="rounded-lg border border-border p-2 text-xs">
                <p className="font-medium text-foreground">
                  {u.name} · {u.calls} calls
                </p>
                <p className="text-muted-foreground">
                  Total {formatIDR(Math.round(u.allTime))} · week {formatIDR(Math.round(u.week))} · month{" "}
                  {formatIDR(Math.round(u.month))} · year {formatIDR(Math.round(u.year))}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <span className={label}>Change PIN</span>
          <input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="New 6-digit PIN"
            inputMode="numeric"
            className={field}
          />
          <button
            onClick={async () => {
              if (!/^\d{6}$/.test(newPin)) {
                toast.error("PIN must be 6 digits.");
                return;
              }
              try {
                await changePin({ data: { pin, newPin } });
                setPin(newPin);
                setNewPin("");
                toast.success("PIN changed.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not change PIN.");
              }
            }}
            className="mt-2 w-full rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Update PIN
          </button>
        </section>

        <section id="history-backup" className={card}>
          <span className={label}>History backup</span>
          <p className="mt-1 text-xs text-muted-foreground">
            Download a snapshot of the current orders and usage history as a file you can keep safe.
            Restoring a backup file opens it in a temporary viewer only — it never writes back to the
            live database.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={downloadBackup}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium"
            >
              <Download className="size-4" /> Backup now
            </button>
            <button
              onClick={() => backupFileRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium"
            >
              <Upload className="size-4" /> Restore backup
            </button>
          </div>
          <input
            ref={backupFileRef}
            type="file"
            accept="application/json"
            className="sr-only absolute size-px opacity-0"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void restoreBackup(file);
              e.currentTarget.value = "";
            }}
          />
        </section>
      </div>

      {backupView && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
          <header className="flex items-center justify-between border-b border-border bg-card/70 px-5 py-5">
            <div>
              <h1 className="text-xl leading-none text-foreground">Backup viewer</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Exported {new Date(backupView.exportedAt).toLocaleString()} — viewing only, not connected
                to live data.
              </p>
            </div>
            <button
              onClick={() => setBackupView(null)}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium"
            >
              <X className="size-4" /> Clear & back to Dashboard
            </button>
          </header>

          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            <section className={card}>
              <span className={label}>Orders ({backupView.orders.length})</span>
              <div className="mt-2 space-y-2">
                {backupView.orders.map((o) => (
                  <div key={o.id} className="rounded-lg border border-border p-2 text-xs">
                    <p className="font-medium text-foreground">
                      {o.name} · {o.plan} · {o.status}
                    </p>
                    <p className="text-muted-foreground">
                      {o.whatsapp} · {o.email} · {formatIDR(o.amount)} · {new Date(o.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-1.5 flex gap-2">
                      <button
                        onClick={() => void copyRow(o)}
                        className="rounded border border-border px-2 py-1 text-[11px] font-medium"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => deleteBackupOrder(o.id)}
                        className="rounded border border-border px-2 py-1 text-[11px] font-medium text-destructive"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!backupView.orders.length && (
                  <p className="text-xs text-muted-foreground">No orders in this backup.</p>
                )}
              </div>
            </section>

            <section className={card}>
              <span className={label}>Usage ({backupView.usage.length})</span>
              <div className="mt-2 space-y-2">
                {backupView.usage.map((u, i) => (
                  <div key={i} className="rounded-lg border border-border p-2 text-xs">
                    <p className="font-medium text-foreground">
                      {u.name} · {u.calls} calls
                    </p>
                    <p className="text-muted-foreground">Total {formatIDR(Math.round(u.allTime))}</p>
                    <div className="mt-1.5 flex gap-2">
                      <button
                        onClick={() => void copyRow(u)}
                        className="rounded border border-border px-2 py-1 text-[11px] font-medium"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => deleteBackupUsageRow(i)}
                        className="rounded border border-border px-2 py-1 text-[11px] font-medium text-destructive"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!backupView.usage.length && (
                  <p className="text-xs text-muted-foreground">No usage rows in this backup.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {busy && (
        <div className="fixed inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
          <Loader2 className="size-4 animate-spin" /> {busy}
        </div>
      )}
    </main>
  );
}
