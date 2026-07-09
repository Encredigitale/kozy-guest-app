
CREATE TABLE public.event_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_checklist_items TO authenticated;
GRANT ALL ON public.event_checklist_items TO service_role;

ALTER TABLE public.event_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages checklist items"
ON public.event_checklist_items FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));

CREATE TRIGGER update_event_checklist_items_updated_at
BEFORE UPDATE ON public.event_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX event_checklist_items_event_id_idx ON public.event_checklist_items(event_id, position);

CREATE TABLE public.event_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL,
  course text NOT NULL DEFAULT 'plat',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_menu_items TO authenticated;
GRANT ALL ON public.event_menu_items TO service_role;

ALTER TABLE public.event_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages menu items"
ON public.event_menu_items FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));

CREATE TRIGGER update_event_menu_items_updated_at
BEFORE UPDATE ON public.event_menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX event_menu_items_event_id_idx ON public.event_menu_items(event_id, position);
