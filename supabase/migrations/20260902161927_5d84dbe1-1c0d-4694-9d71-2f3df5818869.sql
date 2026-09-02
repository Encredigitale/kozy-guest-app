ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

DROP POLICY IF EXISTS events_select_participant ON public.events;
CREATE POLICY events_select_participant ON public.events
  FOR SELECT TO authenticated
  USING (private.is_event_participant(id, auth.uid()) AND status <> 'draft'::event_status);