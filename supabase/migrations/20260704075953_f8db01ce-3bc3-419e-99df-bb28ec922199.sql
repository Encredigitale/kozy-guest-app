
-- Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated where not needed.
-- Trigger functions and RLS helpers don't need direct API execute access.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_profile_to_contacts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_contact_to_profile() FROM PUBLIC, anon, authenticated;

-- Ensure invitation RPCs (intentionally public via secure token) remain callable
REVOKE EXECUTE ON FUNCTION public.invitation_get(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invitation_respond(uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invitation_claim_contribution(uuid, uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invitation_add_custom_contribution(uuid, uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.invitation_get(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invitation_respond(uuid, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invitation_claim_contribution(uuid, uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invitation_add_custom_contribution(uuid, uuid, text, text) TO anon, authenticated;

-- has_role is called from RLS policies which run as the invoking role.
-- Grant it back so policies work, but this is the intended surface.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
