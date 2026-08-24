ALTER TABLE public.event_types
  ADD COLUMN IF NOT EXISTS default_widgets text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS menu_components text[] NOT NULL DEFAULT '{}';

UPDATE public.event_types SET key = 'pro-meal', label = 'Repas professionnel' WHERE key = 'meeting';

INSERT INTO public.event_types (key, label, icon, description, sort_order, active) VALUES
  ('lunch', 'Déjeuner', 'Utensils', 'Un déjeuner entre proches ou collègues', 15, true),
  ('aperitif-dinatoire', 'Apéro dînatoire', 'Utensils', 'Un apéro qui tient lieu de repas', 55, true),
  ('christmas', 'Noël', 'Gift', 'Le repas de Noël', 90, true),
  ('new-year', 'Nouvel An', 'PartyPopper', 'Le réveillon du Nouvel An', 100, true),
  ('afterwork', 'Afterwork', 'Coffee', 'Un moment détente après le travail', 110, true),
  ('brunch', 'Brunch', 'Coffee', 'Un brunch tardif et convivial', 120, true)
ON CONFLICT (key) DO NOTHING;