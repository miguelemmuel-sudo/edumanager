-- ============================================================
-- Migration : Activation complète des droits selon le plan
-- EduManager — à exécuter dans Supabase SQL Editor
-- ============================================================

-- Ajouter les colonnes nécessaires à la table etablissements
ALTER TABLE public.etablissements
  ADD COLUMN IF NOT EXISTS abonnement_expire_le   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_eleves             INTEGER DEFAULT 300,
  ADD COLUMN IF NOT EXISTS max_enseignants        INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_classes            INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS fonctionnalites        TEXT[]  DEFAULT ARRAY['eleves','classes','notes','paiements','emploi_temps','notifications'];

-- Commentaires explicatifs
COMMENT ON COLUMN public.etablissements.abonnement_expire_le IS 'Date d''expiration de l''abonnement payant';
COMMENT ON COLUMN public.etablissements.max_eleves           IS 'Nombre maximum d''élèves selon le plan';
COMMENT ON COLUMN public.etablissements.max_enseignants      IS 'Nombre maximum d''enseignants selon le plan';
COMMENT ON COLUMN public.etablissements.max_classes          IS 'Nombre maximum de classes selon le plan';
COMMENT ON COLUMN public.etablissements.fonctionnalites      IS 'Liste des fonctionnalités activées pour ce plan';

-- Mettre à jour les établissements actifs existants selon leur plan actuel
UPDATE public.etablissements
SET
  max_eleves        = CASE plan WHEN 'premium' THEN 1000 WHEN 'vip' THEN 99999 ELSE 300 END,
  max_enseignants   = CASE plan WHEN 'premium' THEN 100  WHEN 'vip' THEN 99999 ELSE 30  END,
  max_classes       = CASE plan WHEN 'premium' THEN 60   WHEN 'vip' THEN 99999 ELSE 20  END,
  fonctionnalites   = CASE plan
    WHEN 'premium' THEN ARRAY['eleves','classes','notes','paiements','emploi_temps','notifications','messages','rapports','portail_parents','multi_utilisateurs']
    WHEN 'vip'     THEN ARRAY['all']
    ELSE                ARRAY['eleves','classes','notes','paiements','emploi_temps','notifications']
  END
WHERE statut_abonnement = 'actif';
