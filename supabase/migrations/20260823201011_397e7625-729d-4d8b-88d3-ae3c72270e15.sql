CREATE TABLE public.menu_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'UtensilsCrossed',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  event_types text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.menu_components TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_components TO authenticated;
GRANT ALL ON public.menu_components TO service_role;

ALTER TABLE public.menu_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_components_select_auth" ON public.menu_components
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_components_insert_admin" ON public.menu_components
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "menu_components_update_admin" ON public.menu_components
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "menu_components_delete_admin" ON public.menu_components
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_menu_components_updated
  BEFORE UPDATE ON public.menu_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.menu_components (key, label, icon, sort_order, event_types) VALUES
  ('aperitif', 'Apéritif', 'Martini', 10, '{}'),
  ('grignotage', 'Grignotage', 'Cookie', 20, '{}'),
  ('entree', 'Entrée', 'Salad', 30, '{}'),
  ('plat', 'Plat', 'UtensilsCrossed', 40, '{}'),
  ('accompagnement', 'Accompagnement', 'Wheat', 50, '{}'),
  ('fromage', 'Fromage', 'Croissant', 60, '{}'),
  ('dessert', 'Dessert', 'CakeSlice', 70, '{}'),
  ('boisson', 'Boissons', 'Wine', 80, '{}');