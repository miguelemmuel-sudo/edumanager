-- Script de Mise à Jour Supabase - Refonte Module Notes & Bulletins (CORRIGÉ)

-- 0. NETTOYAGE (Pour corriger l'erreur de la précédente exécution partielle)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.bulletins CASCADE;
DROP TABLE IF EXISTS public.classes_matieres CASCADE;
DROP TABLE IF EXISTS public.matieres CASCADE;
DROP TABLE IF EXISTS public.periodes_evaluation CASCADE;

-- 1. Mise à jour de la fonction utilitaire pour gérer les enseignants connectés
CREATE OR REPLACE FUNCTION public.get_current_etablissement_id()
RETURNS UUID
LANGUAGE plpgsql STABLE
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
    RETURN etab_id;
EXCEPTION
    WHEN undefined_table THEN
        RETURN NULL;
END;
$$;

-- 2. Création de la table periodes_evaluation (Séquences, Trimestres, Semestres...)
CREATE TABLE IF NOT EXISTS public.periodes_evaluation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    nom VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Trimestre', 'Séquence', 'Semestre', 'Contrôle Continu', 'Examen'
    parent_id UUID REFERENCES public.periodes_evaluation(id) ON DELETE CASCADE, -- ex: Séquence 1 dépend du Trimestre 1
    ordre INT DEFAULT 1,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Création de la table matieres
CREATE TABLE IF NOT EXISTS public.matieres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE SET NULL,
    nom VARCHAR(150) NOT NULL,
    coefficient_defaut NUMERIC(3,1) DEFAULT 1.0,
    statut VARCHAR(50) DEFAULT 'En attente', -- 'En attente', 'Validé'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table de liaison classes_matieres (Pour assigner une matière à une classe avec un coef spécifique)
CREATE TABLE IF NOT EXISTS public.classes_matieres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    matiere_id UUID REFERENCES public.matieres(id) ON DELETE CASCADE,
    coefficient NUMERIC(3,1) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (classe_id, matiere_id)
);

-- 5. Modification de la table notes
-- On ajoute les nouvelles colonnes
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS periode_id UUID REFERENCES public.periodes_evaluation(id) ON DELETE CASCADE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS matiere_id UUID REFERENCES public.matieres(id) ON DELETE CASCADE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'Brouillon'; -- 'Brouillon', 'Validé'

-- 6. Création de la table bulletins (Archivage)
CREATE TABLE IF NOT EXISTS public.bulletins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    eleve_id UUID REFERENCES public.eleves(id) ON DELETE CASCADE,
    periode_id UUID REFERENCES public.periodes_evaluation(id) ON DELETE CASCADE,
    classe_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    donnees_json JSONB NOT NULL, -- Snapshot complet (Matières, notes, coefs, moyennes)
    moyenne_generale NUMERIC(5,2),
    total_points NUMERIC(6,2),
    total_coefs NUMERIC(5,2),
    rang INT,
    mention VARCHAR(100),
    decision VARCHAR(100),
    statut VARCHAR(50) DEFAULT 'Brouillon', -- 'Brouillon', 'Validé', 'Publié'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (eleve_id, periode_id)
);

-- 7. Création de la table audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'CREATE_NOTE', 'UPDATE_NOTE', 'VALIDATE_BULLETIN'
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Activation de RLS sur les nouvelles tables
ALTER TABLE public.periodes_evaluation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes_matieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. Politiques de sécurité (Tenant Isolation)
CREATE POLICY "Tenant Isolation periodes_evaluation" ON public.periodes_evaluation FOR ALL USING (etablissement_id = public.get_current_etablissement_id());
CREATE POLICY "Tenant Isolation matieres" ON public.matieres FOR ALL USING (etablissement_id = public.get_current_etablissement_id());
CREATE POLICY "Tenant Isolation classes_matieres" ON public.classes_matieres FOR ALL USING (etablissement_id = public.get_current_etablissement_id());
CREATE POLICY "Tenant Isolation bulletins" ON public.bulletins FOR ALL USING (etablissement_id = public.get_current_etablissement_id());
CREATE POLICY "Tenant Isolation audit_logs" ON public.audit_logs FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

-- 10. Realtime pour les nouvelles tables
alter publication supabase_realtime add table public.matieres;
alter publication supabase_realtime add table public.periodes_evaluation;
alter publication supabase_realtime add table public.classes_matieres;
alter publication supabase_realtime add table public.bulletins;
