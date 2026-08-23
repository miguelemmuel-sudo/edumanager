-- Script de migration : Gestion Multi-Années Académiques et Inscriptions Annuelles
-- Ce script ajoute les nouvelles tables, modifie les tables existantes,
-- déplace les données des élèves vers leurs inscriptions annuelles et met à jour les RLS.

BEGIN;

-- 1. CREATION DE LA TABLE ANNEES_ACADEMIQUES
CREATE TABLE IF NOT EXISTS public.annees_academiques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    nom VARCHAR(50) NOT NULL,
    date_debut DATE,
    date_fin DATE,
    statut VARCHAR(20) DEFAULT 'Active', -- Active, Clôturée, Archivée
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(etablissement_id, nom)
);

-- 2. CREATION DE LA TABLE INSCRIPTIONS_ANNUELLES
CREATE TABLE IF NOT EXISTS public.inscriptions_annuelles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    eleve_id UUID REFERENCES public.eleves(id) ON DELETE CASCADE,
    annee_academique_id UUID REFERENCES public.annees_academiques(id) ON DELETE CASCADE,
    classe_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    statut VARCHAR(50) DEFAULT 'Actif',
    statut_paiement VARCHAR(50) DEFAULT 'Inconnu',
    decision_fin_annee VARCHAR(50),
    moyenne_annuelle NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(eleve_id, annee_academique_id)
);

-- 3. AJOUTER LA COLONNE annee_academique_id AUX AUTRES TABLES
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS annee_academique_id UUID REFERENCES public.annees_academiques(id) ON DELETE CASCADE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS annee_academique_id UUID REFERENCES public.annees_academiques(id) ON DELETE CASCADE;
ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS annee_academique_id UUID REFERENCES public.annees_academiques(id) ON DELETE CASCADE;
ALTER TABLE public.emplois_temps ADD COLUMN IF NOT EXISTS annee_academique_id UUID REFERENCES public.annees_academiques(id) ON DELETE CASCADE;

-- 4. DONNÉES DE MIGRATION (Pour les établissements existants)
-- a) Créer l'année par défaut '2026-2027' pour chaque établissement
INSERT INTO public.annees_academiques (etablissement_id, nom, statut)
SELECT id, '2026-2027', 'Active'
FROM public.etablissements
ON CONFLICT (etablissement_id, nom) DO NOTHING;

-- b) Affecter l'année par défaut à toutes les classes existantes
UPDATE public.classes c
SET annee_academique_id = a.id
FROM public.annees_academiques a
WHERE c.etablissement_id = a.etablissement_id AND a.nom = '2026-2027' AND c.annee_academique_id IS NULL;

-- c) Mettre à jour les notes existantes
UPDATE public.notes n
SET annee_academique_id = a.id
FROM public.annees_academiques a
WHERE n.etablissement_id = a.etablissement_id AND a.nom = '2026-2027' AND n.annee_academique_id IS NULL;

-- d) Mettre à jour les paiements existants
UPDATE public.paiements p
SET annee_academique_id = a.id
FROM public.annees_academiques a
WHERE p.etablissement_id = a.etablissement_id AND a.nom = '2026-2027' AND p.annee_academique_id IS NULL;

-- e) Mettre à jour les emplois du temps existants
UPDATE public.emplois_temps e
SET annee_academique_id = a.id
FROM public.annees_academiques a
WHERE e.etablissement_id = a.etablissement_id AND a.nom = '2026-2027' AND e.annee_academique_id IS NULL;

-- f) Créer les inscriptions annuelles pour chaque élève existant
INSERT INTO public.inscriptions_annuelles (etablissement_id, eleve_id, annee_academique_id, classe_id, statut, statut_paiement)
SELECT 
    e.etablissement_id,
    e.id,
    a.id,
    e.classe_id,
    e.statut,
    e.statut_paiement
FROM public.eleves e
JOIN public.annees_academiques a ON e.etablissement_id = a.etablissement_id AND a.nom = '2026-2027'
ON CONFLICT (eleve_id, annee_academique_id) DO NOTHING;

-- NOTE: Nous ne supprimons PAS classe_id, statut, statut_paiement de la table eleves
-- pour l'instant afin de maintenir la compatibilité avec les requêtes existantes, 
-- mais à terme, ils seront dépréciés.

-- 5. SECURITE RLS POUR LES NOUVELLES TABLES
ALTER TABLE public.annees_academiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscriptions_annuelles ENABLE ROW LEVEL SECURITY;

-- Suppression des anciennes policies si elles existent (pour réexécution)
DROP POLICY IF EXISTS "Tenant Isolation annees_academiques" ON public.annees_academiques;
DROP POLICY IF EXISTS "Tenant Isolation inscriptions_annuelles" ON public.inscriptions_annuelles;

CREATE POLICY "Tenant Isolation annees_academiques" ON public.annees_academiques 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

CREATE POLICY "Tenant Isolation inscriptions_annuelles" ON public.inscriptions_annuelles 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

-- 6. AJOUT AU SYSTEME SUPABASE REALTIME
-- Active realtime if not already active
alter publication supabase_realtime add table public.annees_academiques;
alter publication supabase_realtime add table public.inscriptions_annuelles;

COMMIT;
