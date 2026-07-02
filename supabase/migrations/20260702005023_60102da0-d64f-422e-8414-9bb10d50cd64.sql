ALTER TABLE public.recitations ADD COLUMN IF NOT EXISTS recitation_type text NOT NULL DEFAULT 'new' CHECK (recitation_type IN ('new','old'));

DROP FUNCTION IF EXISTS public.get_student_recitations(uuid);
CREATE OR REPLACE FUNCTION public.get_student_recitations(_student_id uuid)
 RETURNS TABLE(id uuid, kind text, page_number integer, surah_number integer, from_ayah integer, to_ayah integer, grade text, notes text, recitation_date date, academic_year integer, archived boolean, recitation_type text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, kind, page_number, surah_number, from_ayah, to_ayah,
         grade, notes, recitation_date, academic_year, archived, recitation_type
  FROM public.recitations WHERE student_id = _student_id
  ORDER BY recitation_date DESC, created_at DESC
$$;