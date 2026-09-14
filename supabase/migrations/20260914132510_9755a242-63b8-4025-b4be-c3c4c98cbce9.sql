CREATE TABLE public.menu_recipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.widget_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  text_content text,
  external_url text,
  external_url_note text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX menu_recipe_item_unique ON public.menu_recipe (menu_item_id) WHERE deleted_at IS NULL;
CREATE INDEX menu_recipe_event_idx ON public.menu_recipe (event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_recipe TO authenticated;
GRANT ALL ON public.menu_recipe TO service_role;
ALTER TABLE public.menu_recipe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizers manage their event recipes" ON public.menu_recipe FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = menu_recipe.event_id AND e.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = menu_recipe.event_id AND e.organizer_id = auth.uid()));

CREATE TABLE public.menu_recipe_photo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.menu_recipe(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  width integer NOT NULL DEFAULT 0,
  height integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_recipe_photo_recipe_idx ON public.menu_recipe_photo (recipe_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_recipe_photo TO authenticated;
GRANT ALL ON public.menu_recipe_photo TO service_role;
ALTER TABLE public.menu_recipe_photo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizers manage their recipe photos" ON public.menu_recipe_photo FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.menu_recipe r JOIN public.events e ON e.id = r.event_id
    WHERE r.id = menu_recipe_photo.recipe_id AND e.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.menu_recipe r JOIN public.events e ON e.id = r.event_id
    WHERE r.id = menu_recipe_photo.recipe_id AND e.organizer_id = auth.uid()));

CREATE TABLE public.menu_recipe_share (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.menu_recipe(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  shared_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX menu_recipe_share_active_unique ON public.menu_recipe_share (recipe_id, invitation_id) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_recipe_share TO authenticated;
GRANT ALL ON public.menu_recipe_share TO service_role;
ALTER TABLE public.menu_recipe_share ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizers manage their recipe shares" ON public.menu_recipe_share FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.menu_recipe r JOIN public.events e ON e.id = r.event_id
    WHERE r.id = menu_recipe_share.recipe_id AND e.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.menu_recipe r JOIN public.events e ON e.id = r.event_id
    WHERE r.id = menu_recipe_share.recipe_id AND e.organizer_id = auth.uid()));

CREATE TRIGGER trg_menu_recipe_updated BEFORE UPDATE ON public.menu_recipe
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.extensions (key, name, description, category, version, enabled, manifest, scope, sort_order, min_core_version, min_db_version, menu_order)
VALUES ('recipes', 'Recette', 'Ajouter une recette (texte, photos, lien) à un élément du menu.', 'catering', '1.0.0', true, '{}'::jsonb, 'event', 100, '1.0.0', 1, '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;