-- Noble voucher/license backend.
-- Run this once in your NEW Noble Supabase project's SQL Editor
-- (the Portal Pulsa Murah project, ref zdogryjklojzoyoyxech, is separate —
-- do NOT run this there).

create table if not exists noble_vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- e.g. "NOBLE-7F3K-9QRT" (human-typeable)
  bound_contact text not null,                -- normalized email OR phone (see normalizeContact in code)
  tier text not null check (tier in ('standard', 'premium')),
  duration_days integer not null,             -- 30, 90, 365, ...
  status text not null default 'unused' check (status in ('unused', 'used', 'revoked')),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by_contact text,
  note text                                   -- optional: which reseller/agent sold it, order ref, etc.
);

create index if not exists idx_noble_vouchers_code on noble_vouchers (code);
create index if not exists idx_noble_vouchers_contact on noble_vouchers (bound_contact);

-- Row Level Security: locked down by default. All access goes through the
-- server function using the service_role key, which bypasses RLS — the
-- anon/public key (if you ever use it elsewhere) gets nothing.
alter table noble_vouchers enable row level security;

-- ---------------------------------------------------------------------
-- Example: how to hand-generate a voucher for a buyer right now (until
-- an in-app generator exists). Replace the values, then run the INSERT.
--
-- Phone contacts: digits only, no +, no spaces, leading 0 replaced by 62
--   e.g. "0812-3456-7890" -> "6281234567890"
-- Email contacts: lowercase
--
-- insert into noble_vouchers (code, bound_contact, tier, duration_days, note)
-- values ('NOBLE-7F3K-9QRT', '6281234567890', 'premium', 30, 'sold via WA agent Budi');
-- ---------------------------------------------------------------------
