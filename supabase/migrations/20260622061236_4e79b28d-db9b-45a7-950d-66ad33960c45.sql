ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nickname TEXT;

CREATE OR REPLACE FUNCTION public.search_students_by_name(_query text)
 RETURNS TABLE(id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id,
         TRIM(
           COALESCE(s.full_name, '') || ' ' ||
           COALESCE(s.nickname, '') || ' ' ||
           COALESCE(s.father_name, '')
         ) AS full_name
  FROM public.students s
  WHERE s.full_name ILIKE '%' || _query || '%'
     OR s.nickname ILIKE '%' || _query || '%'
     OR s.father_name ILIKE '%' || _query || '%'
     OR (COALESCE(s.full_name, '') || ' ' || COALESCE(s.nickname, '') || ' ' || COALESCE(s.father_name, '')) ILIKE '%' || _query || '%'
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
           COALESCE(s.nickname, '') || ' ' ||
           COALESCE(s.father_name, '')
         ) AS full_name
  FROM public.students s WHERE s.id = _student_id
$function$;