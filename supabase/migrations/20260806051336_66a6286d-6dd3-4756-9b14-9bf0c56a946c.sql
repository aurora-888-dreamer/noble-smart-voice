create table if not exists public.store_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.store_discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('percent','fixed')),
  value numeric not null,
  plan_ids text[] default '{}',
  group_ids uuid[] default '{}',
  upgrade_group_id uuid references public.store_groups(id) on delete set null,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique,
  plan_id text not null,
  tier text not null,
  duration_days integer,
  price_idr integer not null,
  original_price_idr integer,
  discount_id text,
  discount_label text,
  group_id text,
  buyer_name text not null,
  buyer_email text,
  buyer_whatsapp text not null,
  buyer_note text,
  plugins text[] default '{}',
  status text not null default 'pending' check (status in ('pending','paid','delivered','cancelled')),
  payment_ref text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  delivered_at timestamptz
);
create table if not exists public.noble_vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  bound_contact text not null,
  tier text not null check (tier in ('standard','premium')),
  duration_days integer,
  status text not null default 'unused' check (status in ('unused','used','revoked')),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by_contact text,
  note text
);
create index if not exists idx_store_orders_serial on public.store_orders (serial);
create index if not exists idx_store_orders_created on public.store_orders (created_at desc);
create index if not exists idx_noble_vouchers_code on public.noble_vouchers (code);

grant all on public.store_groups to service_role;
grant all on public.store_discounts to service_role;
grant all on public.store_orders to service_role;
grant all on public.noble_vouchers to service_role;

alter table public.store_groups enable row level security;
alter table public.store_discounts enable row level security;
alter table public.store_orders enable row level security;
alter table public.noble_vouchers enable row level security;