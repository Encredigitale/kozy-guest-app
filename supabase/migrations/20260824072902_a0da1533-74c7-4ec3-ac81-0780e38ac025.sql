ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Existing accounts are considered verified (grandfathered)
UPDATE public.profiles SET email_verified_at = now() WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_verification_tokens TO service_role;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx ON public.email_verification_tokens(user_id);