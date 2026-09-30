-- 1 + 2: no auto-admin; invites only honoured for confirmed e-mail addresses
CREATE OR REPLACE FUNCTION public.claim_access()
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _confirmed boolean;
BEGIN
  IF _uid IS NULL THEN RETURN 'none'; END IF;
  IF public.has_role(_uid, 'admin') THEN RETURN 'admin'; END IF;
  IF public.has_role(_uid, 'legal') THEN RETURN 'legal'; END IF;
  SELECT lower(u.email), (u.email_confirmed_at IS NOT NULL)
    INTO _email, _confirmed FROM auth.users u WHERE u.id = _uid;
  IF coalesce(_confirmed, false) AND _email IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.invites WHERE lower(email) = _email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'legal') ON CONFLICT DO NOTHING;
    RETURN 'legal';
  END IF;
  RETURN 'none';
END;
$function$;

-- 3: "who did what" is stamped server-side from the verified session
CREATE OR REPLACE FUNCTION public.stamp_actor()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF TG_TABLE_NAME = 'resolution_notes' THEN
    NEW.author_id := auth.uid();
    NEW.author_email := _email;
  ELSE
    NEW.updated_by_email := _email;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.stamp_actor() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER stamp_resolutions BEFORE INSERT OR UPDATE ON public.resolutions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER stamp_reference BEFORE INSERT OR UPDATE ON public.reference_values
  FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER stamp_notes BEFORE INSERT ON public.resolution_notes
  FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();

-- 4: visitors who are not signed in cannot read team e-mails
REVOKE SELECT ON public.resolutions FROM anon;
GRANT SELECT (doc_id, status, updated_at) ON public.resolutions TO anon;
REVOKE SELECT ON public.reference_values FROM anon;
GRANT SELECT (topic_param, scope, value, source, source_url, effective_date, updated_at) ON public.reference_values TO anon;