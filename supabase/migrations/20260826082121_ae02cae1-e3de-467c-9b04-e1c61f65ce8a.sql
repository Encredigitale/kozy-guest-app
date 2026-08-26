DO $$ BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('draft','sent','opened','accepted','declined','maybe','cancelled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL,
  contact_id uuid REFERENCES public.widget_items(id) ON DELETE SET NULL,
  guest_user_id uuid,
  name text,
  email text,
  phone text,
  status public.invitation_status NOT NULL DEFAULT 'draft',
  token text NOT NULL UNIQUE,
  message text,
  sent_at timestamptz,
  opened_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invitations_event_idx ON public.invitations(event_id);
CREATE INDEX invitations_guest_user_idx ON public.invitations(guest_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage their invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Guests can read their invitation" ON public.invitations
  FOR SELECT TO authenticated
  USING (auth.uid() = guest_user_id);

CREATE POLICY "Admins can read all invitations" ON public.invitations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins can update invitations" ON public.invitations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE TRIGGER invitations_set_updated_at BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.invitation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invitation_logs_invitation_idx ON public.invitation_logs(invitation_id);

GRANT SELECT, INSERT ON public.invitation_logs TO authenticated;
GRANT ALL ON public.invitation_logs TO service_role;
ALTER TABLE public.invitation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers read their invitation logs" ON public.invitation_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id = invitation_logs.invitation_id AND i.organizer_id = auth.uid()
  ));

CREATE POLICY "Organizers insert their invitation logs" ON public.invitation_logs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id = invitation_logs.invitation_id AND i.organizer_id = auth.uid()
  ));

CREATE POLICY "Admins read all invitation logs" ON public.invitation_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE TABLE public.invitation_settings (
  key text NOT NULL PRIMARY KEY DEFAULT 'default',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invitation_settings TO authenticated;
GRANT ALL ON public.invitation_settings TO service_role;
ALTER TABLE public.invitation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read invitation settings" ON public.invitation_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage invitation settings" ON public.invitation_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE TRIGGER invitation_settings_set_updated_at BEFORE UPDATE ON public.invitation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.invitation_settings (key, settings) VALUES ('default', jsonb_build_object(
  'eventTypeKeys', '[]'::jsonb,
  'required', false,
  'allowMaybe', true,
  'allowChangeResponse', true,
  'responseDeadlineDays', 1,
  'expiresDays', 30,
  'maxReminders', 2,
  'channels', jsonb_build_array('link','share','email'),
  'inviteWithoutContact', true,
  'guestVisibility', 'organizer',
  'remindersEnabled', true,
  'templateInvitation', '{host} vous invite à {event}.',
  'templateReminder', 'Petit rappel : vous n''avez pas encore répondu à cette invitation.',
  'templateConfirmation', 'Votre participation est confirmée. À bientôt !'
)) ON CONFLICT (key) DO NOTHING;