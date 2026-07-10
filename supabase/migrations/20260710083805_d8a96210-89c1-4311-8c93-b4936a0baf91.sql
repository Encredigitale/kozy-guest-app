DROP FUNCTION IF EXISTS public.invitation_get(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.invitation_respond(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.invitation_claim_contribution(uuid, uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.invitation_add_custom_contribution(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.link_profile_to_contacts() CASCADE;
DROP FUNCTION IF EXISTS public.link_contact_to_profile() CASCADE;
DROP FUNCTION IF EXISTS public.contacts_sync_source() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TABLE IF EXISTS public.event_checklist_items CASCADE;
DROP TABLE IF EXISTS public.event_menu_items CASCADE;
DROP TABLE IF EXISTS public.event_contributions CASCADE;
DROP TABLE IF EXISTS public.event_rsvps CASCADE;
DROP TABLE IF EXISTS public.event_guests CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.widget_configs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DELETE FROM public.user_roles
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE lower(email) = 'contact@encredigitale.com'
);

DELETE FROM auth.users
WHERE lower(email) IS DISTINCT FROM 'contact@encredigitale.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'contact@encredigitale.com'
ON CONFLICT DO NOTHING;