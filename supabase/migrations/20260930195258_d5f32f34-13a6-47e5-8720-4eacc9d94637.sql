REVOKE SELECT ON public.resolutions FROM authenticated;
REVOKE SELECT ON public.reference_values FROM authenticated;
GRANT SELECT (doc_id, status, updated_at) ON public.resolutions TO authenticated;
GRANT SELECT (topic_param, scope, value, source, source_url, effective_date, updated_at) ON public.reference_values TO authenticated;

CREATE OR REPLACE FUNCTION public.team_resolution_audit()
RETURNS TABLE(doc_id text, updated_by_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT r.doc_id, r.updated_by_email FROM public.resolutions r WHERE public.is_team(auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.team_reference_audit()
RETURNS TABLE(topic_param text, scope text, updated_by_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT v.topic_param, v.scope, v.updated_by_email FROM public.reference_values v WHERE public.is_team(auth.uid()) $$;

REVOKE EXECUTE ON FUNCTION public.team_resolution_audit() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_reference_audit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_resolution_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_reference_audit() TO authenticated;