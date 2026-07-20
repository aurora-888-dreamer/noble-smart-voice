// Aurora Master storefront: local-first order + serial management.
// Data lives in localStorage under "aurora.*" — the same device that
// hosts the admin dashboard also hosts the order log. Good enough for a
// small owner-operated business, and trivially portable to Supabase later.
import { useEffect, useState } from "react";
import type { PluginId } from "./plugins";

const ORDERS_KEY = "aurora.orders";
const SERIALS_KEY = "aurora.serials";
const ADMIN_KEY = "aurora.adminSession";
const ADMIN_PASS_KEY = "aurora.adminPass";
const DEFAULT_ADMIN_PASS = "AURORA-ADMIN";

export type PlanId = "monthly" | "quarterly" | "yearly" | "lifetime";
export type PlanTier = "standard" | "premium";
export type OrderStatus = "pending" | "paid" | "delivered" | "cancelled";

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
  { id: "monthly",   name: "Monthly Premium",   nameId: "Bulanan Premium",   priceIDR: 49_000,   durationDays: 30,   tier: "premium" },
  { id: "quarterly", name: "3-Month Premium",   nameId: "3 Bulan Premium",   priceIDR: 129_000,  durationDays: 90,   tier: "premium", highlight: true },
  { id: "yearly",    name: "Yearly Premium",    nameId: "Tahunan Premium",   priceIDR: 449_000,  durationDays: 365,  tier: "premium" },
  { id: "lifetime",  name: "Lifetime Premium",  nameId: "Seumur Hidup",      priceIDR: 1_499_000,durationDays: null, tier: "premium" },
];

export interface OrderRecord {
  id: string;
  serial: string;
  createdAt: number;
  paidAt?: number;
  deliveredAt?: number;
  status: OrderStatus;
  planId: PlanId;
  tier: PlanTier;
  durationDays: number | null;
  priceIDR: number;
  originalPriceIDR?: number; // list price before discount, if any
  discountId?: string;
  discountLabel?: string;
  groupId?: string; // customer group at time of order
  buyer: {
    name: string;
    email: string;
    whatsapp: string;
    note?: string;
  };
  plugins: PluginId[];
  paymentRef?: string; // QRIS ref / bank last4 / manual note
}

// ————— Storage helpers —————
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; } catch { return fallback; }
}
function writeJSON(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new Event("aurora:store"));
}

// ————— Serial generation —————
// Format: NBL-YYYYMM-XXXX-CHK (human-typeable, checksum-guarded)
function rand(n: number) {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let out = "";
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  for (let i = 0; i < n; i++) out += alpha[buf[i] % alpha.length];
  return out;
}
function checksum(s: string): string {
  let c = 0;
  for (const ch of s) c = (c * 31 + ch.charCodeAt(0)) % 1296;
  return c.toString(36).toUpperCase().padStart(2, "0");
}
export function generateSerial(prefix = "NBL"): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const body = rand(4);
  const core = `${prefix}-${ym}-${body}`;
  return `${core}-${checksum(core)}`;
}
export function verifySerial(serial: string): boolean {
  const parts = serial.trim().toUpperCase().split("-");
  if (parts.length !== 4) return false;
  const [prefix, ym, body, chk] = parts;
  return chk === checksum(`${prefix}-${ym}-${body}`);
}

// ————— Orders —————
export function listOrders(): OrderRecord[] {
  return readJSON<OrderRecord[]>(ORDERS_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
}
export function getOrder(id: string): OrderRecord | undefined {
  return listOrders().find((o) => o.id === id);
}
export function findOrderBySerial(serial: string): OrderRecord | undefined {
  const s = serial.trim().toUpperCase();
  return listOrders().find((o) => o.serial === s);
}
export function createOrder(input: {
  planId: PlanId;
  buyer: { name: string; email: string; whatsapp: string; note?: string };
  plugins?: PluginId[];
}): OrderRecord {
  const plan = PLANS.find((p) => p.id === input.planId);
  if (!plan) throw new Error("Unknown plan");
  const order: OrderRecord = {
    id: crypto.randomUUID(),
    serial: generateSerial(),
    createdAt: Date.now(),
    status: "pending",
    planId: plan.id,
    tier: plan.tier,
    durationDays: plan.durationDays,
    priceIDR: plan.priceIDR,
    buyer: input.buyer,
    plugins: input.plugins ?? [],
  };
  const all = readJSON<OrderRecord[]>(ORDERS_KEY, []);
  all.push(order);
  writeJSON(ORDERS_KEY, all);
  const serials = readJSON<string[]>(SERIALS_KEY, []);
  serials.push(order.serial);
  writeJSON(SERIALS_KEY, serials);
  return order;
}
export function updateOrder(id: string, patch: Partial<OrderRecord>): OrderRecord | undefined {
  const all = readJSON<OrderRecord[]>(ORDERS_KEY, []);
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], ...patch };
  writeJSON(ORDERS_KEY, all);
  return all[idx];
}
export function markPaid(id: string, paymentRef?: string) {
  return updateOrder(id, { status: "paid", paidAt: Date.now(), paymentRef });
}
export function markDelivered(id: string) {
  return updateOrder(id, { status: "delivered", deliveredAt: Date.now() });
}
export function cancelOrder(id: string) {
  return updateOrder(id, { status: "cancelled" });
}
export function deleteOrder(id: string) {
  const all = readJSON<OrderRecord[]>(ORDERS_KEY, []).filter((o) => o.id !== id);
  writeJSON(ORDERS_KEY, all);
}

// ————— Admin session (local password gate) —————
export function getAdminPassword(): string {
  if (typeof window === "undefined") return DEFAULT_ADMIN_PASS;
  return localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_ADMIN_PASS;
}
export function setAdminPassword(pw: string) {
  localStorage.setItem(ADMIN_PASS_KEY, pw);
}
export function adminLogin(pw: string): boolean {
  if (pw !== getAdminPassword()) return false;
  sessionStorage.setItem(ADMIN_KEY, "1");
  window.dispatchEvent(new Event("aurora:store"));
  return true;
}
export function adminLogout() {
  sessionStorage.removeItem(ADMIN_KEY);
  window.dispatchEvent(new Event("aurora:store"));
}
export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_KEY) === "1";
}

// ————— Hooks —————
export function useOrders() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  useEffect(() => {
    const sync = () => setOrders(listOrders());
    sync();
    window.addEventListener("aurora:store", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("aurora:store", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return orders;
}
export function useAdmin() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const sync = () => setOk(isAdmin());
    sync();
    window.addEventListener("aurora:store", sync);
    return () => window.removeEventListener("aurora:store", sync);
  }, []);
  return ok;
}

// ————— Helpers —————
export function formatIDR(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}
export function statusLabel(s: OrderStatus, lang: "en" | "id"): string {
  const map = {
    pending:   { en: "Awaiting Payment", id: "Menunggu Pembayaran" },
    paid:      { en: "Paid",             id: "Sudah Dibayar" },
    delivered: { en: "Delivered",        id: "Terkirim" },
    cancelled: { en: "Cancelled",        id: "Dibatalkan" },
  } as const;
  return map[s][lang];
}
