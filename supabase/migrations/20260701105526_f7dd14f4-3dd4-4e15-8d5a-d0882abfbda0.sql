-- Add a "source" distinction on contacts: personal (manual), imported (phone book), member (linked platform user)
DO $$ BEGIN
  CREATE TYPE public.contact_source AS ENUM ('personal', 'imported', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS source public.contact_source NOT NULL DEFAULT 'personal';

-- Keep source in sync with linked_user_id: any contact linked to a platform user becomes 'member'
CREATE OR REPLACE FUNCTION public.contacts_sync_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_user_id IS NOT NULL THEN
    NEW.source := 'member';
  ELSIF NEW.source = 'member' THEN
    -- unlinked but still marked as member -> fall back to personal
    NEW.source := 'personal';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_sync_source ON public.contacts;
CREATE TRIGGER trg_contacts_sync_source
  BEFORE INSERT OR UPDATE OF linked_user_id, source ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.contacts_sync_source();

-- Backfill existing rows
UPDATE public.contacts SET source = 'member' WHERE linked_user_id IS NOT NULL AND source <> 'member';