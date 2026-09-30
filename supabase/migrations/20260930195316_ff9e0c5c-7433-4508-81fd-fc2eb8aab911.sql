CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('superadmin','admin')
  )
$$;
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'superadmin'::public.app_role FROM public.user_roles WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;