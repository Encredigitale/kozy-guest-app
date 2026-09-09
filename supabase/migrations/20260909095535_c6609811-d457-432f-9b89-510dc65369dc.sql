CREATE POLICY "Participants read event guest contributions"
ON public.guest_contributions FOR SELECT TO authenticated
USING (private.is_event_participant(event_id, auth.uid()));

CREATE POLICY "Participants read event commitments"
ON public.contribution_commitments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contribution_needs n
  WHERE n.id = contribution_commitments.need_id
    AND private.is_event_participant(n.event_id, auth.uid())
));