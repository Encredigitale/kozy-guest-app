-- Référentiel des types d'apports
CREATE TABLE public.contribution_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Gift',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  allow_subchoices boolean NOT NULL DEFAULT true,
  allow_free_text boolean NOT NULL DEFAULT true,
  event_type_keys text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contribution_types TO authenticated;
GRANT ALL ON public.contribution_types TO service_role;
ALTER TABLE public.contribution_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY contribution_types_select_authenticated ON public.contribution_types
  FOR SELECT TO authenticated USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY contribution_types_admin_insert ON public.contribution_types
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY contribution_types_admin_update ON public.contribution_types
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY contribution_types_admin_delete ON public.contribution_types
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_contribution_types_updated BEFORE UPDATE ON public.contribution_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sous-choix
CREATE TABLE public.contribution_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id uuid NOT NULL REFERENCES public.contribution_types(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contribution_choices_type ON public.contribution_choices(type_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contribution_choices TO authenticated;
GRANT ALL ON public.contribution_choices TO service_role;
ALTER TABLE public.contribution_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY contribution_choices_select_authenticated ON public.contribution_choices
  FOR SELECT TO authenticated USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY contribution_choices_admin_insert ON public.contribution_choices
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY contribution_choices_admin_update ON public.contribution_choices
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY contribution_choices_admin_delete ON public.contribution_choices
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_contribution_choices_updated BEFORE UPDATE ON public.contribution_choices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apports des invités
CREATE TABLE public.guest_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  guest_user_id uuid,
  contact_id uuid,
  contribution_type_id uuid REFERENCES public.contribution_types(id) ON DELETE SET NULL,
  choice_id uuid REFERENCES public.contribution_choices(id) ON DELETE SET NULL,
  label text NOT NULL,
  quantity numeric,
  unit text,
  note text,
  status text NOT NULL DEFAULT 'declared',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_guest_contributions_event ON public.guest_contributions(event_id);
CREATE INDEX idx_guest_contributions_invitation ON public.guest_contributions(invitation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_contributions TO authenticated;
GRANT ALL ON public.guest_contributions TO service_role;
ALTER TABLE public.guest_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_contributions_organizer_select ON public.guest_contributions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())
    OR guest_user_id = auth.uid()
  );
CREATE POLICY guest_contributions_organizer_update ON public.guest_contributions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())
    OR guest_user_id = auth.uid()
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())
    OR guest_user_id = auth.uid()
  );
CREATE POLICY guest_contributions_owner_insert ON public.guest_contributions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())
    OR guest_user_id = auth.uid()
  );
CREATE POLICY guest_contributions_owner_delete ON public.guest_contributions
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())
    OR guest_user_id = auth.uid()
  );
CREATE TRIGGER trg_guest_contributions_updated BEFORE UPDATE ON public.guest_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Référentiel par défaut
INSERT INTO public.contribution_types (key, label, icon, sort_order, allow_subchoices, allow_free_text) VALUES
  ('wine', 'Bouteille / Vin', 'Wine', 10, true, true),
  ('dessert', 'Gâteau / Dessert', 'CakeSlice', 20, true, true),
  ('flowers', 'Fleurs', 'Flower2', 30, true, true),
  ('gift', 'Cadeau', 'Gift', 40, true, true),
  ('cheese', 'Fromage', 'Croissant', 50, true, true),
  ('bread', 'Pain', 'Wheat', 60, false, true),
  ('drinks', 'Boisson', 'CupSoda', 70, true, true),
  ('other', 'Autre', 'Plus', 999, false, true);

INSERT INTO public.contribution_choices (type_id, label, sort_order)
SELECT t.id, c.label, c.ord FROM public.contribution_types t
JOIN (VALUES
  ('wine', 'Vin rouge', 10), ('wine', 'Vin blanc', 20), ('wine', 'Rosé', 30),
  ('wine', 'Champagne', 40), ('wine', 'Crémant', 50), ('wine', 'Sans alcool', 60),
  ('dessert', 'Gâteau', 10), ('dessert', 'Tarte', 20), ('dessert', 'Glace', 30), ('dessert', 'Chocolats', 40),
  ('flowers', 'Bouquet', 10), ('flowers', 'Plante', 20),
  ('gift', 'Cadeau individuel', 10), ('gift', 'Cadeau commun', 20), ('gift', 'Carte cadeau', 30),
  ('cheese', 'Plateau de fromages', 10), ('cheese', 'Fromage de chèvre', 20),
  ('drinks', 'Jus de fruits', 10), ('drinks', 'Sodas', 20), ('drinks', 'Eau pétillante', 30), ('drinks', 'Cocktail', 40)
) AS c(type_key, label, ord) ON c.type_key = t.key;

-- Paramètres du plugin
INSERT INTO public.invitation_settings (key, settings)
VALUES ('guest-brings', '{"eventTypeKeys":[],"multiple":true,"quantityEnabled":true,"notesEnabled":true,"freeTextEnabled":true,"remindersEnabled":false,"notifyOrganizer":true,"useMenuContext":false,"showDuplicateHint":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enregistrement du plugin et de son widget organisateur
INSERT INTO public.extensions (key, name, description, category, version, enabled, scope, sort_order, manifest)
VALUES ('guest-brings', 'Invité apporte', 'Permet aux invités ayant accepté de préciser ce qu''ils apportent, et à l''organisateur de suivre les apports.', 'engagement', '1.0.0', true, 'event', 60, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.widgets (id, name, description, version, category, enabled, status, size, manifest)
VALUES ('ext.guest-brings', 'Ce que les invités apportent', 'Résumé des apports déclarés par les invités.', '1.0.0', 'engagement', true, 'published', 'md',
  '{"component":"ext.guest-brings","surface":"event.detail","order":45,"menu":{"label":"Apports","icon":"Gift"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;