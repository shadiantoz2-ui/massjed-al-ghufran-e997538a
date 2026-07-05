
-- Add points column
ALTER TABLE public.probes ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;
ALTER TABLE public.hadith_recitations ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

-- Point events ledger
CREATE TABLE public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  points integer NOT NULL,
  source text NOT NULL CHECK (source IN ('recitation','probe','hadith','attendance','manual')),
  reference_id uuid,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  academic_year integer,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX point_events_student_idx ON public.point_events(student_id);
CREATE INDEX point_events_ref_idx ON public.point_events(reference_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.point_events TO authenticated;
GRANT ALL ON public.point_events TO service_role;
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pe_select_auth" ON public.point_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "pe_insert_rules" ON public.point_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor')
    OR (public.has_role(auth.uid(),'halaqah') AND public.is_halaqah_teacher_of(auth.uid(), student_id))
  );
CREATE POLICY "pe_delete_rules" ON public.point_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "pe_update_rules" ON public.point_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- Year trigger
CREATE OR REPLACE FUNCTION public.set_point_year() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    SELECT current_academic_year INTO NEW.academic_year FROM public.app_settings WHERE id=1;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER set_point_year_trg BEFORE INSERT ON public.point_events
FOR EACH ROW EXECUTE FUNCTION public.set_point_year();

-- Generic delete-events for ref
CREATE OR REPLACE FUNCTION public.ref_points_del() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  DELETE FROM public.point_events WHERE reference_id = OLD.id;
  RETURN OLD;
END; $$;

-- Recitations: +4 for new page
CREATE OR REPLACE FUNCTION public.recitation_points_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.kind='page' AND COALESCE(NEW.recitation_type,'new')='new' THEN
    INSERT INTO public.point_events(student_id, points, source, reference_id, reason, created_by)
    VALUES (NEW.student_id, 4, 'recitation', NEW.id, 'صفحة '||NEW.page_number, NEW.teacher_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER recitation_points_ins_trg AFTER INSERT ON public.recitations
FOR EACH ROW EXECUTE FUNCTION public.recitation_points_ins();
CREATE TRIGGER recitation_points_del_trg AFTER DELETE ON public.recitations
FOR EACH ROW EXECUTE FUNCTION public.ref_points_del();

-- Probes: teacher-set points
CREATE OR REPLACE FUNCTION public.probe_points_upsert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  DELETE FROM public.point_events WHERE source='probe' AND reference_id=NEW.id;
  IF COALESCE(NEW.points,0) <> 0 THEN
    INSERT INTO public.point_events(student_id, points, source, reference_id, reason, created_by)
    VALUES (NEW.student_id, NEW.points, 'probe', NEW.id, 'سبر الجزء '||NEW.juz_number, NEW.teacher_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER probe_points_ins_trg AFTER INSERT ON public.probes
FOR EACH ROW EXECUTE FUNCTION public.probe_points_upsert();
CREATE TRIGGER probe_points_upd_trg AFTER UPDATE OF points, juz_number ON public.probes
FOR EACH ROW EXECUTE FUNCTION public.probe_points_upsert();
CREATE TRIGGER probe_points_del_trg AFTER DELETE ON public.probes
FOR EACH ROW EXECUTE FUNCTION public.ref_points_del();

-- Hadiths: teacher-set points
CREATE OR REPLACE FUNCTION public.hadith_points_upsert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  DELETE FROM public.point_events WHERE source='hadith' AND reference_id=NEW.id;
  IF COALESCE(NEW.points,0) <> 0 THEN
    INSERT INTO public.point_events(student_id, points, source, reference_id, reason, created_by)
    VALUES (NEW.student_id, NEW.points, 'hadith', NEW.id, 'حديث '||NEW.hadith_number, NEW.teacher_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER hadith_points_ins_trg AFTER INSERT ON public.hadith_recitations
FOR EACH ROW EXECUTE FUNCTION public.hadith_points_upsert();
CREATE TRIGGER hadith_points_upd_trg AFTER UPDATE OF points, hadith_number ON public.hadith_recitations
FOR EACH ROW EXECUTE FUNCTION public.hadith_points_upsert();
CREATE TRIGGER hadith_points_del_trg AFTER DELETE ON public.hadith_recitations
FOR EACH ROW EXECUTE FUNCTION public.ref_points_del();

-- Attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('present','late')),
  created_by uuid REFERENCES auth.users(id),
  academic_year integer,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);
CREATE INDEX attendance_student_idx ON public.attendance(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "att_select_auth" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "att_insert_admin_sup" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "att_delete_admin_sup" ON public.attendance FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "att_update_admin_sup" ON public.attendance FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

CREATE OR REPLACE FUNCTION public.set_attendance_year() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    SELECT current_academic_year INTO NEW.academic_year FROM public.app_settings WHERE id=1;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER set_attendance_year_trg BEFORE INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.set_attendance_year();

CREATE OR REPLACE FUNCTION public.attendance_points_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pts int;
BEGIN
  pts := CASE WHEN NEW.status='present' THEN 4 WHEN NEW.status='late' THEN 2 ELSE 0 END;
  INSERT INTO public.point_events(student_id, points, source, reference_id, reason, created_by)
  VALUES (NEW.student_id, pts, 'attendance', NEW.id,
    CASE WHEN NEW.status='present' THEN 'حضور' ELSE 'حضور متأخر' END,
    NEW.created_by);
  RETURN NEW;
END; $$;
CREATE TRIGGER attendance_points_ins_trg AFTER INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.attendance_points_ins();
CREATE TRIGGER attendance_points_del_trg AFTER DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.ref_points_del();

-- Public RPCs
CREATE OR REPLACE FUNCTION public.get_student_total_points(_student_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(SUM(points),0)::int FROM public.point_events WHERE student_id=_student_id;
$$;

CREATE OR REPLACE FUNCTION public.get_student_point_events(_student_id uuid)
RETURNS TABLE(id uuid, points integer, source text, reason text, created_at timestamptz, academic_year integer, archived boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, points, source, reason, created_at, academic_year, archived
  FROM public.point_events WHERE student_id=_student_id
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_student_attendance(_student_id uuid)
RETURNS TABLE(id uuid, attendance_date date, status text, academic_year integer, archived boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, attendance_date, status, academic_year, archived
  FROM public.attendance WHERE student_id=_student_id
  ORDER BY attendance_date DESC;
$$;

-- Update start_new_academic_year to include new tables
CREATE OR REPLACE FUNCTION public.start_new_academic_year() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admin can start a new academic year';
  END IF;
  UPDATE public.recitations SET archived = true WHERE archived = false;
  UPDATE public.probes SET archived = true WHERE archived = false;
  UPDATE public.hadith_recitations SET archived = true WHERE archived = false;
  UPDATE public.attendance SET archived = true WHERE archived = false;
  UPDATE public.point_events SET archived = true WHERE archived = false;
  UPDATE public.app_settings SET current_academic_year = current_academic_year + 1, updated_at = now() WHERE id = 1;
END; $$;

-- Update recitations RPC to already include recitation_type (already exists), no change needed.
