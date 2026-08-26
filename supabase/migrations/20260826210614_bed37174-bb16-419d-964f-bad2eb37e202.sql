ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS channel text;

CREATE INDEX IF NOT EXISTS invitations_phone_e164_idx ON public.invitations (event_id, phone_e164);