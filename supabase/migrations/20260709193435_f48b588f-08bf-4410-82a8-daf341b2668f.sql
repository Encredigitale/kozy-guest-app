
CREATE TABLE public.widget_configs (
  widget_id text PRIMARY KEY,
  enabled boolean,
  display_order integer,
  event_types text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.widget_configs TO anon;
GRANT SELECT ON public.widget_configs TO authenticated;
GRANT ALL ON public.widget_configs TO service_role;

ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read widget configs"
ON public.widget_configs FOR SELECT
USING (true);

CREATE POLICY "Admins can manage widget configs"
ON public.widget_configs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_widget_configs_updated_at
BEFORE UPDATE ON public.widget_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
