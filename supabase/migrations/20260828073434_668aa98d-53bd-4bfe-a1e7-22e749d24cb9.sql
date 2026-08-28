CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  first_name text,
  last_name text,
  phone text,
  phone_normalized text,
  phone_verified boolean NOT NULL DEFAULT false,
  profile_picture_path text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "own profile insert" ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_profiles_updated BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.food_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  allows_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.food_preferences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_preferences TO authenticated;
GRANT ALL ON public.food_preferences TO service_role;
ALTER TABLE public.food_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read food prefs" ON public.food_preferences FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage food prefs" ON public.food_preferences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_food_preferences_updated BEFORE UPDATE ON public.food_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  allows_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.allergies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allergies TO authenticated;
GRANT ALL ON public.allergies TO service_role;
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read allergies" ON public.allergies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage allergies" ON public.allergies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_allergies_updated BEFORE UPDATE ON public.allergies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_food_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  preference_id uuid REFERENCES public.food_preferences(id) ON DELETE CASCADE,
  custom_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_food_preferences_unique ON public.user_food_preferences (user_id, preference_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_food_preferences TO authenticated;
GRANT ALL ON public.user_food_preferences TO service_role;
ALTER TABLE public.user_food_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food prefs" ON public.user_food_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  allergy_id uuid REFERENCES public.allergies(id) ON DELETE CASCADE,
  custom_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_allergies_unique ON public.user_allergies (user_id, allergy_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_allergies TO authenticated;
GRANT ALL ON public.user_allergies TO service_role;
ALTER TABLE public.user_allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own allergies" ON public.user_allergies FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('terms','privacy')),
  version text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  requires_acceptance boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_type, version)
);
GRANT SELECT ON public.legal_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published legal" ON public.legal_documents FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin manage legal" ON public.legal_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_legal_documents_updated BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('terms','privacy')),
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own consents select" ON public.user_consents FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "own consents insert" ON public.user_consents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.profile_field_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'optional' CHECK (status IN ('required','optional','hidden')),
  locked boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profile_field_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_field_config TO authenticated;
GRANT ALL ON public.profile_field_config TO service_role;
ALTER TABLE public.profile_field_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read field config" ON public.profile_field_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage field config" ON public.profile_field_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_profile_field_config_updated BEFORE UPDATE ON public.profile_field_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.food_preferences (key, label, sort_order, allows_custom) VALUES
  ('vegetarian','Végétarien',10,false),
  ('vegan','Vegan',20,false),
  ('no-pork','Sans porc',30,false),
  ('gluten-free','Sans gluten',40,false),
  ('lactose-free','Sans lactose',50,false),
  ('halal','Halal',60,false),
  ('kosher','Casher',70,false),
  ('other','Autre',999,true);

INSERT INTO public.allergies (key, label, sort_order, allows_custom) VALUES
  ('peanuts','Arachides',10,false),
  ('nuts','Fruits à coque',20,false),
  ('gluten','Gluten',30,false),
  ('lactose','Lactose',40,false),
  ('eggs','Œufs',50,false),
  ('fish','Poissons',60,false),
  ('shellfish','Crustacés',70,false),
  ('soy','Soja',80,false),
  ('other','Autre',999,true);

INSERT INTO public.profile_field_config (field_key, label, status, locked, sort_order) VALUES
  ('first_name','Prénom','required',true,10),
  ('last_name','Nom','required',true,20),
  ('email','E-mail','required',true,30),
  ('phone','Téléphone','optional',false,40),
  ('profile_picture','Photo','optional',false,50),
  ('food_preferences','Préférences alimentaires','optional',false,60),
  ('allergies','Allergies','optional',false,70);

INSERT INTO public.legal_documents (doc_type, version, title, content, published_at) VALUES
  ('terms','1.0','Conditions Générales d''Utilisation','Les présentes Conditions Générales d''Utilisation encadrent l''accès et l''usage de la plateforme Kozy. En créant un compte, vous acceptez de les respecter.', now()),
  ('privacy','1.0','Politique de confidentialité','Cette Politique de confidentialité décrit les données personnelles collectées par Kozy, leur finalité, leur durée de conservation et vos droits (accès, rectification, suppression, portabilité).', now());

CREATE POLICY "avatars own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);