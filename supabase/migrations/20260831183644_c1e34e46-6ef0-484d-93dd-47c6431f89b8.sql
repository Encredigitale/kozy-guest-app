CREATE TABLE public.event_gift (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  gift_name text NOT NULL,
  description text,
  note text,
  gift_date timestamptz,
  photo_id uuid REFERENCES public.event_photos(id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'organizer',
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_event_gift_event ON public.event_gift(event_id);

CREATE TABLE public.event_gift_person (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_id uuid NOT NULL REFERENCES public.event_gift(id) ON DELETE CASCADE,
  role text NOT NULL,
  contact_id uuid REFERENCES public.widget_items(id) ON DELETE SET NULL,
  user_id uuid,
  manual_name text,
  display_name_snapshot text NOT NULL,
  source_type text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_gift_person_gift ON public.event_gift_person(gift_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_gift TO authenticated;
GRANT ALL ON public.event_gift TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_gift_person TO authenticated;
GRANT ALL ON public.event_gift_person TO service_role;

ALTER TABLE public.event_gift ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_gift_person ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage their event gifts"
ON public.event_gift FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));

CREATE POLICY "Participants read shared gifts"
ON public.event_gift FOR SELECT TO authenticated
USING (
  visibility = 'participants'
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.event_participants p
    WHERE p.event_id = event_gift.event_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins manage gifts"
ON public.event_gift FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Organizers manage gift persons"
ON public.event_gift_person FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.event_gift g JOIN public.events e ON e.id = g.event_id
  WHERE g.id = gift_id AND e.organizer_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.event_gift g JOIN public.events e ON e.id = g.event_id
  WHERE g.id = gift_id AND e.organizer_id = auth.uid()
));

CREATE POLICY "Participants read shared gift persons"
ON public.event_gift_person FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.event_gift g
  JOIN public.event_participants p ON p.event_id = g.event_id
  WHERE g.id = gift_id AND g.visibility = 'participants' AND g.deleted_at IS NULL AND p.user_id = auth.uid()
));

CREATE POLICY "Admins manage gift persons"
ON public.event_gift_person FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_event_gift_updated
BEFORE UPDATE ON public.event_gift
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();