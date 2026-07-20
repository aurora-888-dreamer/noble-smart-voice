-- Aurora Master store: real order/payment tracking, shared across every
-- device (replaces the old localStorage-only aurora.orders, which only
-- existed on whichever single browser placed the order — meaning the
-- admin dashboard could never see a customer's order unless it was
-- opened on that same device).
--
-- Run this in the SAME Noble Supabase project as noble_vouchers.sql
-- (ref used for SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).

create table if not exists store_orders (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique,                -- e.g. "NBL-202607-XXXX-XX" — also becomes the noble_vouchers.code once paid
  plan_id text not null,                      -- monthly | quarterly | yearly | lifetime
  tier text not null,                         -- standard | premium
  duration_days integer,                      -- NULL = lifetime
  price_idr integer not null,
  original_price_idr integer,                 -- list price before discount, if any
  discount_id text,
  discount_label text,
  group_id text,                              -- customer group at time of order
  buyer_name text not null,
  buyer_email text,
  buyer_whatsapp text not null,
  buyer_note text,
  plugins text[] default '{}',                -- plugin ids included with this order
  status text not null default 'pending' check (status in ('pending', 'paid', 'delivered', 'cancelled')),
  payment_ref text,                           -- QRIS ref / bank last4 / manual note
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  delivered_at timestamptz
);

create index if not exists idx_store_orders_serial on store_orders (serial);
create index if not exists idx_store_orders_status on store_orders (status);
create index if not exists idx_store_orders_created on store_orders (created_at desc);

-- Locked down by default — all access goes through server functions using
-- the service_role key (same pattern as noble_vouchers).
alter table store_orders enable row level security;
