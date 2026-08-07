-- Script de création des tables EduManager

-- 1. Table Classes
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    matricule VARCHAR(50) UNIQUE,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table Paiements
CREATE TABLE IF NOT EXISTS public.paiements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eleve_id UUID REFERENCES public.eleves(id) ON DELETE CASCADE,
    montant NUMERIC(12,2) NOT NULL,
    date_paiement DATE DEFAULT CURRENT_DATE,
    statut VARCHAR(50) DEFAULT 'Payé',
    motif VARCHAR(200),
    methode VARCHAR(100),
    reference_transaction VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table Notes (Notes & Bulletins)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- si NULL, notif globale
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type_notif VARCHAR(50) DEFAULT 'Info',
    lu BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paramétrage RLS (Row Level Security) - Désactivé pour le développement initial, activé plus tard si besoin
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enseignants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emplois_temps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Creation de policies permissives pour l'audit/developpement 
-- (Puisque l'application est statique et n'a pas encore de backend strict)
CREATE POLICY "Activer l'acces public pour eleves" ON public.eleves FOR ALL USING (true);
CREATE POLICY "Activer l'acces public pour enseignants" ON public.enseignants FOR ALL USING (true);
CREATE POLICY "Activer l'acces public pour classes" ON public.classes FOR ALL USING (true);
CREATE POLICY "Activer l'acces public pour paiements" ON public.paiements FOR ALL USING (true);
CREATE POLICY "Activer l'acces public pour notes" ON public.notes FOR ALL USING (true);
CREATE POLICY "Activer l'acces public pour emplois_temps" ON public.emplois_temps FOR ALL USING (true);
CREATE POLICY "Activer l'acces public pour messages" ON public.messages FOR ALL USING (true);
CREATE POLICY "Activer l'acces public pour notifications" ON public.notifications FOR ALL USING (true);

-- Activer le Realtime sur les nouvelles tables
-- Note: Requires `supabase_realtime` publication setup
begin;
  -- drop publication if exists supabase_realtime;
  -- create publication supabase_realtime;
  commit;
alter publication supabase_realtime add table public.eleves;
alter publication supabase_realtime add table public.enseignants;
alter publication supabase_realtime add table public.classes;
alter publication supabase_realtime add table public.paiements;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.emplois_temps;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
