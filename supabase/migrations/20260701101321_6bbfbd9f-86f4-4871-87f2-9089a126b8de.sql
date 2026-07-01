
-- Group enum
CREATE TYPE public.contact_group AS ENUM ('family', 'friends', 'colleagues', 'neighbors', 'other');

CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  group_type public.contact_group NOT NULL DEFAULT 'other',
  avatar_url TEXT,
  notes TEXT,
  dietary_preferences TEXT,
  allergies TEXT,
  favorite_drinks TEXT,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_count INTEGER NOT NULL DEFAULT 0,
  last_invited_at TIMESTAMPTZ,
  last_attended_at TIMESTAMPTZ,
  last_contribution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contacts_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX contacts_owner_id_idx ON public.contacts(owner_id);
CREATE INDEX contacts_email_idx ON public.contacts(lower(email));
CREATE INDEX contacts_phone_idx ON public.contacts(phone);
CREATE INDEX contacts_linked_user_id_idx ON public.contacts(linked_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = owner_id);

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- On contact insert/update: try to link to an existing profile
CREATE OR REPLACE FUNCTION public.link_contact_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_user UUID;
BEGIN
  IF NEW.linked_user_id IS NULL THEN
    SELECT id INTO matched_user
    FROM public.profiles
    WHERE (NEW.email IS NOT NULL AND lower(email) = lower(NEW.email))
       OR (NEW.phone IS NOT NULL AND phone = NEW.phone)
    LIMIT 1;
    IF matched_user IS NOT NULL AND matched_user <> NEW.owner_id THEN
      NEW.linked_user_id := matched_user;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER contacts_link_on_upsert
  BEFORE INSERT OR UPDATE OF email, phone ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.link_contact_to_profile();

-- When a new profile is created (new signup), link matching contacts
CREATE OR REPLACE FUNCTION public.link_profile_to_contacts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contacts
  SET linked_user_id = NEW.id
  WHERE linked_user_id IS NULL
    AND owner_id <> NEW.id
    AND (
      (NEW.email IS NOT NULL AND lower(email) = lower(NEW.email))
      OR (NEW.phone IS NOT NULL AND phone = NEW.phone)
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_link_contacts
  AFTER INSERT OR UPDATE OF email, phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_profile_to_contacts();
