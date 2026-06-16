-- 1) Add invite_token to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS invite_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');
CREATE UNIQUE INDEX IF NOT EXISTS events_invite_token_key ON public.events(invite_token);

-- 2) RSVPs (filled by invitees via public link, no account)
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('yes','no','maybe')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
GRANT ALL ON public.event_rsvps TO service_role;

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view rsvps" ON public.event_rsvps
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_rsvps.event_id AND e.owner_id = auth.uid()));
CREATE POLICY "Owners can update rsvps" ON public.event_rsvps
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_rsvps.event_id AND e.owner_id = auth.uid()));
CREATE POLICY "Owners can delete rsvps" ON public.event_rsvps
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_rsvps.event_id AND e.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS event_rsvps_event_id_idx ON public.event_rsvps(event_id);

CREATE TRIGGER update_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Contributions — items to bring; visible only to organizer
CREATE TABLE IF NOT EXISTS public.event_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  claimed_by_name text,
  claimed_by_rsvp_id uuid REFERENCES public.event_rsvps(id) ON DELETE SET NULL,
  proposed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_contributions TO authenticated;
GRANT ALL ON public.event_contributions TO service_role;

ALTER TABLE public.event_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view contributions" ON public.event_contributions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_contributions.event_id AND e.owner_id = auth.uid()));
CREATE POLICY "Owners can insert contributions" ON public.event_contributions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_contributions.event_id AND e.owner_id = auth.uid()));
CREATE POLICY "Owners can update contributions" ON public.event_contributions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_contributions.event_id AND e.owner_id = auth.uid()));
CREATE POLICY "Owners can delete contributions" ON public.event_contributions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_contributions.event_id AND e.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS event_contributions_event_id_idx ON public.event_contributions(event_id);

CREATE TRIGGER update_event_contributions_updated_at
  BEFORE UPDATE ON public.event_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Backfill invite_token for any existing events (defaults handle new rows)
UPDATE public.events SET invite_token = replace(gen_random_uuid()::text, '-', '')
  WHERE invite_token IS NULL OR invite_token = '';