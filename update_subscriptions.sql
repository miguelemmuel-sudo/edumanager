-- Ajout de la colonne statut_abonnement à la table etablissements
ALTER TABLE public.etablissements 
ADD COLUMN IF NOT EXISTS statut_abonnement VARCHAR(50) DEFAULT 'essai';

-- Commentaire pour la colonne
COMMENT ON COLUMN public.etablissements.statut_abonnement IS 'Statut de l''abonnement (essai, en_attente_paiement, actif, suspendu)';
