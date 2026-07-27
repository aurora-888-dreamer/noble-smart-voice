import { createServerFn } from "@tanstack/react-start";
import { verifyAdminPassword } from "./store-admin.server";
import { createNobleSupabase } from "./supabase.server";
import type { PlanId } from "./store.functions";

export type DiscountKind = "percent" | "fixed";

export interface CustomerGroup {
  id: string;
  name: string;
  code: string;
  note?: string;
  createdAt: string;
}

export interface Discount {
  id: string;
  name: string;
  kind: DiscountKind;
  value: number;
  planIds: PlanId[];
  groupIds: string[];
  upgradeGroupId?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  active: boolean;
  createdAt: string;
}

async function checkAdmin(password: string): Promise<boolean> {
  return verifyAdminPassword(password);
}

function groupRow(row: Record<string, unknown>): CustomerGroup {
  return {
    id: row.id as string,
    name: row.name as string,
    code: row.code as string,
    note: (row.note as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}
function discountRow(row: Record<string, unknown>): Discount {
  return {
    id: row.id as string,
    name: row.name as string,
    kind: row.kind as DiscountKind,
    value: Number(row.value),
    planIds: (row.plan_ids as PlanId[]) ?? [],
    groupIds: (row.group_ids as string[]) ?? [],
    upgradeGroupId: row.upgrade_group_id as string | null,
    validFrom: row.valid_from as string | null,
    validUntil: row.valid_until as string | null,
    active: !!row.active,
    createdAt: row.created_at as string,
  };
}

// ————— Public: storefront reads (no admin password — a customer needs these to see prices/redeem a code) —————
export const getActiveDiscounts = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true; discounts: Discount[] } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { data, error } = await supabase.from("store_discounts").select("*").eq("active", true);
    if (error) return { ok: false, error: error.message };
    return { ok: true, discounts: (data ?? []).map(discountRow) };
  },
);

export const findGroupByCodePublic = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; group: CustomerGroup | null } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { data: row, error } = await supabase
      .from("store_groups")
      .select("*")
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, group: row ? groupRow(row) : null };
  });

export const findGroupByIdPublic = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; group: CustomerGroup | null } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { data: row, error } = await supabase.from("store_groups").select("*").eq("id", data.id).maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, group: row ? groupRow(row) : null };
  });

// ————— Admin: full listings + writes —————
export const listAllDiscounts = createServerFn({ method: "POST" })
  .inputValidator((input: { adminPassword: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; discounts: Discount[] } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { data: rows, error } = await supabase.from("store_discounts").select("*").order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, discounts: (rows ?? []).map(discountRow) };
  });

export const listAllGroups = createServerFn({ method: "POST" })
  .inputValidator((input: { adminPassword: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; groups: CustomerGroup[] } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { data: rows, error } = await supabase.from("store_groups").select("*").order("name");
    if (error) return { ok: false, error: error.message };
    return { ok: true, groups: (rows ?? []).map(groupRow) };
  });

export const upsertGroupFn = createServerFn({ method: "POST" })
  .inputValidator((input: { adminPassword: string; id?: string; name: string; code: string; note?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; group: CustomerGroup } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const payload = { name: data.name.trim(), code: data.code.trim().toUpperCase(), note: data.note ?? null };
    const query = data.id
      ? supabase.from("store_groups").update(payload).eq("id", data.id).select().single()
      : supabase.from("store_groups").insert(payload).select().single();
    const { data: row, error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true, group: groupRow(row) };
  });

export const deleteGroupFn = createServerFn({ method: "POST" })
  .inputValidator((input: { adminPassword: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { error } = await supabase.from("store_groups").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const upsertDiscountFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      adminPassword: string;
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
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; discount: Discount } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const payload = {
      name: data.name.trim(),
      kind: data.kind,
      value: data.value,
      plan_ids: data.planIds,
      group_ids: data.groupIds,
      upgrade_group_id: data.upgradeGroupId || null,
      valid_from: data.validFrom ? new Date(data.validFrom).toISOString() : null,
      valid_until: data.validUntil ? new Date(data.validUntil).toISOString() : null,
      active: data.active,
    };
    const query = data.id
      ? supabase.from("store_discounts").update(payload).eq("id", data.id).select().single()
      : supabase.from("store_discounts").insert(payload).select().single();
    const { data: row, error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true, discount: discountRow(row) };
  });

export const deleteDiscountFn = createServerFn({ method: "POST" })
  .inputValidator((input: { adminPassword: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!(await checkAdmin(data.adminPassword))) return { ok: false, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend toko belum dikonfigurasi." };
    const { error } = await supabase.from("store_discounts").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
