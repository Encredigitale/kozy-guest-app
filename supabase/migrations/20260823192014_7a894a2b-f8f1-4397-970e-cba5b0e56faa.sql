CREATE TABLE public.event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_types TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_types TO authenticated;
GRANT ALL ON public.event_types TO service_role;

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_types_select_authenticated ON public.event_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY event_types_admin_insert ON public.event_types
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY event_types_admin_update ON public.event_types
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY event_types_admin_delete ON public.event_types
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_event_types_updated BEFORE UPDATE ON public.event_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.event_types (key, label, icon, sort_order) VALUES
  ('dinner', 'Dîner', 'Utensils', 10),
  ('meeting', 'Réunion pro', 'Briefcase', 20),
  ('party', 'Fête', 'PartyPopper', 30),
  ('birthday', 'Anniversaire', 'Gift', 40),
  ('aperitif', 'Apéro', 'Coffee', 50),
  ('wedding', 'Mariage', 'Heart', 60);