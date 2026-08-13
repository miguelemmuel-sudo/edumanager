-- ==============================================================================
-- EDUMANAGER : SCRIPT DE MISE À JOUR RBAC & MULTI-TENANT
-- ==============================================================================

-- 1. Ajout du statut dans la table profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'Actif';
-- Les statuts possibles: Actif, En attente, Suspendu, Désactivé

-- 2. Création de la table des Permissions Globales
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL, -- Ex: 'students.view', 'grades.create'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertion des permissions de base
INSERT INTO public.permissions (name, description)
VALUES 
    ('students.view', 'Voir les élèves'),
    ('students.create', 'Créer des élèves'),
    ('students.update', 'Modifier des élèves'),
    ('students.delete', 'Supprimer des élèves'),
    
    ('teachers.view', 'Voir les enseignants'),
    ('teachers.create', 'Créer des enseignants'),
    ('teachers.update', 'Modifier des enseignants'),
    
    ('grades.view', 'Voir les notes'),
    ('grades.create', 'Saisir des notes'),
    ('grades.update', 'Modifier des notes'),
    ('grades.validate', 'Valider les bulletins'),
    
    ('payments.view', 'Voir les paiements'),
    ('payments.create', 'Enregistrer un paiement'),
    ('payments.update', 'Modifier un paiement'),
    ('payments.cancel', 'Annuler un paiement'),
    
    ('reports.view', 'Voir les rapports financiers et pédagogiques'),
    ('settings.manage', 'Gérer les paramètres de l''établissement')
ON CONFLICT (name) DO NOTHING;

-- 3. Création de la table des Groupes (Par Établissement)
CREATE TABLE IF NOT EXISTS public.user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Ex: 'Groupe Enseignants', 'Comptables'
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE, -- True pour les groupes par défaut qu'on ne peut pas supprimer
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(etablissement_id, name)
);

-- 4. Liaison Groupes <-> Permissions
CREATE TABLE IF NOT EXISTS public.group_permissions (
    group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, permission_id)
);

-- 5. Liaison Utilisateurs <-> Groupes
CREATE TABLE IF NOT EXISTS public.user_group_members (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, group_id)
);

-- 6. Table d'Audit (Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etablissement_id UUID REFERENCES public.etablissements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- Ex: 'CREATE', 'UPDATE', 'DELETE'
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Politiques de Sécurité (RLS) pour les nouvelles tables
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Les Admins peuvent gérer les groupes de leur établissement
CREATE POLICY "Admins manage groups" ON public.user_groups
    FOR ALL USING (
        etablissement_id = public.get_current_etablissement_id() 
        AND public.get_current_role() = 'admin'
    );
-- Les utilisateurs peuvent voir les groupes de leur établissement
CREATE POLICY "Users view groups" ON public.user_groups
    FOR SELECT USING (etablissement_id = public.get_current_etablissement_id());

-- Membres de groupes
CREATE POLICY "Admins manage group members" ON public.user_group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_groups 
            WHERE id = public.user_group_members.group_id 
            AND etablissement_id = public.get_current_etablissement_id()
        )
        AND public.get_current_role() = 'admin'
    );
CREATE POLICY "Users view group members" ON public.user_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_groups 
            WHERE id = public.user_group_members.group_id 
            AND etablissement_id = public.get_current_etablissement_id()
        )
    );

-- Audit logs : Seuls les admins peuvent lire. Personne ne modifie directement.
CREATE POLICY "Admins view audit logs" ON public.audit_logs
    FOR SELECT USING (
        etablissement_id = public.get_current_etablissement_id()
        AND public.get_current_role() = 'admin'
    );
CREATE POLICY "System insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true); -- Laissé ouvert pour l'insertion par les triggers/fonctions

-- ==============================================================================
-- 8. FONCTION DE CRÉATION DES GROUPES PAR DÉFAUT LORS DE LA CRÉATION D'ÉTABLISSEMENT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.setup_default_groups_for_etablissement(p_etab_id UUID)
RETURNS VOID AS $$
DECLARE
    v_admin_group UUID;
    v_enseignant_group UUID;
    v_comptable_group UUID;
    v_parent_group UUID;
    v_eleve_group UUID;
BEGIN
    -- 1. Créer les groupes
    INSERT INTO public.user_groups (etablissement_id, name, description, is_system)
    VALUES (p_etab_id, 'Direction', 'Administrateurs et Directeurs', true) RETURNING id INTO v_admin_group;
    
    INSERT INTO public.user_groups (etablissement_id, name, description, is_system)
    VALUES (p_etab_id, 'Enseignants', 'Corps professoral', true) RETURNING id INTO v_enseignant_group;
    
    INSERT INTO public.user_groups (etablissement_id, name, description, is_system)
    VALUES (p_etab_id, 'Comptables', 'Service financier', true) RETURNING id INTO v_comptable_group;
    
    INSERT INTO public.user_groups (etablissement_id, name, description, is_system)
    VALUES (p_etab_id, 'Parents', 'Parents d''élèves', true) RETURNING id INTO v_parent_group;
    
    INSERT INTO public.user_groups (etablissement_id, name, description, is_system)
    VALUES (p_etab_id, 'Élèves', 'Élèves inscrits', true) RETURNING id INTO v_eleve_group;

    -- 2. Assigner les permissions au groupe Enseignants
    INSERT INTO public.group_permissions (group_id, permission_id)
    SELECT v_enseignant_group, id FROM public.permissions 
    WHERE name IN ('students.view', 'grades.view', 'grades.create', 'grades.update');

    -- 3. Assigner les permissions au groupe Comptables
    INSERT INTO public.group_permissions (group_id, permission_id)
    SELECT v_comptable_group, id FROM public.permissions 
    WHERE name IN ('students.view', 'payments.view', 'payments.create', 'payments.update', 'payments.cancel', 'reports.view');
    
    -- Le groupe Direction (Admin) n'a pas besoin de permissions explicites car son rôle "admin" lui donne tous les droits dans les politiques.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 9. MISE À JOUR DU HOOK DE CRÉATION D'ÉTABLISSEMENT POUR INCLURE LES GROUPES
-- ==============================================================================
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
BEGIN
  IF p_role = 'admin' THEN
    -- Créer l'établissement
    INSERT INTO public.etablissements (admin_id, nom, type, pays, ville, tel, plan)
    VALUES (p_admin_id, p_nom, p_type, p_pays, p_ville, p_tel, p_plan)
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

-- ==============================================================================
-- 10. REFONTE DE admin_create_user POUR ASSIGNER AU GROUPE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_create_user(
    p_email VARCHAR,
    p_password VARCHAR,
    p_role VARCHAR,
    p_group_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON AS $$
DECLARE
    v_admin_etab_id UUID;
    v_new_user_id UUID;
    v_group_id UUID;
BEGIN
    -- Vérification admin
    SELECT etablissement_id INTO v_admin_etab_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
    LIMIT 1;
    
    IF v_admin_etab_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied: Not an administrator');
    END IF;

    v_new_user_id := gen_random_uuid();

    -- Insertion Auth (Simulation Supabase interne / à adapter selon votre système Auth réel)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000', v_new_user_id, 'authenticated', 'authenticated', 
        p_email, crypt(p_password, gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, p_metadata, now(), now()
    );

    -- Insertion Profil
    INSERT INTO public.profiles (
        id, role, etablissement_id, email, prenom, nom, tel, sexe, statut
    )
    VALUES (
        v_new_user_id, p_role, v_admin_etab_id, p_email, 
        p_metadata->>'prenom', p_metadata->>'nom', p_metadata->>'tel', p_metadata->>'sexe', 'Actif'
    );
    
    -- Détermination du groupe
    v_group_id := p_group_id;
    IF v_group_id IS NULL THEN
        -- Si aucun groupe n'est spécifié, tenter de trouver le groupe par défaut basé sur le rôle
        IF p_role = 'enseignant' THEN
            SELECT id INTO v_group_id FROM public.user_groups WHERE etablissement_id = v_admin_etab_id AND name = 'Enseignants' LIMIT 1;
        ELSIF p_role = 'comptable' THEN
            SELECT id INTO v_group_id FROM public.user_groups WHERE etablissement_id = v_admin_etab_id AND name = 'Comptables' LIMIT 1;
        ELSIF p_role = 'parent' THEN
            SELECT id INTO v_group_id FROM public.user_groups WHERE etablissement_id = v_admin_etab_id AND name = 'Parents' LIMIT 1;
        ELSIF p_role = 'eleve' THEN
            SELECT id INTO v_group_id FROM public.user_groups WHERE etablissement_id = v_admin_etab_id AND name = 'Élèves' LIMIT 1;
        END IF;
    END IF;

    -- Assigner le groupe
    IF v_group_id IS NOT NULL THEN
        INSERT INTO public.user_group_members (user_id, group_id) VALUES (v_new_user_id, v_group_id);
    END IF;
    
    -- Tables spécifiques
    IF p_role = 'enseignant' THEN
        INSERT INTO public.enseignants (user_id, etablissement_id, nom, prenom, email, tel, matiere)
        VALUES (v_new_user_id, v_admin_etab_id, p_metadata->>'nom', p_metadata->>'prenom', p_email, p_metadata->>'tel', p_metadata->>'matieres');
    END IF;
    
    IF p_role = 'eleve' THEN
        INSERT INTO public.eleves (id, etablissement_id, nom, prenom, sexe, classe_id)
        VALUES (v_new_user_id, v_admin_etab_id, p_metadata->>'nom', p_metadata->>'prenom', p_metadata->>'sexe', (p_metadata->>'classe_id')::uuid);
    END IF;

    RETURN json_build_object('success', true, 'user_id', v_new_user_id);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 11. Fonction pour suspendre / réactiver un compte
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(p_user_id UUID, p_statut VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_admin_etab_id UUID;
    v_target_etab_id UUID;
BEGIN
    SELECT etablissement_id INTO v_admin_etab_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin' LIMIT 1;
    IF v_admin_etab_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Permission denied'); END IF;
    
    SELECT etablissement_id INTO v_target_etab_id FROM public.profiles WHERE id = p_user_id;
    IF v_target_etab_id != v_admin_etab_id THEN RETURN json_build_object('success', false, 'error', 'User not in your establishment'); END IF;

    UPDATE public.profiles SET statut = p_statut WHERE id = p_user_id;
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
