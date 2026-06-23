
CREATE OR REPLACE FUNCTION public.search_students_by_name(_query text)
 RETURNS TABLE(id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id,
         TRIM(
           COALESCE(s.full_name, '') || ' ' ||
           COALESCE(s.father_name, '') || ' ' ||
           COALESCE(s.nickname, '')
         ) AS full_name
  FROM public.students s
  WHERE s.full_name ILIKE '%' || _query || '%'
     OR s.nickname ILIKE '%' || _query || '%'
     OR s.father_name ILIKE '%' || _query || '%'
     OR (COALESCE(s.full_name, '') || ' ' || COALESCE(s.father_name, '') || ' ' || COALESCE(s.nickname, '')) ILIKE '%' || _query || '%'
  ORDER BY s.full_name
  LIMIT 30
$function$;

CREATE OR REPLACE FUNCTION public.get_student_basic(_student_id uuid)
 RETURNS TABLE(id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id,
         TRIM(
           COALESCE(s.full_name, '') || ' ' ||
           COALESCE(s.father_name, '') || ' ' ||
           COALESCE(s.nickname, '')
         ) AS full_name
  FROM public.students s WHERE s.id = _student_id
$function$;

UPDATE public.app_settings SET current_academic_year = 2025, updated_at = now() WHERE id = 1;
