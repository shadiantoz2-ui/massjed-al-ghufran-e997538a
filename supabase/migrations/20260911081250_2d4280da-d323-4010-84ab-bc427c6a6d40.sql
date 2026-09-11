CREATE TABLE public.student_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  nickname text,
  father_name text,
  mother_name text,
  birth_year integer,
  father_phone text,
  mother_phone text,
  contact_phone text,
  father_job text,
  grade_level text,
  address text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.student_registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_registrations TO authenticated;
GRANT ALL ON public.student_registrations TO service_role;

ALTER TABLE public.student_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sr_insert_public ON public.student_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');

CREATE POLICY sr_select_admin_sup ON public.student_registrations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY sr_update_admin_sup ON public.student_registrations
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY sr_delete_admin_sup ON public.student_registrations
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE OR REPLACE FUNCTION public.sr_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER update_student_registrations_updated_at
  BEFORE UPDATE ON public.student_registrations
  FOR EACH ROW EXECUTE FUNCTION public.sr_touch_updated_at();

CREATE INDEX idx_student_registrations_status ON public.student_registrations(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.approve_student_registration(_id uuid, _teacher_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.student_registrations;
  new_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.student_registrations WHERE id = _id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'registration not found or already reviewed';
  END IF;

  INSERT INTO public.students (
    full_name, nickname, father_name, mother_name, birth_year,
    father_phone, mother_phone, contact_phone, father_job,
    grade_level, address, teacher_id, created_by
  ) VALUES (
    r.full_name, r.nickname, r.father_name, r.mother_name, r.birth_year,
    r.father_phone, r.mother_phone, r.contact_phone, r.father_job,
    r.grade_level, r.address, _teacher_id, auth.uid()
  ) RETURNING id INTO new_id;

  UPDATE public.student_registrations
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_student_registration(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.student_registrations
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.approve_student_registration(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_student_registration(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_student_registration(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_student_registration(uuid) TO authenticated;