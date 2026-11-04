-- 017: Trade Program applications.
-- Solo service_role puede leer/escribir (RLS on, sin policies; revoke a anon/authenticated).

CREATE TABLE IF NOT EXISTS public.trade_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  website TEXT,
  role TEXT NOT NULL
    CHECK (role IN ('interior_designer', 'architect', 'developer', 'art_consultant', 'other')),
  project_type TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  marketing_consent BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_trade_applications_email_created
  ON public.trade_applications (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_applications_status
  ON public.trade_applications (status);

ALTER TABLE public.trade_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.trade_applications FROM PUBLIC;
REVOKE ALL ON TABLE public.trade_applications FROM anon, authenticated;
GRANT ALL ON TABLE public.trade_applications TO service_role;

COMMENT ON TABLE public.trade_applications IS 'Solicitudes al Trade Program (diseñadores, arquitectos, etc.). Solo service_role.';
