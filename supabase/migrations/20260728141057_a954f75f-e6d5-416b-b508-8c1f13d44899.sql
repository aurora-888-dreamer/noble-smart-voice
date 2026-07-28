ALTER TABLE public.school_agenda_classes
  ADD CONSTRAINT school_agenda_classes_class_id_fkey
  FOREIGN KEY (class_id) REFERENCES public.school_classes(id) ON DELETE CASCADE;