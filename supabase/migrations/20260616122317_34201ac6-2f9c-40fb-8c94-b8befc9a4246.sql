
-- Profil enrichi
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favorite_drinks text,
  ADD COLUMN IF NOT EXISTS personal_notes text;

-- Events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_subtype text,
  title text NOT NULL,
  event_at timestamptz NOT NULL,
  location text,
  description text,
  menu_or_theme text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own events" ON public.events
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert own events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own events" ON public.events
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own events" ON public.events
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX events_owner_idx ON public.events(owner_id, event_at DESC);

-- Event guests
CREATE TABLE public.event_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_guests TO authenticated;
GRANT ALL ON public.event_guests TO service_role;

ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view event guests" ON public.event_guests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));
CREATE POLICY "Owners can insert event guests" ON public.event_guests
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));
CREATE POLICY "Owners can update event guests" ON public.event_guests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));
CREATE POLICY "Owners can delete event guests" ON public.event_guests
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));

CREATE INDEX event_guests_event_idx ON public.event_guests(event_id);
