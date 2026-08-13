-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Alter profiles table to add new fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS prenom VARCHAR(100),
ADD COLUMN IF NOT EXISTS nom VARCHAR(100),
ADD COLUMN IF NOT EXISTS tel VARCHAR(20),
ADD COLUMN IF NOT EXISTS sexe VARCHAR(10),
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Drop old function if it exists
DROP FUNCTION IF EXISTS public.admin_create_user(VARCHAR, VARCHAR, VARCHAR, JSONB);

-- CREATE OR REPLACE FUNCTION to allow admin to create users
CREATE OR REPLACE FUNCTION public.admin_create_user(
    p_email VARCHAR,
    p_password VARCHAR,
    p_role VARCHAR,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON AS $$
DECLARE
    v_admin_etab_id UUID;
    v_new_user_id UUID;
BEGIN
    -- Check if current user is an admin of an establishment
    SELECT etablissement_id INTO v_admin_etab_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
    LIMIT 1;
    
    IF v_admin_etab_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied: Not an administrator');
    END IF;

    -- Generate a new UUID for the user
    v_new_user_id := gen_random_uuid();

    -- Insert into auth.users (simulate Supabase internal flow)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_new_user_id,
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        p_metadata,
        now(),
        now()
    );

    -- Insert into public.profiles
    INSERT INTO public.profiles (
        id, 
        role, 
        etablissement_id, 
        email, 
        prenom, 
        nom, 
        tel, 
        sexe
    )
    VALUES (
        v_new_user_id,
        p_role,
        v_admin_etab_id,
        p_email,
        p_metadata->>'prenom',
        p_metadata->>'nom',
        p_metadata->>'tel',
        p_metadata->>'sexe'
    );
    
    -- Optionnel: Si c'est un enseignant, insérer dans la table enseignants
    IF p_role = 'enseignant' THEN
        INSERT INTO public.enseignants (user_id, etablissement_id, nom, prenom, email, tel, matiere)
        VALUES (
            v_new_user_id,
            v_admin_etab_id,
            p_metadata->>'nom',
            p_metadata->>'prenom',
            p_email,
            p_metadata->>'tel',
            p_metadata->>'matieres'
        );
    END IF;
    
    -- Optionnel: Si c'est un élève, insérer dans la table eleves
    IF p_role = 'eleve' THEN
        INSERT INTO public.eleves (id, etablissement_id, nom, prenom, sexe)
        VALUES (
            v_new_user_id,
            v_admin_etab_id,
            p_metadata->>'nom',
            p_metadata->>'prenom',
            p_metadata->>'sexe'
        );
    END IF;

    RETURN json_build_object('success', true, 'user_id', v_new_user_id);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- CREATE OR REPLACE FUNCTION to allow admin to delete users
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_admin_etab_id UUID;
    v_target_etab_id UUID;
BEGIN
    -- Get current admin's etab_id
    SELECT etablissement_id INTO v_admin_etab_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
    LIMIT 1;
    
    IF v_admin_etab_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied');
    END IF;
    
    -- Verify target user belongs to the same etab
    SELECT etablissement_id INTO v_target_etab_id
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF v_target_etab_id != v_admin_etab_id THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied: Not in your establishment');
    END IF;

    -- Delete from auth.users (will cascade to profiles if configured, else manual delete)
    DELETE FROM auth.users WHERE id = p_user_id;
    
    -- Note: deletion from profiles, enseignants, eleves is handled by ON DELETE CASCADE
    -- provided the foreign keys were setup with CASCADE. If not, we do it manually:
    DELETE FROM public.profiles WHERE id = p_user_id;
    
    RETURN json_build_object('success', true);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- CREATE OR REPLACE FUNCTION public.get_current_role()
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS VARCHAR
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$body$;

-- Update RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Les utilisateurs voient leur profil" ON public.profiles;
CREATE POLICY "Les utilisateurs voient leur profil" 
ON public.profiles FOR SELECT 
USING (id = auth.uid() OR etablissement_id = public.get_current_etablissement_id());

DROP POLICY IF EXISTS "Les admins gèrent les profils" ON public.profiles;
CREATE POLICY "Les admins gèrent les profils" 
ON public.profiles FOR ALL 
USING (
    public.get_current_role() = 'admin' AND 
    public.get_current_etablissement_id() = etablissement_id
);
