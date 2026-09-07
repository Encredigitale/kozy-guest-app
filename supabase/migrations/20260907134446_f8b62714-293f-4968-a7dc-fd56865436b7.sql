CREATE POLICY "Participants read event extensions"
ON public.event_extensions
FOR SELECT
TO authenticated
USING (private.is_event_participant(event_id, auth.uid()));

CREATE POLICY "Participants read event widget items"
ON public.widget_items
FOR SELECT
TO authenticated
USING (
  scope_type = 'event'
  AND scope_id IS NOT NULL
  AND private.is_event_participant(scope_id, auth.uid())
);