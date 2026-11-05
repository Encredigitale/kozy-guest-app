CREATE TABLE public.event_invitation_links (
 event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
 token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.event_invitation_links TO authenticated;
GRANT ALL ON public.event_invitation_links TO service_role;
ALTER TABLE public.event_invitation_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizers read invitation links" ON public.event_invitation_links FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));
CREATE POLICY "Organizers update invitation links" ON public.event_invitation_links FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));
CREATE TRIGGER update_event_invitation_links BEFORE UPDATE ON public.event_invitation_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE FUNCTION public.create_event_invitation_link() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.event_invitation_links(event_id) VALUES (NEW.id); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.create_event_invitation_link() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_invitation_link() TO service_role;
CREATE TRIGGER create_event_invitation_link AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.create_event_invitation_link();
INSERT INTO public.event_invitation_links(event_id) SELECT id FROM public.events ON CONFLICT (event_id) DO NOTHING;
ALTER TABLE public.invitations ADD COLUMN first_name text, ADD COLUMN last_name text, ADD COLUMN invitation_source text NOT NULL DEFAULT 'manual', ADD COLUMN registration_key_hash text;
CREATE UNIQUE INDEX invitations_registration_key ON public.invitations(event_id, registration_key_hash) WHERE registration_key_hash IS NOT NULL;
CREATE FUNCTION public.register_free_invitation(_token text, _first_name text, _last_name text, _key_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.event_invitation_links%ROWTYPE; e public.events%ROWTYPE; i public.invitations%ROWTYPE; first_clean text; last_clean text;
BEGIN
 first_clean := regexp_replace(trim(_first_name), '\s+', ' ', 'g'); last_clean := regexp_replace(trim(_last_name), '\s+', ' ', 'g');
 IF _token IS NULL OR _token !~ '^[a-f0-9]{64}$' OR _key_hash IS NULL OR _key_hash !~ '^[a-f0-9]{64}$' OR first_clean IS NULL OR last_clean IS NULL OR char_length(first_clean) NOT BETWEEN 1 AND 60 OR char_length(last_clean) NOT BETWEEN 1 AND 60 THEN RETURN jsonb_build_object('ok', false); END IF;
 SELECT * INTO l FROM public.event_invitation_links WHERE token = _token FOR UPDATE;
 IF NOT FOUND OR NOT l.active THEN RETURN jsonb_build_object('ok', false); END IF;
 SELECT * INTO e FROM public.events WHERE id = l.event_id;
 IF NOT FOUND OR e.status <> 'published' THEN RETURN jsonb_build_object('ok', false); END IF;
 SELECT * INTO i FROM public.invitations WHERE event_id = e.id AND registration_key_hash = _key_hash;
 IF FOUND THEN
  IF i.revoked_at IS NOT NULL OR i.status = 'cancelled' OR (i.expires_at IS NOT NULL AND i.expires_at < now()) THEN RETURN jsonb_build_object('ok', false); END IF;
 ELSE
  INSERT INTO public.invitations(event_id, organizer_id, name, first_name, last_name, invitation_source, registration_key_hash, status, token, channel)
  VALUES (e.id, e.organizer_id, first_clean || ' ' || last_clean, first_clean, last_clean, 'free_link', _key_hash, 'opened', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'link') RETURNING * INTO i;
  INSERT INTO public.invitation_logs(invitation_id, event_type, metadata) VALUES(i.id, 'created', '{"source":"free_link"}'::jsonb);
 END IF;
 RETURN jsonb_build_object('ok', true, 'eventId', i.event_id, 'invitationId', i.id, 'token', i.token);
END; $$;
REVOKE ALL ON FUNCTION public.register_free_invitation(text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_free_invitation(text,text,text,text) TO service_role;