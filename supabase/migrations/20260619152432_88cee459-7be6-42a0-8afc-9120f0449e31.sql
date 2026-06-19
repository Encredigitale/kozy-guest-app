ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_status text,
  ADD COLUMN IF NOT EXISTS rsvp_id uuid REFERENCES public.event_rsvps(id) ON DELETE SET NULL;