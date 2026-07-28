-- ============ Academic calendar ============
CREATE TABLE public.school_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_type text NOT NULL DEFAULT 'acara',
  created_by uuid REFERENCES public.school_staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_calendar_events TO service_role;
ALTER TABLE public.school_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_calendar_events" ON public.school_calendar_events FOR SELECT USING (false);
CREATE INDEX idx_school_calendar_events_class ON public.school_calendar_events(class_id, event_date);
CREATE TRIGGER trg_school_calendar_events_updated BEFORE UPDATE ON public.school_calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Timetable ============
CREATE TABLE public.school_timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  subject text NOT NULL,
  teacher_id uuid REFERENCES public.school_staff(id) ON DELETE SET NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_timetable TO service_role;
ALTER TABLE public.school_timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_timetable" ON public.school_timetable FOR SELECT USING (false);
CREATE INDEX idx_school_timetable_class ON public.school_timetable(class_id, day_of_week, start_time);
CREATE TRIGGER trg_school_timetable_updated BEFORE UPDATE ON public.school_timetable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Lesson plans ============
CREATE TABLE public.school_lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  subject text NOT NULL,
  teacher_id uuid REFERENCES public.school_staff(id) ON DELETE SET NULL,
  week_of date NOT NULL,
  topic text NOT NULL,
  objectives text,
  materials text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_lesson_plans TO service_role;
ALTER TABLE public.school_lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_lesson_plans" ON public.school_lesson_plans FOR SELECT USING (false);
CREATE INDEX idx_school_lesson_plans_class ON public.school_lesson_plans(class_id, week_of);
CREATE TRIGGER trg_school_lesson_plans_updated BEFORE UPDATE ON public.school_lesson_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Projects + approval chain ============
CREATE TABLE public.school_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.school_staff(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  last_review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_projects_status_check CHECK (status IN ('draft','diajukan_principal','diajukan_hos','disetujui','ditolak'))
);
GRANT ALL ON public.school_projects TO service_role;
ALTER TABLE public.school_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_projects" ON public.school_projects FOR SELECT USING (false);
CREATE INDEX idx_school_projects_class ON public.school_projects(class_id, status);
CREATE TRIGGER trg_school_projects_updated BEFORE UPDATE ON public.school_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.school_project_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.school_projects(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES public.school_staff(id) ON DELETE SET NULL,
  reviewer_name text,
  reviewer_role text NOT NULL,
  decision text NOT NULL,
  notes text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_project_reviews_role_check CHECK (reviewer_role IN ('principal','hos')),
  CONSTRAINT school_project_reviews_decision_check CHECK (decision IN ('approve','reject'))
);
GRANT ALL ON public.school_project_reviews TO service_role;
ALTER TABLE public.school_project_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_project_reviews" ON public.school_project_reviews FOR SELECT USING (false);
CREATE INDEX idx_school_project_reviews_project ON public.school_project_reviews(project_id, reviewed_at);

-- ============ Subject-teacher assessments ============
CREATE TABLE public.school_subject_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE SET NULL,
  subject text NOT NULL,
  teacher_id uuid REFERENCES public.school_staff(id) ON DELETE SET NULL,
  period text NOT NULL DEFAULT 'mingguan',
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_subject_assessments_period_check CHECK (period IN ('mingguan','bulanan','semester'))
);
GRANT ALL ON public.school_subject_assessments TO service_role;
ALTER TABLE public.school_subject_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_subject_assessments" ON public.school_subject_assessments FOR SELECT USING (false);
CREATE INDEX idx_school_subject_assessments_student ON public.school_subject_assessments(student_id, period_start);
CREATE TRIGGER trg_school_subject_assessments_updated BEFORE UPDATE ON public.school_subject_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.school_assessment_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.school_subject_assessments(id) ON DELETE CASCADE,
  competency text NOT NULL,
  achieved boolean NOT NULL DEFAULT false,
  rating smallint NOT NULL DEFAULT 3,
  position smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_assessment_forms_rating_check CHECK (rating BETWEEN 1 AND 5)
);
GRANT ALL ON public.school_assessment_forms TO service_role;
ALTER TABLE public.school_assessment_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_assessment_forms" ON public.school_assessment_forms FOR SELECT USING (false);
CREATE INDEX idx_school_assessment_forms_assessment ON public.school_assessment_forms(assessment_id, position);
CREATE TRIGGER trg_school_assessment_forms_updated BEFORE UPDATE ON public.school_assessment_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.school_assessment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL UNIQUE REFERENCES public.school_subject_assessments(id) ON DELETE CASCADE,
  draft_note text,
  final_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_assessment_notes TO service_role;
ALTER TABLE public.school_assessment_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_assessment_notes" ON public.school_assessment_notes FOR SELECT USING (false);
CREATE TRIGGER trg_school_assessment_notes_updated BEFORE UPDATE ON public.school_assessment_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Attendance ============
CREATE TABLE public.school_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'hadir',
  notes text,
  recorded_by uuid REFERENCES public.school_staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_attendance_status_check CHECK (status IN ('hadir','izin','sakit','alpha')),
  CONSTRAINT school_attendance_unique_day UNIQUE (student_id, date)
);
GRANT ALL ON public.school_attendance TO service_role;
ALTER TABLE public.school_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to school_attendance" ON public.school_attendance FOR SELECT USING (false);
CREATE INDEX idx_school_attendance_class_date ON public.school_attendance(class_id, date);
CREATE TRIGGER trg_school_attendance_updated BEFORE UPDATE ON public.school_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();