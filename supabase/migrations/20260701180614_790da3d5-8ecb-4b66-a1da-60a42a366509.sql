
-- Add per-invitation token, status, expiration, last opened, for the new /invitation/:eventId/:invitationId?token= URL format.
ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS invite_token text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz;

-- Backfill tokens for existing guests
UPDATE public.event_guests
SET invite_token = encode(gen_random_bytes(16), 'hex')
WHERE invite_token IS NULL;

ALTER TABLE public.event_guests
  ALTER COLUMN invite_token SET NOT NULL,
  ALTER COLUMN invite_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS event_guests_invite_token_key
  ON public.event_guests (invite_token);

-- Status is one of: active, revoked
ALTER TABLE public.event_guests
  DROP CONSTRAINT IF EXISTS event_guests_status_check;
ALTER TABLE public.event_guests
  ADD CONSTRAINT event_guests_status_check CHECK (status IN ('active','revoked'));
