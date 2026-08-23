DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

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
RETURNS JSON AS $body
DECLARE
  new_etab_id UUID;
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

    INSERT INTO public.etablissements (admin_id, nom, type, pays, ville, tel, plan, date_fin_essai, statut_abonnement)
    VALUES (p_admin_id, p_nom, p_type, p_pays, p_ville, p_tel, p_plan, v_date_fin_essai, v_statut_abonnement)
    RETURNING id INTO new_etab_id;
    
    INSERT INTO public.profiles (id, role, etablissement_id)
    VALUES (p_admin_id, 'admin', new_etab_id);
    
    RETURN json_build_object('success', true, 'etablissement_id', new_etab_id);
  ELSE
    INSERT INTO public.profiles (id, role, etablissement_id)
    VALUES (p_admin_id, p_role, p_etablissement_id);
    
    RETURN json_build_object('success', true, 'etablissement_id', p_etablissement_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$body LANGUAGE plpgsql SECURITY DEFINER;
