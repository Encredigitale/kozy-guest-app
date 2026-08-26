DELETE FROM public.widgets
WHERE id = 'event.responses'
   OR manifest->>'component' = 'event.responses';