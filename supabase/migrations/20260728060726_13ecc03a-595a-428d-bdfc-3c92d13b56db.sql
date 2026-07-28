ALTER TABLE public.school_staff
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS subjects text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.school_guardians
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS pin text,
  ADD COLUMN IF NOT EXISTS pin_is_default boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS school_staff_user_id_key ON public.school_staff (lower(user_id)) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS school_guardians_user_id_key ON public.school_guardians (lower(user_id)) WHERE user_id IS NOT NULL;