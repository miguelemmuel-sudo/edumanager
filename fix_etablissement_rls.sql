-- Fix RLS so all users of an establishment can see their establishment's details
-- This is necessary to load the correct terminology (classes, niveaux), name, and logo.

DROP POLICY IF EXISTS "Users can view their etablissement" ON public.etablissements;

CREATE POLICY "Users can view their etablissement" ON public.etablissements
FOR SELECT USING (
    id = public.get_current_etablissement_id()
);

-- Just in case the logo_url or systeme_educatif columns are missing from the schema
ALTER TABLE public.etablissements ADD COLUMN IF NOT EXISTS systeme_educatif VARCHAR(100) DEFAULT 'Francophone';
ALTER TABLE public.etablissements ADD COLUMN IF NOT EXISTS logo_url TEXT;
