-- Probes (سبر) table: testing students on entire juz (1..30)
CREATE TABLE IF NOT EXISTS public.probes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id),
  juz_number int NOT NULL CHECK (juz_number BETWEEN 1 AND 30),
  grade text,
  notes text,
  probe_date date NOT NULL DEFAULT CURRENT_DATE,
  academic_year int,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.probes TO authenticated;
GRANT SELECT ON public.probes TO anon;
GRANT ALL ON public.probes TO service_role;

ALTER TABLE public.probes ENABLE ROW LEVEL SECURITY;

-- Anyone (public student view) can read
CREATE POLICY "probes_read_all" ON public.probes FOR SELECT USING (true);
-- Admin or supervisor can insert
CREATE POLICY "probes_insert_admin_sup" ON public.probes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
-- Admin or supervisor can update
CREATE POLICY "probes_update_admin_sup" ON public.probes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
-- Admin or supervisor can delete
CREATE POLICY "probes_delete_admin_sup" ON public.probes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- Auto-fill academic year on insert
CREATE TRIGGER trg_probes_set_year
BEFORE INSERT ON public.probes
FOR EACH ROW EXECUTE FUNCTION public.set_recitation_year();

-- Archive probes when starting a new year
CREATE OR REPLACE FUNCTION public.start_new_academic_year()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admin can start a new academic year';
  END IF;
  UPDATE public.recitations SET archived = true WHERE archived = false;
  UPDATE public.probes SET archived = true WHERE archived = false;
  UPDATE public.app_settings SET current_academic_year = current_academic_year + 1, updated_at = now() WHERE id = 1;
END; $function$;

-- RPC: get probes for a student (public, used by student.$studentId page)
CREATE OR REPLACE FUNCTION public.get_student_probes(_student_id uuid)
RETURNS TABLE(id uuid, juz_number int, grade text, notes text, probe_date date, academic_year int, archived boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, juz_number, grade, notes, probe_date, academic_year, archived
  FROM public.probes WHERE student_id = _student_id
  ORDER BY probe_date DESC, created_at DESC
$$;