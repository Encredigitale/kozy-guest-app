
CREATE TABLE public.widget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  widget_key text NOT NULL,
  scope_type text NOT NULL DEFAULT 'global',
  scope_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX widget_items_lookup_idx
  ON public.widget_items (owner_id, widget_key, scope_type, scope_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.widget_items TO authenticated;
GRANT ALL ON public.widget_items TO service_role;

ALTER TABLE public.widget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their widget items"
  ON public.widget_items FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners insert their widget items"
  ON public.widget_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update their widget items"
  ON public.widget_items FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners delete their widget items"
  ON public.widget_items FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER widget_items_updated_at
  BEFORE UPDATE ON public.widget_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
