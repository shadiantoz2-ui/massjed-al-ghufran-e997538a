
ALTER TABLE public.probes ADD COLUMN IF NOT EXISTS recitation_type text NOT NULL DEFAULT 'new';
ALTER TABLE public.hadith_recitations ADD COLUMN IF NOT EXISTS recitation_type text NOT NULL DEFAULT 'new';

DROP FUNCTION IF EXISTS public.get_student_probes(uuid);
DROP FUNCTION IF EXISTS public.get_student_hadiths(uuid);

CREATE OR REPLACE FUNCTION public.get_student_probes(_student_id uuid)
 RETURNS TABLE(id uuid, juz_number integer, grade text, notes text, probe_date date, academic_year integer, archived boolean, recitation_type text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT id, juz_number, grade, notes, probe_date, academic_year, archived, recitation_type
  FROM public.probes WHERE student_id = _student_id
  ORDER BY probe_date DESC, created_at DESC
$function$;

CREATE OR REPLACE FUNCTION public.get_student_hadiths(_student_id uuid)
 RETURNS TABLE(id uuid, hadith_number integer, teacher_id uuid, grade text, notes text, recitation_date date, academic_year integer, archived boolean, recitation_type text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT id, hadith_number, teacher_id, grade, notes, recitation_date, academic_year, archived, recitation_type
  FROM public.hadith_recitations WHERE student_id = _student_id
  ORDER BY recitation_date DESC, created_at DESC;
$function$;
