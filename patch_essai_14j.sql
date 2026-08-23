-- 1. Ajout des colonnes pour gérer l'abonnement et l'essai gratuit
ALTER TABLE public.etablissements 
ADD COLUMN IF NOT EXISTS date_fin_essai TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS statut_abonnement VARCHAR(50) DEFAULT 'Actif';

-- 2. Mise à jour des établissements "starter" existants pour leur donner 14 jours d'essai à partir d'aujourd'hui
UPDATE public.etablissements
SET date_fin_essai = NOW() + INTERVAL '14 days',
    statut_abonnement = 'trial'
WHERE plan = 'starter' AND date_fin_essai IS NULL;

-- 3. Mise à jour de la fonction RPC pour appliquer automatiquement les 14 jours aux nouveaux inscrits
CREATE OR REPLACE FUNCTION public.create_etablissement_and_profile(
    p_admin_id UUID,
    p_nom VARCHAR,
    p_type VARCHAR,
    p_pays VARCHAR,
    p_ville VARCHAR,
    p_tel VARCHAR,
    p_plan VARCHAR,
    p_role VARCHAR DEFAULT 'admin',
    p_etablissement_id UUID DEFAULT NULL
)
RETURNS JSON AS $body$
DECLARE
  new_etab_id UUID;
  v_admin_group UUID;
  v_date_fin_essai TIMESTAMPTZ;
  v_statut_abonnement VARCHAR(50);
BEGIN
  IF p_role = 'admin' THEN
    IF p_plan = 'starter' THEN
      v_date_fin_essai := NOW() + INTERVAL '14 days';
      v_statut_abonnement := 'trial';
    ELSE
      v_date_fin_essai := NULL;
      v_statut_abonnement := 'pending_payment';
    END IF;

    -- Créer l'établissement
    INSERT INTO public.etablissements (admin_id, nom, type, pays, ville, tel, plan, date_fin_essai, statut_abonnement)
    VALUES (p_admin_id, p_nom, p_type, p_pays, p_ville, p_tel, p_plan, v_date_fin_essai, v_statut_abonnement)
    RETURNING id INTO new_etab_id;
    
    -- Créer le profil
    INSERT INTO public.profiles (id, role, etablissement_id, statut)
    VALUES (p_admin_id, 'admin', new_etab_id, 'Actif');
    
    -- Configurer les groupes par défaut
    PERFORM public.setup_default_groups_for_etablissement(new_etab_id);
    
    -- Assigner le créateur au groupe Direction
    SELECT id INTO v_admin_group FROM public.user_groups WHERE etablissement_id = new_etab_id AND name = 'Direction' LIMIT 1;
    IF v_admin_group IS NOT NULL THEN
        INSERT INTO public.user_group_members (user_id, group_id) VALUES (p_admin_id, v_admin_group);
    END IF;
    
    RETURN json_build_object('success', true, 'etablissement_id', new_etab_id);
  ELSE
    INSERT INTO public.profiles (id, role, etablissement_id, statut)
    VALUES (p_admin_id, p_role, p_etablissement_id, 'Actif');
    
    RETURN json_build_object('success', true, 'etablissement_id', p_etablissement_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;
