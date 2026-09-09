CREATE OR REPLACE FUNCTION public.export_courses_data(_course_ids uuid[])
 RETURNS TABLE(course_name text, course_year integer, student_name text, nickname text, father_name text, mother_name text, father_phone text, mother_phone text, contact_phone text, address text, father_job text, grade_level text, birth_year integer, teacher_name text, pages_count integer, surahs_count integer, probes_count integer, hadiths_count integer, present_count integer, late_count integer, total_points integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.name, c.year, s.full_name, s.nickname, s.father_name, s.mother_name,
    s.father_phone, s.mother_phone, s.contact_phone, s.address, s.father_job,
    s.grade_level, s.birth_year, p.full_name,
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='page'),0),
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='surah'),0),
    COALESCE((SELECT count(*)::int FROM public.probes pr WHERE pr.student_id=s.id AND pr.course_id=c.id),0),
    COALESCE((SELECT count(*)::int FROM public.hadith_recitations h WHERE h.student_id=s.id AND h.course_id=c.id),0),
    COALESCE((SELECT count(*)::int FROM public.attendance a WHERE a.student_id=s.id AND a.course_id=c.id AND a.status='present'),0),
    COALESCE((SELECT count(*)::int FROM public.attendance a WHERE a.student_id=s.id AND a.course_id=c.id AND a.status='late'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id),0)
  FROM public.courses c
  CROSS JOIN public.students s
  LEFT JOIN public.profiles p ON p.id = s.teacher_id
  WHERE c.id = ANY(_course_ids)
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'))
  ORDER BY c.started_at DESC, s.full_name;
$function$;

CREATE OR REPLACE FUNCTION public.export_points_data(_course_ids uuid[])
 RETURNS TABLE(course_name text, course_year integer, student_name text, nickname text, father_name text, grade_level text, teacher_name text, pages_points integer, surahs_points integer, probes_points integer, hadiths_points integer, attendance_points integer, manual_points integer, total_points integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.name, c.year, s.full_name, s.nickname, s.father_name, s.grade_level, p.full_name,
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe JOIN public.recitations r ON r.id=pe.reference_id
              WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='recitation' AND r.kind='page'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe JOIN public.recitations r ON r.id=pe.reference_id
              WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='recitation' AND r.kind='surah'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='probe'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='hadith'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='attendance'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id
              AND pe.source NOT IN ('recitation','probe','hadith','attendance')),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id),0)
  FROM public.courses c
  CROSS JOIN public.students s
  LEFT JOIN public.profiles p ON p.id = s.teacher_id
  WHERE c.id = ANY(_course_ids)
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'))
  ORDER BY c.started_at DESC, 14 DESC, s.full_name;
$function$;

CREATE OR REPLACE FUNCTION public.export_recitations_data(_course_ids uuid[])
 RETURNS TABLE(course_name text, course_year integer, student_name text, nickname text, father_name text, grade_level text, teacher_name text, pages_count integer, pages_list text, surahs_count integer, surahs_list text, probes_count integer, probes_list text, hadiths_count integer, hadiths_list text, total_points integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.name, c.year, s.full_name, s.nickname, s.father_name, s.grade_level, p.full_name,
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='page'),0),
    COALESCE((SELECT string_agg(r.page_number::text, ', ' ORDER BY r.page_number) FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='page'),''),
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='surah'),0),
    COALESCE((SELECT string_agg(r.surah_number::text, ', ' ORDER BY r.surah_number) FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='surah'),''),
    COALESCE((SELECT count(*)::int FROM public.probes pr WHERE pr.student_id=s.id AND pr.course_id=c.id),0),
    COALESCE((SELECT string_agg(pr.juz_number::text, ', ' ORDER BY pr.juz_number) FROM public.probes pr WHERE pr.student_id=s.id AND pr.course_id=c.id),''),
    COALESCE((SELECT count(*)::int FROM public.hadith_recitations h WHERE h.student_id=s.id AND h.course_id=c.id),0),
    COALESCE((SELECT string_agg(h.hadith_number::text, ', ' ORDER BY h.hadith_number) FROM public.hadith_recitations h WHERE h.student_id=s.id AND h.course_id=c.id),''),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id),0)
  FROM public.courses c
  CROSS JOIN public.students s
  LEFT JOIN public.profiles p ON p.id = s.teacher_id
  WHERE c.id = ANY(_course_ids)
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'))
  ORDER BY c.started_at DESC, s.full_name;
$function$;