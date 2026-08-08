CREATE TABLE IF NOT EXISTS public.pmd_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  full_name text NOT NULL,
  company text,
  position text,
  whatsapp text NOT NULL,
  email text NOT NULL,
  pin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmd_users TO service_role;
ALTER TABLE public.pmd_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to pmd_users" ON public.pmd_users FOR SELECT USING (false);
CREATE INDEX IF NOT EXISTS idx_pmd_users_email ON public.pmd_users(email);
CREATE INDEX IF NOT EXISTS idx_pmd_users_whatsapp ON public.pmd_users(whatsapp);
CREATE TRIGGER trg_pmd_users_updated BEFORE UPDATE ON public.pmd_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.pmd_pin_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pmd_user_id uuid NOT NULL REFERENCES public.pmd_users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmd_pin_resets TO service_role;
ALTER TABLE public.pmd_pin_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to pmd_pin_resets" ON public.pmd_pin_resets FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.pmd_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  location text,
  summary text,
  start_at timestamptz,
  target_at timestamptz,
  manager_id text,
  manager_name text,
  participant_ids text[] NOT NULL DEFAULT '{}',
  properties jsonb NOT NULL DEFAULT '[]',
  budget jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','hold','issue','cancelled','finished')),
  owner_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmd_projects TO service_role;
ALTER TABLE public.pmd_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to pmd_projects" ON public.pmd_projects FOR SELECT USING (false);
CREATE INDEX IF NOT EXISTS idx_pmd_projects_owner ON public.pmd_projects(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pmd_projects_status ON public.pmd_projects(status);
CREATE TRIGGER trg_pmd_projects_updated BEFORE UPDATE ON public.pmd_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.pmd_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL,
  name text NOT NULL,
  company text,
  role text,
  whatsapp text,
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmd_contacts TO service_role;
ALTER TABLE public.pmd_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to pmd_contacts" ON public.pmd_contacts FOR SELECT USING (false);
CREATE INDEX IF NOT EXISTS idx_pmd_contacts_owner ON public.pmd_contacts(owner_user_id);
CREATE TRIGGER trg_pmd_contacts_updated BEFORE UPDATE ON public.pmd_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.pmd_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pmd_projects(id) ON DELETE CASCADE,
  company text NOT NULL,
  contact_name text,
  whatsapp text,
  email text,
  supply_type text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmd_vendors TO service_role;
ALTER TABLE public.pmd_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to pmd_vendors" ON public.pmd_vendors FOR SELECT USING (false);
CREATE INDEX IF NOT EXISTS idx_pmd_vendors_project ON public.pmd_vendors(project_id);

CREATE TABLE IF NOT EXISTS public.pmd_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pmd_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  mime_type text NOT NULL,
  size integer NOT NULL,
  data_url text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmd_files TO service_role;
ALTER TABLE public.pmd_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to pmd_files" ON public.pmd_files FOR SELECT USING (false);
CREATE INDEX IF NOT EXISTS idx_pmd_files_project ON public.pmd_files(project_id);

CREATE TABLE IF NOT EXISTS public.pmd_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pmd_projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.pmd_timeline(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text,
  author text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('approval','recommendation','task','note','message')),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open','answered','closed')),
  recipients text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pmd_timeline TO service_role;
ALTER TABLE public.pmd_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access to pmd_timeline" ON public.pmd_timeline FOR SELECT USING (false);
CREATE INDEX IF NOT EXISTS idx_pmd_timeline_project ON public.pmd_timeline(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pmd_timeline_parent ON public.pmd_timeline(parent_id);