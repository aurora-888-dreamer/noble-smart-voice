-- Aurora Master store: Discounts + Customer Groups, shared across every
-- device (replaces the old localStorage-only version, which meant a
-- discount code created on the admin's device didn't exist anywhere a
-- customer could actually redeem it from).
--
-- Run this in the SAME Noble Supabase project as noble_vouchers.sql and
-- store_orders.sql.

create table if not exists store_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,          -- upper-case code the customer types on /upgrade
  note text,
  created_at timestamptz not null default now()
);

create table if not exists store_discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric not null,             -- percent (0-100) or fixed final IDR price
  plan_ids text[] default '{}',       -- [] = applies to ALL plans
  group_ids uuid[] default '{}',      -- [] = public (anyone can use); else only these groups
  upgrade_group_id uuid references store_groups(id) on delete set null,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_store_groups_code on store_groups (code);
create index if not exists idx_store_discounts_active on store_discounts (active);

-- Locked down by default. Reads for the public storefront (active discounts,
-- code lookup) go through dedicated server functions that only return what a
-- customer is meant to see; writes and full listings are admin-gated in the
-- same functions. Everything goes through the service_role key either way.
alter table store_groups enable row level security;
alter table store_discounts enable row level security;
