INSERT INTO public.widgets (id, name, description, version, category, manifest, enabled, status, size)
VALUES (
  'event.new.menu',
  'Étape 4 · Menu',
  'Composition du menu lors de la création d''un événement',
  '1.0.0',
  'onboarding',
  '{"component":"event.new.menu","order":30,"surface":"event.new"}'::jsonb,
  true,
  'published',
  'full'
)
ON CONFLICT (id) DO UPDATE SET manifest = EXCLUDED.manifest, name = EXCLUDED.name, enabled = true, status = 'published';