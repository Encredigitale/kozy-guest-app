
CREATE TABLE public.extensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  enabled BOOLEAN NOT NULL DEFAULT true,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.extensions TO authenticated;
GRANT ALL ON public.extensions TO service_role;

ALTER TABLE public.extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extensions_read_authenticated" ON public.extensions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "extensions_admin_insert" ON public.extensions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "extensions_admin_update" ON public.extensions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "extensions_admin_delete" ON public.extensions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER extensions_updated_at BEFORE UPDATE ON public.extensions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample extensions
INSERT INTO public.extensions (key, name, description, category, manifest) VALUES
  ('weather', 'Météo', 'Prévision météo pour les événements', 'utility',
   '{"widgets":["ext.weather"],"menu":[{"label":"Météo","path":"weather","icon":"CloudSun"}]}'::jsonb),
  ('menu-suggestions', 'Suggestions de menus', 'Idées de menus par type d''événement', 'catering',
   '{"widgets":["ext.menu-suggestions"],"screens":[{"path":"menu-suggestions","label":"Suggestions"}],"menu":[{"label":"Menus","path":"menu-suggestions","icon":"UtensilsCrossed"}]}'::jsonb),
  ('pdf-export', 'Export PDF', 'Exporter un événement en PDF', 'export',
   '{"widgets":["ext.pdf-export"]}'::jsonb),
  ('stats-advanced', 'Statistiques avancées', 'Tableaux de bord analytiques', 'analytics',
   '{"screens":[{"path":"stats","label":"Statistiques"}],"menu":[{"label":"Statistiques","path":"stats","icon":"BarChart3"}]}'::jsonb);
