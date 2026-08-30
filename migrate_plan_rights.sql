-- ============================================================
-- Migration : Droits exacts par plan EduManager
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Ajouter les colonnes de droits à la table etablissements
ALTER TABLE public.etablissements
  ADD COLUMN IF NOT EXISTS abonnement_expire_le   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_eleves             INTEGER DEFAULT 300,
  ADD COLUMN IF NOT EXISTS max_enseignants        INTEGER DEFAULT 99999,
  ADD COLUMN IF NOT EXISTS max_classes            INTEGER DEFAULT 99999,
  ADD COLUMN IF NOT EXISTS fonctionnalites        TEXT[]  DEFAULT ARRAY['eleves','classes','notes','paiements'];

-- Commentaires
COMMENT ON COLUMN public.etablissements.abonnement_expire_le IS 'Date d''expiration de l''abonnement';
COMMENT ON COLUMN public.etablissements.max_eleves           IS 'Nombre maximum d''élèves selon le plan';
COMMENT ON COLUMN public.etablissements.max_enseignants      IS 'Nombre maximum d''enseignants selon le plan';
COMMENT ON COLUMN public.etablissements.max_classes          IS 'Nombre maximum de classes selon le plan';
COMMENT ON COLUMN public.etablissements.fonctionnalites      IS 'Fonctionnalités activées pour ce plan';

-- ─── Mettre à jour les limites selon le plan exact du cahier des charges ───

-- STARTER : 300 élèves max, 14 jours d'essai gratuit
UPDATE public.etablissements SET
  max_eleves      = 300,
  max_enseignants = 99999,
  max_classes     = 99999,
  fonctionnalites = ARRAY['eleves','classes','notes','paiements'],
  abonnement_expire_le = COALESCE(date_fin_essai, NOW() + INTERVAL '14 days')
WHERE plan = 'starter';

-- STANDARD : 1 000 élèves max, 30 jours, 25 000 FCFA/mois
UPDATE public.etablissements SET
  max_eleves      = 1000,
  max_enseignants = 99999,
  max_classes     = 99999,
  fonctionnalites = ARRAY['eleves','classes','notes','paiements','emploi_temps','notifications','messages'],
  abonnement_expire_le = NOW() + INTERVAL '30 days'
WHERE plan = 'standard' AND statut_abonnement = 'actif';

-- PREMIUM : 1 500 élèves max, 30 jours, 35 000 FCFA/mois
UPDATE public.etablissements SET
  max_eleves      = 1500,
  max_enseignants = 99999,
  max_classes     = 99999,
  fonctionnalites = ARRAY['eleves','classes','notes','paiements','emploi_temps','notifications','messages','rapports','portail_parents','multi_utilisateurs'],
  abonnement_expire_le = NOW() + INTERVAL '30 days'
WHERE plan = 'premium' AND statut_abonnement = 'actif';

-- VIP : Illimité, assistance sur site, 30 jours renouvelables sur devis
UPDATE public.etablissements SET
  max_eleves      = 99999,
  max_enseignants = 99999,
  max_classes     = 99999,
  fonctionnalites = ARRAY['all'],
  abonnement_expire_le = NOW() + INTERVAL '30 days'
WHERE plan = 'vip' AND statut_abonnement = 'actif';
