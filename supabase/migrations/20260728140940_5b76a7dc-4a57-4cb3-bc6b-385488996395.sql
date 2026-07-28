ALTER TABLE public.school_agendas
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS execution_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS scope_level text NOT NULL DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS last_review_notes text,
  ADD COLUMN IF NOT EXISTS final_report text;

CREATE TABLE IF NOT EXISTS public.school_agenda_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id uuid NOT NULL REFERENCES public.school_agendas(id) ON DELETE CASCADE,
  class_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agenda_id, class_id)
);
GRANT ALL ON public.school_agenda_classes TO service_role;
ALTER TABLE public.school_agenda_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_agenda_classes" ON public.school_agenda_classes FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.school_agenda_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id uuid NOT NULL REFERENCES public.school_agendas(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'comment',
  author_name text,
  author_role text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_agenda_timeline TO service_role;
ALTER TABLE public.school_agenda_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_agenda_timeline" ON public.school_agenda_timeline FOR SELECT USING (false);