
-- Public invitation access via signed token, without exposing tables to anon.
-- Each function validates the (event_id, invitation_id, token) triple internally.

CREATE OR REPLACE FUNCTION public.invitation_get(
  p_event_id uuid,
  p_invitation_id uuid,
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest record;
  v_event record;
  v_organizer record;
  v_guests jsonb;
  v_contribs jsonb;
  v_total int;
  v_confirmed int;
  v_claimed int;
  v_finished boolean;
BEGIN
  SELECT id, event_id, name, email, invite_token, status, expires_at,
         last_opened_at, responded_at, rsvp_status
    INTO v_guest
  FROM public.event_guests
  WHERE id = p_invitation_id;

  IF NOT FOUND OR v_guest.event_id <> p_event_id OR v_guest.invite_token <> p_token THEN
    RAISE EXCEPTION 'INVITATION_INVALID';
  END IF;
  IF v_guest.status <> 'active' THEN
    RAISE EXCEPTION 'INVITATION_REVOKED';
  END IF;
  IF v_guest.expires_at IS NOT NULL AND v_guest.expires_at < now() THEN
    RAISE EXCEPTION 'INVITATION_EXPIRED';
  END IF;

  SELECT id, owner_id, title, event_type, event_subtype, event_at,
         location, description, menu_or_theme
    INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_MISSING';
  END IF;

  UPDATE public.event_guests
     SET last_opened_at = now()
   WHERE id = v_guest.id;

  SELECT first_name, last_name
    INTO v_organizer
  FROM public.profiles
  WHERE id = v_event.owner_id;

  SELECT count(*), count(*) FILTER (WHERE rsvp_status = 'yes')
    INTO v_total, v_confirmed
  FROM public.event_guests
  WHERE event_id = v_event.id;

  SELECT count(*) FILTER (WHERE claimed_by_name IS NOT NULL AND claimed_by_name <> '')
    INTO v_claimed
  FROM public.event_contributions
  WHERE event_id = v_event.id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'category', category,
      'label', label,
      'claimed', (claimed_by_name IS NOT NULL AND claimed_by_name <> ''),
      'claimed_by_me', (claimed_by_name = v_guest.name)
    ) ORDER BY created_at), '[]'::jsonb)
    INTO v_contribs
  FROM public.event_contributions
  WHERE event_id = v_event.id;

  v_finished := v_event.event_at < now() - interval '12 hours';

  RETURN jsonb_build_object(
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'event_type', v_event.event_type,
      'event_subtype', v_event.event_subtype,
      'event_at', v_event.event_at,
      'location', v_event.location,
      'description', v_event.description,
      'menu_or_theme', v_event.menu_or_theme
    ),
    'organizer', jsonb_build_object(
      'first_name', v_organizer.first_name,
      'last_name', v_organizer.last_name
    ),
    'guest', jsonb_build_object(
      'id', v_guest.id,
      'name', v_guest.name,
      'responded_at', v_guest.responded_at,
      'rsvp_status', v_guest.rsvp_status
    ),
    'contributions', v_contribs,
    'stats', jsonb_build_object(
      'totalGuests', v_total,
      'confirmedGuests', v_confirmed,
      'claimedContributions', v_claimed,
      'openContributions', (jsonb_array_length(v_contribs) - v_claimed)
    ),
    'finished', v_finished,
    'locked', v_finished
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.invitation_respond(
  p_event_id uuid,
  p_invitation_id uuid,
  p_token text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest record;
  v_event record;
  v_rsvp_id uuid;
BEGIN
  IF p_status NOT IN ('yes','no') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT id, event_id, name, invite_token, status, expires_at
    INTO v_guest
  FROM public.event_guests
  WHERE id = p_invitation_id;
  IF NOT FOUND OR v_guest.event_id <> p_event_id OR v_guest.invite_token <> p_token THEN
    RAISE EXCEPTION 'INVITATION_INVALID';
  END IF;
  IF v_guest.status <> 'active' THEN
    RAISE EXCEPTION 'INVITATION_REVOKED';
  END IF;

  SELECT id, event_at INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_MISSING'; END IF;
  IF v_event.event_at < now() - interval '12 hours' THEN
    RAISE EXCEPTION 'INVITATION_EXPIRED';
  END IF;

  INSERT INTO public.event_rsvps(event_id, guest_name, status)
  VALUES (v_event.id, v_guest.name, p_status)
  RETURNING id INTO v_rsvp_id;

  UPDATE public.event_guests
     SET responded_at = now(),
         rsvp_status = p_status,
         rsvp_id = v_rsvp_id
   WHERE id = v_guest.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.invitation_claim_contribution(
  p_event_id uuid,
  p_invitation_id uuid,
  p_token text,
  p_contribution_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest record;
BEGIN
  SELECT id, event_id, name, invite_token, status
    INTO v_guest
  FROM public.event_guests
  WHERE id = p_invitation_id;
  IF NOT FOUND OR v_guest.event_id <> p_event_id OR v_guest.invite_token <> p_token THEN
    RAISE EXCEPTION 'INVITATION_INVALID';
  END IF;
  IF v_guest.status <> 'active' THEN
    RAISE EXCEPTION 'INVITATION_REVOKED';
  END IF;

  UPDATE public.event_contributions
     SET claimed_by_name = NULL
   WHERE event_id = p_event_id
     AND claimed_by_name = v_guest.name;

  IF p_contribution_id IS NOT NULL THEN
    UPDATE public.event_contributions
       SET claimed_by_name = v_guest.name
     WHERE id = p_contribution_id
       AND event_id = p_event_id
       AND claimed_by_name IS NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.invitation_add_custom_contribution(
  p_event_id uuid,
  p_invitation_id uuid,
  p_token text,
  p_label text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest record;
BEGIN
  IF p_label IS NULL OR length(btrim(p_label)) < 2 OR length(p_label) > 80 THEN
    RAISE EXCEPTION 'INVALID_LABEL';
  END IF;

  SELECT id, event_id, name, invite_token, status
    INTO v_guest
  FROM public.event_guests
  WHERE id = p_invitation_id;
  IF NOT FOUND OR v_guest.event_id <> p_event_id OR v_guest.invite_token <> p_token THEN
    RAISE EXCEPTION 'INVITATION_INVALID';
  END IF;
  IF v_guest.status <> 'active' THEN
    RAISE EXCEPTION 'INVITATION_REVOKED';
  END IF;

  UPDATE public.event_contributions
     SET claimed_by_name = NULL
   WHERE event_id = p_event_id
     AND claimed_by_name = v_guest.name;

  INSERT INTO public.event_contributions(event_id, category, label, claimed_by_name, proposed_by_name)
  VALUES (p_event_id, 'autre', btrim(p_label), v_guest.name, v_guest.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.invitation_get(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invitation_respond(uuid, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invitation_claim_contribution(uuid, uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invitation_add_custom_contribution(uuid, uuid, text, text) TO anon, authenticated;
