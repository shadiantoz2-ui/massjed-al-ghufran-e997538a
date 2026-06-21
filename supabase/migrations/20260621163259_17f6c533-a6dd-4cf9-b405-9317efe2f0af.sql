
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'reciter');

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  father_name TEXT,
  mother_name TEXT,
  student_phone TEXT,
  father_phone TEXT,
  mother_phone TEXT,
  address TEXT,
  father_job TEXT,
  birth_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX students_name_idx ON public.students USING gin (full_name gin_trgm_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  kind TEXT NOT NULL CHECK (kind IN ('page','surah')),
  page_number INT CHECK (page_number BETWEEN 1 AND 581),
  surah_number INT CHECK (surah_number BETWEEN 78 AND 114),
  from_ayah INT,
  to_ayah INT,
  grade TEXT CHECK (grade IN ('excellent','very_good','good','needs_review')),
  notes TEXT,
  recitation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  academic_year INT NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recitations_student_idx ON public.recitations(student_id);
CREATE INDEX recitations_teacher_idx ON public.recitations(teacher_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recitations TO authenticated;
GRANT ALL ON public.recitations TO service_role;
ALTER TABLE public.recitations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.app_settings (id) VALUES (1);
GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "user_roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "students_select_auth" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "students_insert_sup_admin" ON public.students FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "students_update_sup_admin" ON public.students FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "students_delete_sup_admin" ON public.students FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

CREATE POLICY "recitations_select_auth" ON public.recitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "recitations_insert_any_teacher" ON public.recitations FOR INSERT TO authenticated WITH CHECK (
  teacher_id = auth.uid() AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'reciter')
  )
);
CREATE POLICY "recitations_update_rules" ON public.recitations FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor')
  OR (public.has_role(auth.uid(),'reciter') AND teacher_id = auth.uid())
);
CREATE POLICY "recitations_delete_rules" ON public.recitations FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor')
  OR (public.has_role(auth.uid(),'reciter') AND teacher_id = auth.uid())
);

CREATE POLICY "app_settings_select_all" ON public.app_settings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "app_settings_admin_update" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1))
  ) ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.search_students_by_name(_query TEXT)
RETURNS TABLE(id UUID, full_name TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name FROM public.students
  WHERE full_name ILIKE '%' || _query || '%'
  ORDER BY full_name LIMIT 20
$$;
GRANT EXECUTE ON FUNCTION public.search_students_by_name(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_student_recitations(_student_id UUID)
RETURNS TABLE(
  id UUID, kind TEXT, page_number INT, surah_number INT,
  from_ayah INT, to_ayah INT, grade TEXT, notes TEXT,
  recitation_date DATE, academic_year INT, archived BOOLEAN
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, kind, page_number, surah_number, from_ayah, to_ayah,
         grade, notes, recitation_date, academic_year, archived
  FROM public.recitations WHERE student_id = _student_id
  ORDER BY recitation_date DESC, created_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.get_student_recitations(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_student_basic(_student_id UUID)
RETURNS TABLE(id UUID, full_name TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name FROM public.students WHERE id = _student_id
$$;
GRANT EXECUTE ON FUNCTION public.get_student_basic(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_new_academic_year()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admin can start a new academic year';
  END IF;
  UPDATE public.recitations SET archived = true WHERE archived = false;
  UPDATE public.app_settings SET current_academic_year = current_academic_year + 1, updated_at = now() WHERE id = 1;
END; $$;
GRANT EXECUTE ON FUNCTION public.start_new_academic_year() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_recitation_year()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    SELECT current_academic_year INTO NEW.academic_year FROM public.app_settings WHERE id = 1;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER set_recitation_year_trg BEFORE INSERT ON public.recitations
  FOR EACH ROW EXECUTE FUNCTION public.set_recitation_year();
