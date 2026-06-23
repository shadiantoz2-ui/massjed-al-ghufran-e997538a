CREATE OR REPLACE FUNCTION public.search_students_by_name(_query text)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tokens text[];
BEGIN
  tokens := regexp_split_to_array(btrim(_query), '\s+');
  RETURN QUERY
  SELECT s.id,
         TRIM(
           COALESCE(s.full_name, '') || ' ' ||
           COALESCE(s.father_name, '') || ' ' ||
           COALESCE(s.nickname, '')
         ) AS full_name
  FROM public.students s
  WHERE (
    SELECT bool_and(
      COALESCE(s.full_name, '')   ILIKE '%' || tok || '%' OR
      COALESCE(s.father_name, '') ILIKE '%' || tok || '%' OR
      COALESCE(s.nickname, '')    ILIKE '%' || tok || '%'
    )
    FROM unnest(tokens) AS tok
    WHERE tok <> ''
  )
  ORDER BY s.full_name
  LIMIT 30;
END;
$function$;