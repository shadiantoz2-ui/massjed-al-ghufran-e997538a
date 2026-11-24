CREATE TABLE public.admin_conversations (user_id uuid PRIMARY KEY, messages jsonb NOT NULL DEFAULT '[]'::jsonb, generation uuid NOT NULL DEFAULT gen_random_uuid(), busy_until timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_conversations TO authenticated;
GRANT ALL ON public.admin_conversations TO service_role;
ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_conversation_owner ON public.admin_conversations FOR ALL TO authenticated USING (user_id = auth.uid() AND public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.admin_student_statistics(_from date DEFAULT NULL, _to date DEFAULT NULL, _name text DEFAULT '', _course uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF _from > _to THEN RAISE EXCEPTION 'Invalid date range'; END IF;
RETURN (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM (
SELECT s.id, s.full_name, s.nickname, s.grade_level, s.birth_year, p.full_name AS teacher_name,
(SELECT count(*) FROM public.recitations r WHERE r.student_id=s.id AND r.kind='page' AND (_from IS NULL OR r.recitation_date>=_from) AND (_to IS NULL OR r.recitation_date<=_to) AND (_course IS NULL OR r.course_id=_course)) AS pages_count,
(SELECT count(DISTINCT r.page_number) FROM public.recitations r WHERE r.student_id=s.id AND r.kind='page' AND (_from IS NULL OR r.recitation_date>=_from) AND (_to IS NULL OR r.recitation_date<=_to) AND (_course IS NULL OR r.course_id=_course)) AS unique_pages_count,
(SELECT count(*) FROM public.recitations r WHERE r.student_id=s.id AND r.kind='surah' AND (_from IS NULL OR r.recitation_date>=_from) AND (_to IS NULL OR r.recitation_date<=_to) AND (_course IS NULL OR r.course_id=_course)) AS surahs_count,
(SELECT count(*) FROM public.probes r WHERE r.student_id=s.id AND (_from IS NULL OR r.probe_date>=_from) AND (_to IS NULL OR r.probe_date<=_to) AND (_course IS NULL OR r.course_id=_course)) AS probes_count,
(SELECT count(*) FROM public.hadith_recitations r WHERE r.student_id=s.id AND (_from IS NULL OR r.recitation_date>=_from) AND (_to IS NULL OR r.recitation_date<=_to) AND (_course IS NULL OR r.course_id=_course)) AS hadiths_count,
(SELECT count(*) FROM public.attendance r WHERE r.student_id=s.id AND r.status='present' AND (_from IS NULL OR r.attendance_date>=_from) AND (_to IS NULL OR r.attendance_date<=_to) AND (_course IS NULL OR r.course_id=_course)) AS early_count,
(SELECT count(*) FROM public.attendance r WHERE r.student_id=s.id AND r.status='late' AND (_from IS NULL OR r.attendance_date>=_from) AND (_to IS NULL OR r.attendance_date<=_to) AND (_course IS NULL OR r.course_id=_course)) AS late_count,
(SELECT coalesce(sum(r.points),0) FROM public.point_events r WHERE r.student_id=s.id AND (_from IS NULL OR (r.created_at AT TIME ZONE 'Asia/Damascus')::date>=_from) AND (_to IS NULL OR (r.created_at AT TIME ZONE 'Asia/Damascus')::date<=_to) AND (_course IS NULL OR r.course_id=_course)) AS points
FROM public.students s LEFT JOIN public.profiles p ON p.id=s.teacher_id
WHERE NOT EXISTS (SELECT 1 FROM regexp_split_to_table(trim(coalesce(_name,'')), '\s+') word WHERE word<>'' AND s.full_name NOT ILIKE '%'||word||'%') ORDER BY s.full_name
) t);
END; $$;
REVOKE ALL ON FUNCTION public.admin_student_statistics(date,date,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_student_statistics(date,date,text,uuid) TO authenticated;
CREATE INDEX IF NOT EXISTS recitations_student_date_idx ON public.recitations(student_id,recitation_date);
CREATE INDEX IF NOT EXISTS attendance_student_date_idx ON public.attendance(student_id,attendance_date);