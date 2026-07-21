
-- 1. Enrich widgets
ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT 'full' CHECK (size IN ('sm','md','lg','full'));

-- Existing widgets are considered published so nothing disappears
UPDATE public.widgets SET status = 'published' WHERE status = 'draft';

-- 2. event_widgets
CREATE TABLE IF NOT EXISTS public.event_widgets (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  widget_id text NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  size text CHECK (size IN ('sm','md','lg','full')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, widget_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_widgets TO authenticated;
GRANT ALL ON public.event_widgets TO service_role;
ALTER TABLE public.event_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_widgets_select" ON public.event_widgets FOR SELECT TO authenticated
  USING (
    public.is_event_organizer(event_id, auth.uid())
    OR public.is_event_participant(event_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "event_widgets_write_organizer" ON public.event_widgets FOR ALL TO authenticated
  USING (
    public.is_event_organizer(event_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_event_organizer(event_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_event_widgets_updated BEFORE UPDATE ON public.event_widgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. widget_role_bindings
CREATE TABLE IF NOT EXISTS public.widget_role_bindings (
  widget_id text NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (widget_id, role)
);
GRANT SELECT ON public.widget_role_bindings TO authenticated;
GRANT ALL ON public.widget_role_bindings TO service_role;
ALTER TABLE public.widget_role_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wrb_select" ON public.widget_role_bindings FOR SELECT TO authenticated USING (true);
CREATE POLICY "wrb_admin_write" ON public.widget_role_bindings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. dashboard_layout (user_id NULL = default global)
CREATE TABLE IF NOT EXISTS public.dashboard_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  widget_id text NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  size text NOT NULL DEFAULT 'md' CHECK (size IN ('sm','md','lg','full')),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS dashboard_layout_user_widget_uk
  ON public.dashboard_layout (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), widget_id);

GRANT SELECT ON public.dashboard_layout TO authenticated;
GRANT ALL ON public.dashboard_layout TO service_role;
ALTER TABLE public.dashboard_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_layout_select_global_or_own" ON public.dashboard_layout FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "dashboard_layout_admin_write_global" ON public.dashboard_layout FOR ALL TO authenticated
  USING (
    (user_id IS NULL AND public.has_role(auth.uid(), 'admin'))
    OR (user_id = auth.uid())
  )
  WITH CHECK (
    (user_id IS NULL AND public.has_role(auth.uid(), 'admin'))
    OR (user_id = auth.uid())
  );

CREATE TRIGGER trg_dashboard_layout_updated BEFORE UPDATE ON public.dashboard_layout
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Seed dashboard widgets + default global layout
INSERT INTO public.widgets (id, name, description, version, category, manifest, enabled, status, size)
VALUES
  ('dashboard.stats', 'Statistiques', 'Vue d''ensemble chiffrée', '1.0.0', 'Dashboard',
    jsonb_build_object('component','dashboard.stats','surface','dashboard','order',10,'permissions', jsonb_build_array()),
    true, 'published', 'md'),
  ('dashboard.upcoming-events', 'Événements à venir', 'Vos prochains rendez-vous', '1.0.0', 'Dashboard',
    jsonb_build_object('component','dashboard.upcoming-events','surface','dashboard','order',20,'permissions', jsonb_build_array()),
    true, 'published', 'lg'),
  ('dashboard.quick-actions', 'Actions rapides', 'Créer, inviter, explorer', '1.0.0', 'Dashboard',
    jsonb_build_object('component','dashboard.quick-actions','surface','dashboard','order',30,'permissions', jsonb_build_array()),
    true, 'published', 'md'),
  ('dashboard.recent-activity', 'Activité récente', 'Dernières mises à jour', '1.0.0', 'Dashboard',
    jsonb_build_object('component','dashboard.recent-activity','surface','dashboard','order',40,'permissions', jsonb_build_array()),
    true, 'published', 'full'),
  ('event.new.type', 'Étape 1 · Type', 'Choix du type d''événement', '1.0.0', 'Wizard',
    jsonb_build_object('component','event.new.type','surface','event.new','order',10,'permissions', jsonb_build_array()),
    true, 'published', 'full'),
  ('event.new.info', 'Étape 2 · Informations', 'Titre, date, lieu', '1.0.0', 'Wizard',
    jsonb_build_object('component','event.new.info','surface','event.new','order',20,'permissions', jsonb_build_array()),
    true, 'published', 'full'),
  ('event.new.widgets', 'Étape 3 · Widgets', 'Widgets activés à la création', '1.0.0', 'Wizard',
    jsonb_build_object('component','event.new.widgets','surface','event.new','order',30,'permissions', jsonb_build_array()),
    true, 'published', 'full')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.dashboard_layout (user_id, widget_id, position, size, visible)
VALUES
  (NULL, 'dashboard.stats', 10, 'md', true),
  (NULL, 'dashboard.quick-actions', 20, 'md', true),
  (NULL, 'dashboard.upcoming-events', 30, 'lg', true),
  (NULL, 'dashboard.recent-activity', 40, 'full', true)
ON CONFLICT DO NOTHING;
