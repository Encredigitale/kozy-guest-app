DELETE FROM public.event_widgets
WHERE widget_id IN (
  SELECT id
  FROM public.widgets
  WHERE id = 'event.type'
     OR manifest->>'component' = 'event.type'
);

DELETE FROM public.dashboard_layout
WHERE widget_id IN (
  SELECT id
  FROM public.widgets
  WHERE id = 'event.type'
     OR manifest->>'component' = 'event.type'
);

DELETE FROM public.widget_role_bindings
WHERE widget_id IN (
  SELECT id
  FROM public.widgets
  WHERE id = 'event.type'
     OR manifest->>'component' = 'event.type'
);

DELETE FROM public.widgets
WHERE id = 'event.type'
   OR manifest->>'component' = 'event.type';