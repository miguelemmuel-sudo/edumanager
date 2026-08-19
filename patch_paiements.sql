-- Ce script permet de corriger la table "paiements" dans un environnement de production existant.
-- Il ajoute les colonnes manquantes qui empêchaient l'enregistrement des paiements.

ALTER TABLE public.paiements 
ADD COLUMN IF NOT EXISTS type_frais VARCHAR(100) DEFAULT 'Scolarité',
ADD COLUMN IF NOT EXISTS montant_attendu NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS reste_a_payer NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS caissier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
