CREATE OR REPLACE FUNCTION public.get_current_etablissement_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    etab_id UUID;
BEGIN
    -- Chercher d'abord si l'utilisateur est un admin
    SELECT id INTO etab_id FROM public.etablissements WHERE admin_id = auth.uid() LIMIT 1;
    IF etab_id IS NOT NULL THEN
        RETURN etab_id;
    END IF;
    
    -- Sinon, chercher si c'est un enseignant
    SELECT etablissement_id INTO etab_id FROM public.enseignants WHERE user_id = auth.uid() LIMIT 1;
    IF etab_id IS NOT NULL THEN
        RETURN etab_id;
    END IF;

    -- Sinon, chercher si c'est défini dans profiles (comme fallback global)
    SELECT etablissement_id INTO etab_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    RETURN etab_id;
EXCEPTION
    WHEN undefined_table THEN
        RETURN NULL;
END;
$$;
