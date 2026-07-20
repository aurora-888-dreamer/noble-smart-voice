// Discounts + customer Groups for Aurora Master.
//
// Data now lives in Supabase (see discounts.functions.ts), shared across
// every device — this file used to read/write localStorage directly, which
// meant a discount/group the admin created only existed on their own
// browser and could never actually be redeemed by a customer elsewhere.
//
// Public storefront pages (Upgrade, Order) get read-only access to ACTIVE
// discounts and code lookup, no password needed. The admin dashboard uses
// separate admin-gated hooks/functions for full listings and writes.
import { useEffect, useState } from "react";
import {
  getActiveDiscounts,
  findGroupByCodePublic,
  findGroupByIdPublic,
  listAllDiscounts,
  listAllGroups,
  upsertGroupFn,
  deleteGroupFn,
  upsertDiscountFn,
  deleteDiscountFn,
  type Discount,
  type DiscountKind,
  type CustomerGroup,
} from "./discounts.functions";
import { PLANS, type PlanId, type Plan } from "./aurora-store";

export type { Discount, DiscountKind, CustomerGroup };

const USER_GROUP_KEY = "aurora.userGroup"; // current user's own group id — stays device-local, that's fine

// ————— Public: storefront reads —————
export async function findGroupByCode(code: string): Promise<CustomerGroup | undefined> {
  const res = await findGroupByCodePublic({ data: { code } });
  return res.ok && res.group ? res.group : undefined;
}
export async function findGroupById(id: string): Promise<CustomerGroup | undefined> {
  const res = await findGroupByIdPublic({ data: { id } });
  return res.ok && res.group ? res.group : undefined;
}

export function useDiscounts() {
  const [v, setV] = useState<Discount[]>([]);
  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      getActiveDiscounts({ data: undefined as never }).then((res) => {
        if (!cancelled && res.ok) setV(res.discounts);
      });
    };
    sync();
    window.addEventListener("aurora:store", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("aurora:store", sync);
    };
  }, []);
  return v;
}

// ————— Admin: full listings + writes (all require the admin password) —————
export function useAdminDiscounts(adminPassword: string | null) {
  const [v, setV] = useState<Discount[]>([]);
  useEffect(() => {
    if (!adminPassword) {
      setV([]);
      return;
    }
    let cancelled = false;
    const sync = () => {
      listAllDiscounts({ data: { adminPassword } }).then((res) => {
        if (!cancelled && res.ok) setV(res.discounts);
      });
    };
    sync();
    window.addEventListener("aurora:store", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("aurora:store", sync);
    };
  }, [adminPassword]);
  return v;
}

export function useAdminGroups(adminPassword: string | null) {
  const [v, setV] = useState<CustomerGroup[]>([]);
  useEffect(() => {
    if (!adminPassword) {
      setV([]);
      return;
    }
    let cancelled = false;
    const sync = () => {
      listAllGroups({ data: { adminPassword } }).then((res) => {
        if (!cancelled && res.ok) setV(res.groups);
      });
    };
    sync();
    window.addEventListener("aurora:store", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("aurora:store", sync);
    };
  }, [adminPassword]);
  return v;
}

export async function upsertGroup(
  g: { id?: string; name: string; code: string; note?: string },
  adminPassword: string,
) {
  const res = await upsertGroupFn({ data: { ...g, adminPassword } });
  if (res.ok) window.dispatchEvent(new Event("aurora:store"));
  return res;
}
export async function deleteGroup(id: string, adminPassword: string) {
  const res = await deleteGroupFn({ data: { id, adminPassword } });
  if (res.ok) window.dispatchEvent(new Event("aurora:store"));
  return res;
}
export async function upsertDiscount(
  d: {
    id?: string;
    name: string;
    kind: DiscountKind;
    value: number;
    planIds: PlanId[];
    groupIds: string[];
    upgradeGroupId?: string;
    validFrom?: number | null;
    validUntil?: number | null;
    active: boolean;
  },
  adminPassword: string,
) {
  const res = await upsertDiscountFn({ data: { ...d, adminPassword } });
  if (res.ok) window.dispatchEvent(new Event("aurora:store"));
  return res;
}
export async function deleteDiscount(id: string, adminPassword: string) {
  const res = await deleteDiscountFn({ data: { id, adminPassword } });
  if (res.ok) window.dispatchEvent(new Event("aurora:store"));
  return res;
}

// ————— User's own group (device-local — this one's fine to keep local, it's just "which group am I in") —————
export function getUserGroupId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_GROUP_KEY);
}
export function setUserGroupId(id: string | null) {
  if (id) localStorage.setItem(USER_GROUP_KEY, id);
  else localStorage.removeItem(USER_GROUP_KEY);
  window.dispatchEvent(new Event("aurora:store"));
}
export function useUserGroupId() {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setV(getUserGroupId());
    sync();
    window.addEventListener("aurora:store", sync);
    return () => window.removeEventListener("aurora:store", sync);
  }, []);
  return v;
}

// ————— Pure application logic (unchanged — operates on already-fetched data, no I/O) —————
export function isDiscountValid(d: Discount, now = Date.now()): boolean {
  if (!d.active) return false;
  if (d.validFrom && now < new Date(d.validFrom).getTime()) return false;
  if (d.validUntil && now > new Date(d.validUntil).getTime()) return false;
  return true;
}
export function discountAppliesToPlan(d: Discount, planId: PlanId): boolean {
  return d.planIds.length === 0 || d.planIds.includes(planId);
}
export function discountAppliesToGroup(d: Discount, groupId: string | null): boolean {
  if (d.groupIds.length === 0) return true;
  return !!groupId && d.groupIds.includes(groupId);
}
export function applyDiscount(plan: Plan, d: Discount): number {
  if (d.kind === "percent") return Math.max(0, Math.round(plan.priceIDR * (1 - d.value / 100)));
  return Math.max(0, Math.round(d.value));
}
export function bestDiscountFor(
  planId: PlanId,
  groupId: string | null,
  discounts: Discount[],
): { discount: Discount; finalPrice: number } | null {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const now = Date.now();
  let best: { discount: Discount; finalPrice: number } | null = null;
  for (const d of discounts) {
    if (!isDiscountValid(d, now)) continue;
    if (!discountAppliesToPlan(d, planId)) continue;
    if (!discountAppliesToGroup(d, groupId)) continue;
    const finalPrice = applyDiscount(plan, d);
    if (finalPrice >= plan.priceIDR) continue;
    if (!best || finalPrice < best.finalPrice) best = { discount: d, finalPrice };
  }
  return best;
}
export function getDiscount(id: string, discounts: Discount[]): Discount | undefined {
  return discounts.find((d) => d.id === id);
}
