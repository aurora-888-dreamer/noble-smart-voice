ALTER TABLE public.school_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_pin_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_staff_pin_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_year_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.school_access FROM anon, authenticated;
REVOKE ALL ON public.school_pin_resets FROM anon, authenticated;
REVOKE ALL ON public.school_staff_pin_resets FROM anon, authenticated;
REVOKE ALL ON public.school_year_assignments FROM anon, authenticated;

GRANT ALL ON public.school_access TO service_role;
GRANT ALL ON public.school_pin_resets TO service_role;
GRANT ALL ON public.school_staff_pin_resets TO service_role;
GRANT ALL ON public.school_year_assignments TO service_role;