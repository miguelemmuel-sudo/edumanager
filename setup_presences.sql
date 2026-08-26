-- Script de création de la table des présences
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Création de la table
CREATE TABLE IF NOT EXISTS public.presences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    annee_academique_id UUID REFERENCES public.annees_academiques(id) ON DELETE CASCADE,
    eleve_id UUID REFERENCES public.eleves(id) ON DELETE CASCADE,
    classe_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    date_appel DATE NOT NULL DEFAULT CURRENT_DATE,
    statut VARCHAR(50) NOT NULL DEFAULT 'Présent', -- Présent, Absent, Retard, Absence justifiée, Absence non justifiée
    motif TEXT,
    enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(etablissement_id, annee_academique_id, eleve_id, date_appel)
);

-- 2. Activation de la sécurité niveau ligne (RLS)
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

-- 3. Ajout de la politique d'isolation par établissement
CREATE POLICY "Tenant Isolation presences" ON public.presences 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

-- 4. Ajout au realtime (optionnel mais recommandé pour la synchronisation en direct)
alter publication supabase_realtime add table public.presences;
