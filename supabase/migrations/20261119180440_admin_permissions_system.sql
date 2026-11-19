-- Granular admin permissions (owner bypass + per-section view/edit).

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  is_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_lower
  ON public.admin_users (lower(email));

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  user_id uuid NOT NULL REFERENCES public.admin_users (user_id) ON DELETE CASCADE,
  section text NOT NULL
    CHECK (section IN (
      'resumen', 'obras', 'artistas', 'lotes', 'pedidos',
      'mensajes', 'suscriptores', 'trade', 'papelera', 'equipo'
    )),
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, section)
);

COMMENT ON TABLE public.admin_users IS 'Admin team members; is_owner bypasses all section checks.';
COMMENT ON TABLE public.admin_permissions IS 'Per-section view/edit flags for non-owner admins.';

-- Helpers (security definer — bypass RLS on admin_* when evaluating policies)
CREATE OR REPLACE FUNCTION public.is_admin_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users u
    WHERE u.user_id = auth.uid()
      AND u.is_owner = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_owner_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users u
    WHERE u.user_id = p_user_id
      AND u.is_owner = true
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_can(p_section text, p_mode text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin_owner()
    OR EXISTS (
      SELECT 1
      FROM public.admin_permissions p
      WHERE p.user_id = auth.uid()
        AND p.section = p_section
        AND (
          (lower(p_mode) = 'view' AND (p.can_view OR p.can_edit))
          OR (lower(p_mode) = 'edit' AND p.can_edit)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.admin_can_user(p_user_id uuid, p_section text, p_mode text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin_owner_user(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.admin_permissions p
      WHERE p.user_id = p_user_id
        AND p.section = p_section
        AND (
          (lower(p_mode) = 'view' AND (p.can_view OR p.can_edit))
          OR (lower(p_mode) = 'edit' AND p.can_edit)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users u WHERE u.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_owner_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_can(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_can_user(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_member() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_owner_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_can(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_can_user(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_member() TO authenticated, service_role;

-- Seed current owner
INSERT INTO public.admin_users (user_id, email, is_owner)
SELECT id, lower(email), true
FROM auth.users
WHERE lower(email) = 'ignacio.concioni@bridgearg.net'
ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      is_owner = true;

-- RLS on permission tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
CREATE POLICY "admin_users_select"
  ON public.admin_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_owner());

DROP POLICY IF EXISTS "admin_users_update" ON public.admin_users;
CREATE POLICY "admin_users_update"
  ON public.admin_users FOR UPDATE TO authenticated
  USING (public.is_admin_owner())
  WITH CHECK (public.is_admin_owner());

DROP POLICY IF EXISTS "admin_users_delete" ON public.admin_users;
CREATE POLICY "admin_users_delete"
  ON public.admin_users FOR DELETE TO authenticated
  USING (public.is_admin_owner() AND is_owner = false);

DROP POLICY IF EXISTS "admin_permissions_select" ON public.admin_permissions;
CREATE POLICY "admin_permissions_select"
  ON public.admin_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_owner());

DROP POLICY IF EXISTS "admin_permissions_write" ON public.admin_permissions;
CREATE POLICY "admin_permissions_write"
  ON public.admin_permissions FOR ALL TO authenticated
  USING (public.is_admin_owner())
  WITH CHECK (public.is_admin_owner());

GRANT SELECT, UPDATE, DELETE ON public.admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
GRANT ALL ON public.admin_permissions TO service_role;

-- Tighten SELECT policies on sensitive / admin tables
DROP POLICY IF EXISTS "Solo admin autenticado puede leer purchases" ON public.purchases;
CREATE POLICY "Admin can read purchases with pedidos view"
  ON public.purchases FOR SELECT TO authenticated
  USING (public.admin_can('pedidos', 'view'));

DROP POLICY IF EXISTS "Authenticated can read contact_messages" ON public.contact_messages;
CREATE POLICY "Admin can read contact_messages with mensajes view"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.admin_can('mensajes', 'view'));

DROP POLICY IF EXISTS "Authenticated can read newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admin can read newsletter_subscribers with suscriptores view"
  ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.admin_can('suscriptores', 'view'));

DROP POLICY IF EXISTS "Authenticated can read artwork_status_history" ON public.artwork_status_history;
CREATE POLICY "Admin can read artwork_status_history with obras view"
  ON public.artwork_status_history FOR SELECT TO authenticated
  USING (public.admin_can('obras', 'view'));

DROP POLICY IF EXISTS "Authenticated can read all artworks" ON public.artworks;
CREATE POLICY "Admin can read artworks by section"
  ON public.artworks FOR SELECT TO authenticated
  USING (
    public.is_admin_owner()
    OR (
      deleted_at IS NULL
      AND (
        public.admin_can('obras', 'view')
        OR public.admin_can('resumen', 'view')
        OR public.admin_can('artistas', 'view')
        OR public.admin_can('lotes', 'view')
      )
    )
    OR (
      deleted_at IS NOT NULL
      AND public.admin_can('papelera', 'view')
    )
  );

DROP POLICY IF EXISTS "Authenticated can read all lotes" ON public.lotes;
CREATE POLICY "Admin can read lotes by section"
  ON public.lotes FOR SELECT TO authenticated
  USING (
    public.is_admin_owner()
    OR (
      deleted_at IS NULL
      AND (
        public.admin_can('lotes', 'view')
        OR public.admin_can('obras', 'view')
        OR public.admin_can('resumen', 'view')
      )
    )
    OR (
      deleted_at IS NOT NULL
      AND public.admin_can('papelera', 'view')
    )
  );
