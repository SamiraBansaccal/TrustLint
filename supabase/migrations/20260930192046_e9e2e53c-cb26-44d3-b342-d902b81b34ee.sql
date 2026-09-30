CREATE TYPE public.app_role AS ENUM ('admin', 'legal');
CREATE TYPE public.resolution_status AS ENUM ('open', 'in_progress', 'fixed');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE TABLE public.invites (
  email text PRIMARY KEY,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invites" ON public.invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Called after sign-in: first user becomes admin, invited emails become legal.
CREATE OR REPLACE FUNCTION public.claim_access()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF _uid IS NULL THEN RETURN 'none'; END IF;
  IF public.has_role(_uid, 'admin') THEN RETURN 'admin'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin') ON CONFLICT DO NOTHING;
    RETURN 'admin';
  END IF;
  IF public.has_role(_uid, 'legal') THEN RETURN 'legal'; END IF;
  IF _email <> '' AND EXISTS (SELECT 1 FROM public.invites WHERE lower(email) = _email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'legal') ON CONFLICT DO NOTHING;
    RETURN 'legal';
  END IF;
  RETURN 'none';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_access() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_access() TO authenticated;

CREATE TABLE public.resolutions (
  doc_id text PRIMARY KEY CHECK (char_length(doc_id) BETWEEN 1 AND 20),
  status public.resolution_status NOT NULL DEFAULT 'open',
  updated_by_email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resolutions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.resolutions TO authenticated;
GRANT ALL ON public.resolutions TO service_role;
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads resolutions" ON public.resolutions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Team inserts resolutions" ON public.resolutions FOR INSERT TO authenticated WITH CHECK (public.is_team(auth.uid()));
CREATE POLICY "Team updates resolutions" ON public.resolutions FOR UPDATE TO authenticated USING (public.is_team(auth.uid())) WITH CHECK (public.is_team(auth.uid()));

CREATE TABLE public.resolution_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id text NOT NULL CHECK (char_length(doc_id) BETWEEN 1 AND 20),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  author_id uuid NOT NULL DEFAULT auth.uid(),
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.resolution_notes TO authenticated;
GRANT ALL ON public.resolution_notes TO service_role;
ALTER TABLE public.resolution_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads notes" ON public.resolution_notes FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "Team writes own notes" ON public.resolution_notes FOR INSERT TO authenticated WITH CHECK (public.is_team(auth.uid()) AND author_id = auth.uid());

CREATE TABLE public.reference_values (
  topic_param text NOT NULL,
  scope text NOT NULL,
  value text NOT NULL CHECK (char_length(value) BETWEEN 1 AND 60),
  source text NOT NULL,
  source_url text,
  effective_date date NOT NULL,
  updated_by_email text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_param, scope)
);
GRANT SELECT ON public.reference_values TO anon;
GRANT SELECT, UPDATE ON public.reference_values TO authenticated;
GRANT ALL ON public.reference_values TO service_role;
ALTER TABLE public.reference_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads reference" ON public.reference_values FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Team updates reference" ON public.reference_values FOR UPDATE TO authenticated USING (public.is_team(auth.uid())) WITH CHECK (public.is_team(auth.uid()));

INSERT INTO public.reference_values (topic_param, scope, value, source, source_url, effective_date) VALUES
('indexation.rate','BE-CP200','2.21%','Agoria – CP 200 indexation 1 Jan 2026','https://www.agoria.be/fr/services/expertise/hr-legal-social-dialogue/consultation-sectorielle-et-commissions-paritaires/pc-200/cp-200-indexation-des-salaires-de-221-au-1er-janvier-2026','2026-01-01'),
('meal_voucher.employer_max','BE','€8.91','Royal Decree 10 Nov 2025 (Belgian Official Gazette 17 Nov 2025)','https://www.bakermckenzie.com/en/insight/publications/alerts/2025/11/belgium-upcoming-increase-in-meal-voucher-value','2026-01-01'),
('dimona.deadline','BE','before_start','Belgian social security – Dimona (declaration at the latest when work starts)','https://www.socialsecurity.be/site_en/employer/applics/dimona/index.htm','2026-01-01'),
('payslip_archive.retention','BE','5 years','Royal Decree 8 Aug 1980 on social documents (5-year retention)','https://employment.belgium.be/en','2026-01-01'),
('holiday_allowance.rate','NL','8%','Dutch Minimum Wage and Holiday Allowance Act (Wml), art. 15','https://www.government.nl/topics/minimum-wage/holiday-allowance','2026-01-01');

ALTER PUBLICATION supabase_realtime ADD TABLE public.resolutions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reference_values;