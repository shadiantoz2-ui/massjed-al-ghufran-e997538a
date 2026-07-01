
-- 1) Add new role value 'halaqah' (halaqah teacher = ustath)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'halaqah';

-- 2) students table: swap phone fields + birth date -> birth year + add halaqah teacher_id
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_year integer;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.students
SET birth_year = EXTRACT(YEAR FROM birth_date)::int
WHERE birth_date IS NOT NULL AND birth_year IS NULL;

ALTER TABLE public.students DROP COLUMN IF EXISTS student_phone;
ALTER TABLE public.students DROP COLUMN IF EXISTS birth_date;
CREATE INDEX IF NOT EXISTS students_teacher_idx ON public.students(teacher_id);

-- 3) Halaqah-teacher helper (uses ::text comparison so the new enum value is not referenced at parse time)
CREATE OR REPLACE FUNCTION public.is_halaqah_teacher_of(_uid uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id AND s.teacher_id = _uid
  ) AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _uid AND ur.role::text = 'halaqah'
  );
$$;

-- 4) Hadith recitations table (Nawawi 42)
CREATE TABLE IF NOT EXISTS public.hadith_recitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id),
  hadith_number integer NOT NULL CHECK (hadith_number BETWEEN 1 AND 42),
  grade text CHECK (grade IN ('excellent','very_good','good','needs_review')),
  notes text,
  recitation_date date NOT NULL DEFAULT CURRENT_DATE,
  academic_year integer NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hadith_student_idx ON public.hadith_recitations(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hadith_recitations TO authenticated;
GRANT ALL ON public.hadith_recitations TO service_role;
ALTER TABLE public.hadith_recitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY hadith_select_auth ON public.hadith_recitations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY hadith_insert_rules ON public.hadith_recitations
  FOR INSERT TO authenticated WITH CHECK (
    teacher_id = auth.uid() AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'supervisor')
      OR public.has_role(auth.uid(),'reciter')
      OR public.is_halaqah_teacher_of(auth.uid(), student_id)
    )
  );

CREATE POLICY hadith_update_rules ON public.hadith_recitations
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'supervisor')
    OR (public.has_role(auth.uid(),'reciter') AND teacher_id = auth.uid())
    OR (public.is_halaqah_teacher_of(auth.uid(), student_id) AND teacher_id = auth.uid())
  );

CREATE POLICY hadith_delete_rules ON public.hadith_recitations
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'supervisor')
    OR (public.has_role(auth.uid(),'reciter') AND teacher_id = auth.uid())
    OR (public.is_halaqah_teacher_of(auth.uid(), student_id) AND teacher_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.set_hadith_year()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    SELECT current_academic_year INTO NEW.academic_year FROM public.app_settings WHERE id = 1;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS set_hadith_year_trg ON public.hadith_recitations;
CREATE TRIGGER set_hadith_year_trg
  BEFORE INSERT ON public.hadith_recitations
  FOR EACH ROW EXECUTE FUNCTION public.set_hadith_year();

-- 5) Extend recitations & probes policies to allow halaqah teacher for their assigned students
DROP POLICY IF EXISTS recitations_insert_any_teacher ON public.recitations;
CREATE POLICY recitations_insert_any_teacher ON public.recitations
  FOR INSERT TO authenticated WITH CHECK (
    teacher_id = auth.uid() AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'supervisor')
      OR public.has_role(auth.uid(),'reciter')
      OR public.is_halaqah_teacher_of(auth.uid(), student_id)
    )
  );

DROP POLICY IF EXISTS recitations_update_rules ON public.recitations;
CREATE POLICY recitations_update_rules ON public.recitations
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'supervisor')
    OR (public.has_role(auth.uid(),'reciter') AND teacher_id = auth.uid())
    OR (public.is_halaqah_teacher_of(auth.uid(), student_id) AND teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS recitations_delete_rules ON public.recitations;
CREATE POLICY recitations_delete_rules ON public.recitations
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'supervisor')
    OR (public.has_role(auth.uid(),'reciter') AND teacher_id = auth.uid())
    OR (public.is_halaqah_teacher_of(auth.uid(), student_id) AND teacher_id = auth.uid())
  );

-- 6) Update academic year reset to include hadith table
CREATE OR REPLACE FUNCTION public.start_new_academic_year()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admin can start a new academic year';
  END IF;
  UPDATE public.recitations SET archived = true WHERE archived = false;
  UPDATE public.probes SET archived = true WHERE archived = false;
  UPDATE public.hadith_recitations SET archived = true WHERE archived = false;
  UPDATE public.app_settings SET current_academic_year = current_academic_year + 1, updated_at = now() WHERE id = 1;
END; $$;

-- 7) RPC: get hadith recitations for a student
CREATE OR REPLACE FUNCTION public.get_student_hadiths(_student_id uuid)
RETURNS TABLE(id uuid, hadith_number integer, teacher_id uuid, grade text, notes text, recitation_date date, academic_year integer, archived boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, hadith_number, teacher_id, grade, notes, recitation_date, academic_year, archived
  FROM public.hadith_recitations WHERE student_id = _student_id
  ORDER BY recitation_date DESC, created_at DESC;
$$;

-- 8) RPC: list teachers for the halaqah-teacher dropdown (any teacher role)
CREATE OR REPLACE FUNCTION public.list_teachers()
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role::text IN ('admin','supervisor','reciter','halaqah')
  )
  ORDER BY p.full_name;
$$;
