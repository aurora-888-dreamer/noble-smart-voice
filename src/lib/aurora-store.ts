// Aurora Master storefront — client-facing helpers.
//
// Data now lives in Supabase (see store.functions.ts), shared across every
// device — this file used to read/write localStorage directly, which meant
// the admin dashboard could only ever see orders placed on that exact same
// browser. That's fixed now: everything here calls the server functions.
//
// Kept as a thin wrapper (same export names as before) so store.index.tsx
// and other pages that only need PLANS/formatIDR/types don't need to change.
import { useEffect, useState } from "react";
import {
  createStoreOrder,
  listStoreOrders,
  markOrderPaid as markOrderPaidFn,
  markOrderDelivered as markOrderDeliveredFn,
  cancelStoreOrder as cancelStoreOrderFn,
  deleteStoreOrder as deleteStoreOrderFn,
  verifyStoreSerial as verifyStoreSerialFn,
  wipeAllStoreOrders as wipeAllStoreOrdersFn,
  PLANS,
  formatIDR,
  statusLabel,
  type PlanId,
  type PlanTier,
  type OrderStatus,
  type StoreOrder,
  type Plan,
} from "./store.functions";
import type { PluginId } from "./plugins";

export { PLANS, formatIDR, statusLabel };
export type { PlanId, PlanTier, OrderStatus, Plan };
// Same shape as before, new name upstream — kept as an alias so existing
// `type OrderRecord` imports elsewhere don't need to change.
export type OrderRecord = StoreOrder;

const SESSION_KEY = "aurora.adminSession"; // holds the password itself now, not just a "1" flag —
                                            // needed so every admin action can be verified server-side.

// ————— Orders (buyer-facing: create) —————
export async function createOrder(input: {
  planId: PlanId;
  buyer: { name: string; email: string; whatsapp: string; note?: string };
  plugins?: PluginId[];
  priceIDR?: number;
  originalPriceIDR?: number;
  discountId?: string;
  discountLabel?: string;
  groupId?: string;
}): Promise<{ ok: true; order: StoreOrder } | { ok: false; error: string }> {
  const plan = PLANS.find((p) => p.id === input.planId);
  if (!plan) return { ok: false, error: "Unknown plan" };
  return createStoreOrder({
    data: {
      planId: plan.id,
      tier: plan.tier,
      durationDays: plan.durationDays,
      priceIDR: input.priceIDR ?? plan.priceIDR,
      originalPriceIDR: input.originalPriceIDR,
      discountId: input.discountId,
      discountLabel: input.discountLabel,
      groupId: input.groupId,
      buyer: input.buyer,
      plugins: input.plugins ?? [],
    },
  });
}

// ————— Orders (admin-facing: list/update) — all require the admin password —————
export async function listOrders(adminPassword: string): Promise<StoreOrder[]> {
  const res = await listStoreOrders({ data: { adminPassword } });
  return res.ok ? res.orders : [];
}
export async function markPaid(orderId: string, adminPassword: string, paymentRef?: string) {
  return markOrderPaidFn({ data: { orderId, adminPassword, paymentRef } });
}
export async function markDelivered(orderId: string, adminPassword: string) {
  return markOrderDeliveredFn({ data: { orderId, adminPassword } });
}
export async function cancelOrder(orderId: string, adminPassword: string) {
  return cancelStoreOrderFn({ data: { orderId, adminPassword } });
}
export async function deleteOrder(orderId: string, adminPassword: string) {
  return deleteStoreOrderFn({ data: { orderId, adminPassword } });
}
export async function verifySerial(serial: string, adminPassword: string) {
  return verifyStoreSerialFn({ data: { serial, adminPassword } });
}
export async function wipeAllOrders(adminPassword: string) {
  return wipeAllStoreOrdersFn({ data: { adminPassword } });
}

// Pure client-side formatter — same shape as the real (server-generated)
// serials, but this is only ever a convenience string for the admin's
// "Generate Serial" tool (hand-issued licenses not tied to an order). It's
// not registered anywhere by itself; the admin still has to separately
// issue it as a real voucher (e.g. via the Supabase SQL example in
// noble_vouchers.sql) for it to actually activate anything.
export function generateSerialPreview(prefix = "NBL"): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  let body = "";
  for (let i = 0; i < 4; i++) body += alpha[Math.floor(Math.random() * alpha.length)];
  const core = `${prefix}-${ym}-${body}`;
  let c = 0;
  for (const ch of core) c = (c * 31 + ch.charCodeAt(0)) % 1296;
  return `${core}-${c.toString(36).toUpperCase().padStart(2, "0")}`;
}

// ————— Admin session —————
// Login now verifies the password against the SERVER (via a lightweight
// listStoreOrders call) instead of comparing to a locally-stored value —
// there's no longer a client-side "correct password" to compare against,
// since the real check lives in store.functions.ts against
// STORE_ADMIN_PASSWORD. The password itself is kept in sessionStorage (not
// just a yes/no flag) so subsequent admin actions can pass it along
// automatically without asking again.
export async function adminLogin(pw: string): Promise<boolean> {
  const res = await listStoreOrders({ data: { adminPassword: pw } });
  if (!res.ok) return false;
  sessionStorage.setItem(SESSION_KEY, pw);
  window.dispatchEvent(new Event("aurora:store"));
  return true;
}
export function adminLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("aurora:store"));
}
export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem(SESSION_KEY);
}
export function getAdminSessionPassword(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
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

// Live-refreshing order list for the admin dashboard. Re-fetches whenever
// an admin action fires "aurora:store", plus a light poll so a second
// admin session (or a customer's own order) shows up without a manual
// refresh.
export function useOrders(adminPassword: string | null) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  useEffect(() => {
    if (!adminPassword) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    const sync = () => {
      listOrders(adminPassword).then((o) => {
        if (!cancelled) setOrders(o);
      });
    };
    sync();
    window.addEventListener("aurora:store", sync);
    const poll = setInterval(sync, 15_000);
    return () => {
      cancelled = true;
      window.removeEventListener("aurora:store", sync);
      clearInterval(poll);
    };
  }, [adminPassword]);
  return orders;
}
