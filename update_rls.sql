CREATE OR REPLACE FUNCTION public.get_current_etablissement_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $body
  SELECT etablissement_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$body;
