-- =========================================================
-- Phase 2 — Core: Events + Notifications
-- =========================================================

-- ---------- events ----------
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.event_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX events_organizer_idx ON public.events (organizer_id, created_at DESC);
CREATE INDEX events_starts_at_idx ON public.events (starts_at);

-- ---------- event_participants ----------
CREATE TYPE public.rsvp_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.participant_role AS ENUM ('organizer', 'guest');

CREATE TABLE public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  role public.participant_role NOT NULL DEFAULT 'guest',
  rsvp_status public.rsvp_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO authenticated;
GRANT ALL ON public.event_participants TO service_role;

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER event_participants_set_updated_at
  BEFORE UPDATE ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX event_participants_event_idx ON public.event_participants (event_id);
CREATE INDEX event_participants_user_idx ON public.event_participants (user_id);
CREATE UNIQUE INDEX event_participants_event_user_uidx
  ON public.event_participants (event_id, user_id) WHERE user_id IS NOT NULL;

-- ---------- Security-definer helpers to avoid RLS recursion ----------
CREATE OR REPLACE FUNCTION public.is_event_organizer(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = _event_id AND organizer_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_participant(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants
    WHERE event_id = _event_id AND user_id = _user_id
  );
$$;

-- ---------- events RLS ----------
CREATE POLICY "events_select_organizer"
  ON public.events FOR SELECT TO authenticated
  USING (organizer_id = auth.uid());

CREATE POLICY "events_select_participant"
  ON public.events FOR SELECT TO authenticated
  USING (public.is_event_participant(id, auth.uid()));

CREATE POLICY "events_select_admin"
  ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "events_insert_own"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "events_update_organizer"
  ON public.events FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "events_delete_organizer"
  ON public.events FOR DELETE TO authenticated
  USING (organizer_id = auth.uid());

-- ---------- event_participants RLS ----------
CREATE POLICY "ep_select_organizer"
  ON public.event_participants FOR SELECT TO authenticated
  USING (public.is_event_organizer(event_id, auth.uid()));

CREATE POLICY "ep_select_self"
  ON public.event_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ep_select_admin"
  ON public.event_participants FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ep_insert_organizer"
  ON public.event_participants FOR INSERT TO authenticated
  WITH CHECK (public.is_event_organizer(event_id, auth.uid()));

CREATE POLICY "ep_update_organizer"
  ON public.event_participants FOR UPDATE TO authenticated
  USING (public.is_event_organizer(event_id, auth.uid()))
  WITH CHECK (public.is_event_organizer(event_id, auth.uid()));

CREATE POLICY "ep_update_self_rsvp"
  ON public.event_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ep_delete_organizer"
  ON public.event_participants FOR DELETE TO authenticated
  USING (public.is_event_organizer(event_id, auth.uid()));

-- ---------- notifications ----------
CREATE TYPE public.notification_channel AS ENUM ('inapp', 'email', 'push');
CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL DEFAULT 'inapp',
  type text NOT NULL,
  title text NOT NULL,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.notification_status NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_select_admin"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only allow marking one's own notification as read (read_at); other fields locked by server-side writes.
CREATE POLICY "notifications_update_read_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id) WHERE read_at IS NULL;

-- Enable Realtime for the bell / inbox live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;