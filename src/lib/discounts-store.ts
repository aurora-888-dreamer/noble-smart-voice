// Discounts + customer Groups for Aurora Master.
// Local-first (localStorage), mirrors aurora-store style.
import { useEffect, useState } from "react";
import { PLANS, type PlanId, type Plan } from "./aurora-store";

const GROUPS_KEY = "aurora.groups";
const DISCOUNTS_KEY = "aurora.discounts";
const USER_GROUP_KEY = "aurora.userGroup"; // current user's group id

export interface CustomerGroup {
  id: string;
  name: string;
  code: string; // upper-case code the user types on /upgrade
  note?: string;
  createdAt: number;
}

export type DiscountKind = "percent" | "fixed"; // percent off, or fixed final price

export interface Discount {
  id: string;
  name: string;
  kind: DiscountKind;
  value: number; // if percent → 0-100; if fixed → final IDR price
  planIds: PlanId[]; // [] = applies to ALL plans
  groupIds: string[]; // [] = public (anyone can use); else only these groups
  upgradeGroupId?: string; // on purchase, promote buyer to this group
  validFrom?: number | null;
  validUntil?: number | null;
  active: boolean;
  createdAt: number;
}

// ————— storage —————
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; } catch { return fallback; }
}
function writeJSON(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new Event("aurora:store"));
}

// ————— Groups —————
export function listGroups(): CustomerGroup[] {
  return readJSON<CustomerGroup[]>(GROUPS_KEY, []).sort((a, b) => a.name.localeCompare(b.name));
}
export function upsertGroup(g: Omit<CustomerGroup, "id" | "createdAt"> & { id?: string }): CustomerGroup {
  const all = readJSON<CustomerGroup[]>(GROUPS_KEY, []);
  const code = g.code.trim().toUpperCase();
  if (g.id) {
    const idx = all.findIndex((x) => x.id === g.id);
    if (idx >= 0) { all[idx] = { ...all[idx], ...g, code }; writeJSON(GROUPS_KEY, all); return all[idx]; }
  }
  const rec: CustomerGroup = { id: crypto.randomUUID(), name: g.name.trim(), code, note: g.note, createdAt: Date.now() };
  all.push(rec);
  writeJSON(GROUPS_KEY, all);
  return rec;
}
export function deleteGroup(id: string) {
  writeJSON(GROUPS_KEY, readJSON<CustomerGroup[]>(GROUPS_KEY, []).filter((g) => g.id !== id));
}
export function findGroupByCode(code: string): CustomerGroup | undefined {
  const c = code.trim().toUpperCase();
  return listGroups().find((g) => g.code === c);
}

// ————— Discounts —————
export function listDiscounts(): Discount[] {
  return readJSON<Discount[]>(DISCOUNTS_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
}
export function upsertDiscount(d: Omit<Discount, "id" | "createdAt"> & { id?: string }): Discount {
  const all = readJSON<Discount[]>(DISCOUNTS_KEY, []);
  if (d.id) {
    const idx = all.findIndex((x) => x.id === d.id);
    if (idx >= 0) { all[idx] = { ...all[idx], ...d }; writeJSON(DISCOUNTS_KEY, all); return all[idx]; }
  }
  const rec: Discount = { ...d, id: crypto.randomUUID(), createdAt: Date.now() };
  all.push(rec);
  writeJSON(DISCOUNTS_KEY, all);
  return rec;
}
export function deleteDiscount(id: string) {
  writeJSON(DISCOUNTS_KEY, readJSON<Discount[]>(DISCOUNTS_KEY, []).filter((d) => d.id !== id));
}
export function getDiscount(id: string): Discount | undefined {
  return listDiscounts().find((d) => d.id === id);
}

// ————— User group (device-local) —————
export function getUserGroupId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_GROUP_KEY);
}
export function setUserGroupId(id: string | null) {
  if (id) localStorage.setItem(USER_GROUP_KEY, id);
  else localStorage.removeItem(USER_GROUP_KEY);
  window.dispatchEvent(new Event("aurora:store"));
}

// ————— Application logic —————
export function isDiscountValid(d: Discount, now = Date.now()): boolean {
  if (!d.active) return false;
  if (d.validFrom && now < d.validFrom) return false;
  if (d.validUntil && now > d.validUntil) return false;
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
export function bestDiscountFor(planId: PlanId, groupId: string | null): { discount: Discount; finalPrice: number } | null {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const now = Date.now();
  let best: { discount: Discount; finalPrice: number } | null = null;
  for (const d of listDiscounts()) {
    if (!isDiscountValid(d, now)) continue;
    if (!discountAppliesToPlan(d, planId)) continue;
    if (!discountAppliesToGroup(d, groupId)) continue;
    const finalPrice = applyDiscount(plan, d);
    if (finalPrice >= plan.priceIDR) continue;
    if (!best || finalPrice < best.finalPrice) best = { discount: d, finalPrice };
  }
  return best;
}

// ————— Hooks —————
export function useDiscounts() {
  const [v, set] = useState<Discount[]>([]);
  useEffect(() => {
    const sync = () => set(listDiscounts());
    sync();
    window.addEventListener("aurora:store", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("aurora:store", sync); window.removeEventListener("storage", sync); };
  }, []);
  return v;
}
export function useGroups() {
  const [v, set] = useState<CustomerGroup[]>([]);
  useEffect(() => {
    const sync = () => set(listGroups());
    sync();
    window.addEventListener("aurora:store", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("aurora:store", sync); window.removeEventListener("storage", sync); };
  }, []);
  return v;
}
export function useUserGroupId() {
  const [v, set] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => set(getUserGroupId());
    sync();
    window.addEventListener("aurora:store", sync);
    return () => window.removeEventListener("aurora:store", sync);
  }, []);
  return v;
}
