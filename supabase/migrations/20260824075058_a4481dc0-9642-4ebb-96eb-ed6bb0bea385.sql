-- 1. Tighten broad SELECT on shared configuration tables
DROP POLICY IF EXISTS "widgets_select_authenticated" ON public.widgets;
CREATE POLICY "widgets_select_authenticated" ON public.widgets
  FOR SELECT TO authenticated
  USING ((enabled = true AND status = 'published') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "extensions_read_authenticated" ON public.extensions;
CREATE POLICY "extensions_read_authenticated" ON public.extensions
  FOR SELECT TO authenticated
  USING (enabled = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "event_types_select_authenticated" ON public.event_types;
CREATE POLICY "event_types_select_authenticated" ON public.event_types
  FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "menu_components_select_auth" ON public.menu_components;
CREATE POLICY "menu_components_select_auth" ON public.menu_components
  FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

-- 2. widget_role_bindings: only bindings of active widgets, admins see all
DROP POLICY IF EXISTS "wrb_select" ON public.widget_role_bindings;
CREATE POLICY "wrb_select" ON public.widget_role_bindings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.widgets w
      WHERE w.id = widget_role_bindings.widget_id
        AND w.enabled = true
        AND w.status = 'published'
    )
  );

-- 3. email_verification_tokens: server-only (service role), deny all client access
REVOKE ALL ON public.email_verification_tokens FROM anon, authenticated;
GRANT ALL ON public.email_verification_tokens TO service_role;
ALTER TABLE public.email_verification_tokens FORCE ROW LEVEL SECURITY;

-- 4. SECURITY DEFINER function execution privileges
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_event_organizer(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_event_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_event_organizer(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_event_participant(uuid, uuid) TO authenticated, service_role;