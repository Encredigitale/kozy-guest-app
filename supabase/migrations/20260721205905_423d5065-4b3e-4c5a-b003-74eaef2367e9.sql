
-- ============================================================
-- LOT B: Extension settings + per-event activation
-- ============================================================

-- Table for extension settings (global or per-event)
CREATE TABLE public.extension_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extension_key TEXT NOT NULL,
  event_id UUID NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, extension_key, event_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.extension_settings TO authenticated;
GRANT ALL ON public.extension_settings TO service_role;

ALTER TABLE public.extension_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own extension settings"
ON public.extension_settings
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_extension_settings_updated
BEFORE UPDATE ON public.extension_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for per-event extension activation
CREATE TABLE public.event_extensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  extension_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, extension_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_extensions TO authenticated;
GRANT ALL ON public.event_extensions TO service_role;

ALTER TABLE public.event_extensions ENABLE ROW LEVEL SECURITY;

-- Only the event organizer can manage per-event extensions
CREATE POLICY "organizer manages event extensions"
ON public.event_extensions
FOR ALL
TO authenticated
USING (public.is_event_organizer(event_id, auth.uid()))
WITH CHECK (public.is_event_organizer(event_id, auth.uid()));

CREATE TRIGGER trg_event_extensions_updated
BEFORE UPDATE ON public.event_extensions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- LOT C: Extension versioning + ordering + manifest
-- ============================================================

ALTER TABLE public.extensions
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_core_version TEXT NOT NULL DEFAULT '0.0.0',
  ADD COLUMN IF NOT EXISTS min_db_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS menu_order JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS installed_from TEXT NULL;

-- Ensure version column exists (from earlier migration it should)
ALTER TABLE public.extensions
  ALTER COLUMN version SET DEFAULT '1.0.0';

-- Bump existing extensions to version 1.0.0 if unset
UPDATE public.extensions
SET version = '1.0.0'
WHERE version IS NULL OR version = '' OR version = '0.0.0';

-- Set initial sort_order based on category+name
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY category, name) * 10 AS rn
  FROM public.extensions
)
UPDATE public.extensions e
SET sort_order = ordered.rn
FROM ordered
WHERE e.id = ordered.id AND e.sort_order = 0;
