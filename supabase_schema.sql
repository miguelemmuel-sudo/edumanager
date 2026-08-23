-- Script de création des tables EduManager - Architecture Multi-tenant

-- Extension nécessaire pour gen_random_uuid() si non existante
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- /!\ ATTENTION : Ce bloc supprime les tables existantes pour assurer une architecture multi-tenant propre
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.emplois_temps CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.paiements CASCADE;
DROP TABLE IF EXISTS public.eleves CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.enseignants CASCADE;
DROP TABLE IF EXISTS public.etablissements CASCADE;

-- 0. Table Établissements (Multi-tenant)
CREATE TABLE IF NOT EXISTS public.etablissements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    pays VARCHAR(100),
    ville VARCHAR(100),
    tel VARCHAR(50),
    plan VARCHAR(50) DEFAULT 'starter',
    date_fin_essai TIMESTAMPTZ,
    statut_abonnement VARCHAR(50) DEFAULT 'Actif',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fonction utilitaire pour obtenir l'ID de l'établissement courant de l'utilisateur
CREATE OR REPLACE FUNCTION public.get_current_etablissement_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.etablissements WHERE admin_id = auth.uid() LIMIT 1;
$$;

-- 1. Table Classes
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    nom VARCHAR(100) NOT NULL,
    niveau VARCHAR(100),
    annee_scolaire VARCHAR(20) DEFAULT '2025-2026',
    enseignant_principal_id UUID, -- FK a definir plus bas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table Enseignants
CREATE TABLE IF NOT EXISTS public.enseignants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- optionnel si l'enseignant se connecte
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    matiere VARCHAR(100),
    tel VARCHAR(50),
    email VARCHAR(150),
    statut VARCHAR(50) DEFAULT 'Actif',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.classes ADD CONSTRAINT fk_classes_enseignant FOREIGN KEY (enseignant_principal_id) REFERENCES public.enseignants(id) ON DELETE SET NULL;

-- 3. Table Eleves
CREATE TABLE IF NOT EXISTS public.eleves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    matricule VARCHAR(50),
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    date_naissance DATE,
    sexe VARCHAR(20),
    nationalite VARCHAR(100),
    adresse TEXT,
    parent_nom VARCHAR(150),
    parent_tel VARCHAR(50),
    parent_email VARCHAR(150),
    classe_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    statut VARCHAR(50) DEFAULT 'Actif',
    statut_paiement VARCHAR(50) DEFAULT 'Inconnu',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (etablissement_id, matricule)
);

-- 4. Table Paiements
CREATE TABLE IF NOT EXISTS public.paiements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    eleve_id UUID REFERENCES public.eleves(id) ON DELETE CASCADE,
    montant NUMERIC(12,2) NOT NULL,
    date_paiement DATE DEFAULT CURRENT_DATE,
    statut VARCHAR(50) DEFAULT 'Payé',
    motif VARCHAR(200),
    methode VARCHAR(100),
    reference_transaction VARCHAR(150),
    type_frais VARCHAR(100) DEFAULT 'Scolarité',
    montant_attendu NUMERIC(12,2),
    reste_a_payer NUMERIC(12,2),
    caissier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table Notes (Notes & Bulletins)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    eleve_id UUID REFERENCES public.eleves(id) ON DELETE CASCADE,
    enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE SET NULL,
    matiere VARCHAR(100) NOT NULL,
    valeur NUMERIC(5,2) NOT NULL,
    coefficient NUMERIC(3,1) DEFAULT 1,
    type_evaluation VARCHAR(100), -- Ex: Devoir, Composition
    periode VARCHAR(100), -- Ex: 1er Trimestre
    commentaire TEXT,
    date_saisie DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table Emplois du Temps
CREATE TABLE IF NOT EXISTS public.emplois_temps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE SET NULL,
    matiere VARCHAR(100) NOT NULL,
    jour_semaine VARCHAR(20) NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    salle VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    expediteur_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    destinataire_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sujet VARCHAR(255),
    contenu TEXT NOT NULL,
    lu BOOLEAN DEFAULT FALSE,
    date_envoi TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE DEFAULT public.get_current_etablissement_id(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- si NULL, notif globale pour l'établissement
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type_notif VARCHAR(50) DEFAULT 'Info',
    lu BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paramétrage RLS (Row Level Security) - ACTIVÉ
ALTER TABLE public.etablissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enseignants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emplois_temps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Creation des policies de sécurité strictes
CREATE POLICY "Etablissement owner policy" ON public.etablissements 
    FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "Tenant Isolation classes" ON public.classes 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

CREATE POLICY "Tenant Isolation enseignants" ON public.enseignants 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

CREATE POLICY "Tenant Isolation eleves" ON public.eleves 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

CREATE POLICY "Tenant Isolation paiements" ON public.paiements 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

CREATE POLICY "Tenant Isolation notes" ON public.notes 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

CREATE POLICY "Tenant Isolation emplois_temps" ON public.emplois_temps 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

CREATE POLICY "Tenant Isolation messages" ON public.messages 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

CREATE POLICY "Tenant Isolation notifications" ON public.notifications 
    FOR ALL USING (etablissement_id = public.get_current_etablissement_id());

-- Activer le Realtime sur toutes les tables
begin;
  -- drop publication if exists supabase_realtime;
  -- create publication supabase_realtime;
  commit;
alter publication supabase_realtime add table public.etablissements;
alter publication supabase_realtime add table public.eleves;
alter publication supabase_realtime add table public.enseignants;
alter publication supabase_realtime add table public.classes;
alter publication supabase_realtime add table public.paiements;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.emplois_temps;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
