ALTER TABLE public.school_agendas ADD COLUMN IF NOT EXISTS creator_role text;
ALTER TABLE public.school_agendas ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE public.school_agenda_timeline RENAME COLUMN kind TO entry_type;
ALTER TABLE public.school_agenda_timeline ALTER COLUMN entry_type SET DEFAULT 'comment';