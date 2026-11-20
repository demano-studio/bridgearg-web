-- Fix 42501 permission denied:
-- 1) Public catalog filters deleted_at but anon lacked column SELECT (014 lock-down).
-- 2) Admin Trade badge counts trade_applications as authenticated but only service_role had GRANT.

-- Public site: allow filtering soft-deleted artworks without exposing CRM columns.
GRANT SELECT (deleted_at) ON public.artworks TO anon;

-- Admin badge / sidebar: authenticated needs table SELECT + RLS.
GRANT SELECT ON public.trade_applications TO authenticated;

DROP POLICY IF EXISTS "Admin can read trade_applications with trade view"
  ON public.trade_applications;
CREATE POLICY "Admin can read trade_applications with trade view"
  ON public.trade_applications FOR SELECT TO authenticated
  USING (
    public.is_admin_owner()
    OR public.admin_can('trade', 'view')
  );
