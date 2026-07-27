create table if not exists public.store_admin_auth (
  id smallint primary key default 1 check (id = 1),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_admin_resets (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_store_admin_resets_created on public.store_admin_resets (created_at desc);

grant all on public.store_admin_auth to service_role;
grant all on public.store_admin_resets to service_role;

alter table public.store_admin_auth enable row level security;
alter table public.store_admin_resets enable row level security;