CREATE TABLE public.school_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  name text NOT NULL,
  division text NOT NULL,
  level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_classes TO service_role;
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_classes" ON public.school_classes FOR SELECT USING (false);

CREATE TABLE public.school_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL,
  division text NOT NULL,
  email text,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_staff TO service_role;
ALTER TABLE public.school_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_staff" ON public.school_staff FOR SELECT USING (false);

CREATE TABLE public.school_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  student_number text,
  nickname text,
  dob date,
  pob text,
  address text,
  religion text,
  joined_at date,
  gender text,
  allergies text,
  notes text,
  certificates text[] NOT NULL DEFAULT '{}',
  extracurriculars text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_students TO service_role;
ALTER TABLE public.school_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_students" ON public.school_students FOR SELECT USING (false);

CREATE TABLE public.school_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relation text NOT NULL,
  email text,
  whatsapp text,
  invite_code text NOT NULL UNIQUE,
  invite_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_guardians TO service_role;
ALTER TABLE public.school_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_guardians" ON public.school_guardians FOR SELECT USING (false);

CREATE TABLE public.school_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  author_name text,
  activity_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_activities TO service_role;
ALTER TABLE public.school_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_activities" ON public.school_activities FOR SELECT USING (false);

CREATE TABLE public.school_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text,
  student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  from_side text NOT NULL,
  author_name text,
  body text NOT NULL,
  closed_by_teacher boolean NOT NULL DEFAULT false,
  closed_by_parent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_messages TO service_role;
ALTER TABLE public.school_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_messages" ON public.school_messages FOR SELECT USING (false);

CREATE TABLE public.school_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  scope text NOT NULL,
  division text,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_announcements TO service_role;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_announcements" ON public.school_announcements FOR SELECT USING (false);

CREATE INDEX idx_school_students_class ON public.school_students(class_id);
CREATE INDEX idx_school_classes_school ON public.school_classes(school_id);
CREATE INDEX idx_school_messages_student ON public.school_messages(student_id);
CREATE INDEX idx_school_activities_class ON public.school_activities(class_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_school_classes_updated BEFORE UPDATE ON public.school_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_school_staff_updated BEFORE UPDATE ON public.school_staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_school_students_updated BEFORE UPDATE ON public.school_students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_school_guardians_updated BEFORE UPDATE ON public.school_guardians FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_school_activities_updated BEFORE UPDATE ON public.school_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_school_messages_updated BEFORE UPDATE ON public.school_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_school_announcements_updated BEFORE UPDATE ON public.school_announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();