-- API tokens table
CREATE TABLE public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_tokens_user_id_idx ON public.api_tokens(user_id);
CREATE INDEX api_tokens_token_hash_idx ON public.api_tokens(token_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_tokens TO authenticated;
GRANT ALL ON public.api_tokens TO service_role;

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens"
ON public.api_tokens FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all tokens"
ON public.api_tokens FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_api_tokens_updated_at
BEFORE UPDATE ON public.api_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expose audit_log to users (own entries) and admins (all)
-- Assumes audit_log already has RLS enabled. Drop old restrictive policies if needed and add:
CREATE POLICY "Users read own audit entries"
ON public.audit_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all audit entries"
ON public.audit_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated;

CREATE POLICY "Authenticated can insert own audit entries"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
