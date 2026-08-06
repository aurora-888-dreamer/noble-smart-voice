import { createServerFn } from "@tanstack/react-start";
import { verifyAdminPassword, sendSerialEmail } from "./store-admin.server";
import { createNobleSupabase, normalizeContact } from "./supabase.server";
import type { PluginId } from "./plugins";

export type PlanId = "monthly" | "quarterly" | "yearly" | "lifetime";
export type PlanTier = "standard" | "premium";
export type OrderStatus = "pending" | "paid" | "delivered" | "cancelled";

export interface StoreOrder {
  id: string;
  serial: string;
  createdAt: string;
  paidAt?: string | null;
  deliveredAt?: string | null;
  status: OrderStatus;
  planId: PlanId;
  tier: PlanTier;
  durationDays: number | null;
  priceIDR: number;
  originalPriceIDR?: number | null;
  discountId?: string | null;
  discountLabel?: string | null;
  groupId?: string | null;
  buyer: { name: string; email: string; whatsapp: string; note?: string };
  plugins: PluginId[];
  paymentRef?: string | null;
}

async function checkAdmin(password: string): Promise<boolean> {
  return verifyAdminPassword(password);
}

// Same human-typeable, checksum-guarded format as before (NBL-YYYYMM-XXXX-XX)
// — generated server-side now so two simultaneous orders can never collide,
// and so the value is trustworthy (not just client-computed).
function rand(n: number) {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let out = "";
  for (let i = 0; i < n; i++) out += alpha[Math.floor(Math.random() * alpha.length)];
  return out;
}
function checksum(s: string): string {
  let c = 0;
  for (const ch of s) c = (c * 31 + ch.charCodeAt(0)) % 1296;
  return c.toString(36).toUpperCase().padStart(2, "0");
}
function generateSerial(prefix = "NBL"): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const core = `${prefix}-${ym}-${rand(4)}`;
  return `${core}-${checksum(core)}`;
}

function rowToOrder(row: Record<string, unknown>): StoreOrder {
  return {
    id: row.id as string,
    serial: row.serial as string,
    createdAt: row.created_at as string,
    paidAt: row.paid_at as string | null,
    deliveredAt: row.delivered_at as string | null,
    status: row.status as OrderStatus,
    planId: row.plan_id as PlanId,
    tier: row.tier as PlanTier,
    durationDays: row.duration_days as number | null,
    priceIDR: row.price_idr as number,
    originalPriceIDR: row.original_price_idr as number | null,
    discountId: row.discount_id as string | null,
    discountLabel: row.discount_label as string | null,
    groupId: row.group_id as string | null,
    buyer: {
      name: row.buyer_name as string,
      email: (row.buyer_email as string) ?? "",
      whatsapp: row.buyer_whatsapp as string,
      note: (row.buyer_note as string) ?? undefined,
    },
    plugins: (row.plugins as PluginId[]) ?? [],
    paymentRef: row.payment_ref as string | null,
  };
}

// ————— Create order (called from the public checkout page — no admin gate) —————
export const createStoreOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      planId: PlanId;
      tier: PlanTier;
      durationDays: number | null;
      priceIDR: number;
      originalPriceIDR?: number;
      discountId?: string;
      discountLabel?: string;
      groupId?: string;
      buyer: { name: string; email: string; whatsapp: string; note?: string };
      plugins?: PluginId[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; order: StoreOrder } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY belum diset)." };
    if (!data.buyer?.name?.trim() || !data.buyer?.whatsapp?.trim()) {
      return { ok: false, error: "Nama dan nomor WhatsApp wajib diisi." };
    }

    const serial = generateSerial();
    const { data: row, error } = await supabase
      .from("store_orders")
      .insert({
        serial,
        plan_id: data.planId,
        tier: data.tier,
        duration_days: data.durationDays,
        price_idr: data.priceIDR,
        original_price_idr: data.originalPriceIDR ?? null,
        discount_id: data.discountId ?? null,
        discount_label: data.discountLabel ?? null,
        group_id: data.groupId ?? null,
        buyer_name: data.buyer.name.trim(),
        buyer_email: data.buyer.email?.trim() || null,
        buyer_whatsapp: data.buyer.whatsapp.trim(),
        buyer_note: data.buyer.note?.trim() || null,
        plugins: data.plugins ?? [],
      })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, order: rowToOrder(row) };
  });

// ————— Admin: list all orders (works from ANY device, unlike the old localStorage version) —————
export const listStoreOrders = createServerFn({ method: "POST" })
  .inputValidator((input: { adminPassword: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; orders: StoreOrder[] } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };

    const { data: rows, error } = await supabase.from("store_orders").select("*").order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, orders: (rows ?? []).map(rowToOrder) };
  });

// ————— Admin: mark paid — this is the bridge — issues a real, redeemable
// noble_vouchers row bound to the buyer's contact. The serial the buyer
// already has (shown at checkout) becomes directly usable at /activate in
// Noble with zero changes needed there. Kept as a separate "mark paid"
// step (not automatic at order creation) so nobody gets Premium without
// an admin confirming the payment actually came in. —————
export const markOrderPaid = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; adminPassword: string; paymentRef?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };

    const { data: order, error: fetchError } = await supabase.from("store_orders").select("*").eq("id", data.orderId).maybeSingle();
    if (fetchError) return { ok: false, error: fetchError.message };
    if (!order) return { ok: false, error: "Order not found." };

    const { error: updateError } = await supabase
      .from("store_orders")
      .update({ status: "paid", paid_at: new Date().toISOString(), payment_ref: data.paymentRef ?? null })
      .eq("id", data.orderId);
    if (updateError) return { ok: false, error: updateError.message };

    const contact = normalizeContact(order.buyer_email || order.buyer_whatsapp);
    const { error: voucherError } = await supabase.from("noble_vouchers").upsert(
      {
        code: order.serial,
        bound_contact: contact,
        tier: order.tier,
        duration_days: order.duration_days,
        status: "unused",
        note: `Store order ${order.id} (${order.plan_id})`,
      },
      { onConflict: "code" },
    );
    if (voucherError) return { ok: false, error: `Order marked paid, but issuing the voucher failed: ${voucherError.message}` };

    if (order.buyer_email) {
      const planLabel = PLANS.find((p) => p.id === order.plan_id)?.nameId ?? order.plan_id;
      await sendSerialEmail(order.buyer_email, order.buyer_name, planLabel, order.serial);
    }

    return { ok: true };
  });

export const markOrderDelivered = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; adminPassword: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { error } = await supabase.from("store_orders").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", data.orderId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const cancelStoreOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; adminPassword: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { error } = await supabase.from("store_orders").update({ status: "cancelled" }).eq("id", data.orderId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const deleteStoreOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; adminPassword: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { error } = await supabase.from("store_orders").delete().eq("id", data.orderId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const verifyStoreSerial = createServerFn({ method: "POST" })
  .inputValidator((input: { serial: string; adminPassword: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; order: StoreOrder | null } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { data: row, error } = await supabase
      .from("store_orders")
      .select("*")
      .eq("serial", data.serial.trim().toUpperCase())
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, order: row ? rowToOrder(row) : null };
  });

export const wipeAllStoreOrders = createServerFn({ method: "POST" })
  .inputValidator((input: { adminPassword: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { error } = await supabase.from("store_orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— Shared display helpers (kept here so both store pages and admin agree) —————
export interface Plan {
  id: PlanId;
  name: string;
  nameId: string;
  priceIDR: number;
  durationDays: number | null;
  tier: PlanTier;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  { id: "monthly", name: "Monthly Premium", nameId: "Bulanan Premium", priceIDR: 49_000, durationDays: 30, tier: "premium" },
  { id: "quarterly", name: "3-Month Premium", nameId: "3 Bulan Premium", priceIDR: 129_000, durationDays: 90, tier: "premium", highlight: true },
  { id: "yearly", name: "Yearly Premium", nameId: "Tahunan Premium", priceIDR: 449_000, durationDays: 365, tier: "premium" },
  { id: "lifetime", name: "Lifetime Premium", nameId: "Seumur Hidup", priceIDR: 1_499_000, durationDays: null, tier: "premium" },
];

export function formatIDR(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}
export function statusLabel(s: OrderStatus, lang: "en" | "id"): string {
  const map = {
    pending: { en: "Awaiting Payment", id: "Menunggu Pembayaran" },
    paid: { en: "Paid", id: "Sudah Dibayar" },
    delivered: { en: "Delivered", id: "Terkirim" },
    cancelled: { en: "Cancelled", id: "Dibatalkan" },
  } as const;
  return map[s][lang];
}
