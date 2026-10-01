CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.can_access_event_messages(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL
    AND COALESCE((SELECT enabled FROM public.extensions WHERE key = 'messages'), false)
    AND COALESCE((SELECT enabled FROM public.event_extensions WHERE event_id = _event_id AND extension_key = 'messages'), false)
    AND (
      EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND organizer_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.invitations WHERE event_id = _event_id AND guest_user_id = _user_id AND status = 'accepted' AND revoked_at IS NULL)
      OR EXISTS (SELECT 1 FROM public.event_participants WHERE event_id = _event_id AND user_id = _user_id AND rsvp_status = 'accepted')
    )
$$;
REVOKE EXECUTE ON FUNCTION private.can_access_event_messages(uuid, uuid) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_event_messages(uuid, uuid) TO authenticated;

CREATE TABLE public.event_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  author_invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  message_type text NOT NULL DEFAULT 'text',
  text_content text,
  photo_path text,
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_message_event_created_idx ON public.event_message (event_id, created_at DESC);
GRANT SELECT ON public.event_message TO authenticated;
GRANT ALL ON public.event_message TO service_role;
ALTER TABLE public.event_message ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read event messages" ON public.event_message FOR SELECT TO authenticated
  USING (private.can_access_event_messages(event_id, auth.uid()));
CREATE TRIGGER trg_event_message_updated BEFORE UPDATE ON public.event_message
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.event_message_read_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  invitation_id uuid,
  last_read_message_id uuid,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT ON public.event_message_read_state TO authenticated;
GRANT ALL ON public.event_message_read_state TO service_role;
ALTER TABLE public.event_message_read_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own read state" ON public.event_message_read_state FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.event_message_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  invitation_id uuid,
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT ON public.event_message_preferences TO authenticated;
GRANT ALL ON public.event_message_preferences TO service_role;
ALTER TABLE public.event_message_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own message prefs" ON public.event_message_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_event_message_prefs_updated BEFORE UPDATE ON public.event_message_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.event_message_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.event_message(id) ON DELETE CASCADE,
  moderator_user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_message_moderation_log TO authenticated;
GRANT ALL ON public.event_message_moderation_log TO service_role;
ALTER TABLE public.event_message_moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizers read moderation log" ON public.event_message_moderation_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.event_message;

INSERT INTO public.extensions (key, name, description, category, version, enabled, scope, sort_order, manifest)
VALUES ('messages', 'Messages', 'Échangez facilement avec tous les participants de votre événement.', 'engagement', '1.0.0', true, 'event', 110, '{"widgets":["ext.messages"]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.widgets (id, name, description, version, category, manifest, enabled, status, size)
VALUES ('ext.messages', 'Messages', 'Échangez facilement avec tous les participants de votre événement.', '1.0.0', 'engagement',
  '{"order": 85, "surface": "event.detail", "visible": true, "component": "ext.messages", "icon": "MessageCircle"}'::jsonb, true, 'published', 'full')
ON CONFLICT (id) DO NOTHING;