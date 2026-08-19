-- Fonction RPC sécurisée pour le portail parent
-- Permet de récupérer les bulletins d'un élève en fournissant uniquement son matricule et son code d'accès
-- SECURITY DEFINER permet à la fonction de contourner les politiques RLS car les parents ne sont pas authentifiés.

CREATE OR REPLACE FUNCTION get_eleve_bulletins_secure(p_matricule VARCHAR, p_code_acces VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_eleve RECORD;
    v_etab RECORD;
    v_bulletins JSON;
    v_result JSON;
BEGIN
    -- 1. Chercher l'élève avec le matricule et code d'accès correspondants
    SELECT * INTO v_eleve
    FROM public.eleves
    WHERE matricule = p_matricule AND code_acces = p_code_acces
    LIMIT 1;

    -- Si aucun élève n'est trouvé, renvoyer NULL
    IF v_eleve IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Récupérer les informations de l'établissement de cet élève
    SELECT nom, logo_url, telephone, email, site_web, adresse INTO v_etab
    FROM public.etablissements
    WHERE id = v_eleve.etablissement_id
    LIMIT 1;

    -- 3. Récupérer les bulletins publiés avec tous les détails et rang dynamique
    SELECT json_agg(
        json_build_object(
            'id', b.id,
            'periode', p.nom,
            'moyenne_generale', b.moyenne_generale,
            'total_points', b.total_points,
            'total_coefs', b.total_coefs,
            'decision', b.decision,
            'mention', b.mention,
            'donnees_json', b.donnees_json,
            'statut', b.statut,
            'created_at', b.created_at,
            'rang', (
                SELECT count(*) + 1 
                FROM public.bulletins b2 
                WHERE b2.classe_id = b.classe_id 
                  AND b2.periode_id = b.periode_id 
                  AND b2.moyenne_generale > b.moyenne_generale
            ),
            'moyenne_classe', (
                SELECT avg(b3.moyenne_generale)
                FROM public.bulletins b3
                WHERE b3.classe_id = b.classe_id
                  AND b3.periode_id = b.periode_id
            ),
            'effectif_classe', (
                SELECT count(*)
                FROM public.bulletins b4
                WHERE b4.classe_id = b.classe_id
                  AND b4.periode_id = b.periode_id
            )
        ) ORDER BY b.created_at DESC
    ) INTO v_bulletins
    FROM public.bulletins b
    LEFT JOIN public.periodes_evaluation p ON b.periode_id = p.id
    WHERE b.eleve_id = v_eleve.id
      AND b.statut = 'Publié'; -- On ne montre que les bulletins publiés aux parents

    -- Si aucun bulletin, initialiser un tableau vide
    IF v_bulletins IS NULL THEN
        v_bulletins := '[]'::JSON;
    END IF;

    -- 4. Construire et renvoyer l'objet final JSON
    v_result := json_build_object(
        'eleve', json_build_object(
            'id', v_eleve.id,
            'matricule', v_eleve.matricule,
            'prenom', v_eleve.prenom,
            'nom', v_eleve.nom,
            'classe', (SELECT nom FROM public.classes WHERE id = v_eleve.classe_id)
        ),
        'etablissement', json_build_object(
            'nom', v_etab.nom,
            'logo_url', v_etab.logo_url,
            'telephone', v_etab.telephone,
            'email', v_etab.email,
            'site_web', v_etab.site_web,
            'adresse', v_etab.adresse
        ),
        'bulletins', v_bulletins
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
