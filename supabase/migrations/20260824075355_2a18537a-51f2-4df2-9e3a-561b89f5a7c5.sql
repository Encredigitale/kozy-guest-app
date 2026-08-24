CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_event_organizer(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_event_participant(uuid, uuid) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_event_organizer(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_event_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_event_organizer(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_event_participant(uuid, uuid) TO authenticated, service_role;