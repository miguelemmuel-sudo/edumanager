-- Script de génération intelligente des matricules
-- Ce trigger s'exécute automatiquement avant l'insertion d'un nouvel élève

CREATE OR REPLACE FUNCTION public.generate_smart_matricule()
RETURNS TRIGGER AS $$
DECLARE
    v_annee VARCHAR(2);
    v_lettre_nom VARCHAR(1);
    v_classe_prefix VARCHAR(3);
    v_classe_nom VARCHAR;
    v_count INT;
    v_seq VARCHAR(3);
    v_prefix VARCHAR;
BEGIN
    -- Si un matricule est déjà fourni, on ne l'écrase pas
    IF NEW.matricule IS NOT NULL AND trim(NEW.matricule) <> '' THEN
        RETURN NEW;
    END IF;

    -- 1. Année (ex: '24' pour 2024)
    v_annee := right(to_char(CURRENT_DATE, 'YY'), 2);
    
    -- 2. Initiale du nom
    IF NEW.nom IS NOT NULL AND length(NEW.nom) > 0 THEN
        v_lettre_nom := upper(substring(trim(NEW.nom) FROM 1 FOR 1));
    ELSE
        v_lettre_nom := 'X';
    END IF;
    
    -- 3. Préfixe de la classe (3 premières lettres du nom de la classe, sans les espaces)
    IF NEW.classe_id IS NOT NULL THEN
        SELECT nom INTO v_classe_nom FROM public.classes WHERE id = NEW.classe_id;
        v_classe_prefix := upper(substring(regexp_replace(v_classe_nom, '\s+', '', 'g') FROM 1 FOR 3));
    ELSE
        v_classe_prefix := 'XXX';
    END IF;
    
    -- Le préfixe complet de recherche (ex: 24C-TER)
    v_prefix := v_annee || v_lettre_nom || '-' || v_classe_prefix;
    
    -- 4. Trouver la séquence (compteur)
    -- On compte combien d'élèves ont déjà ce préfixe précis dans l'établissement
    SELECT COUNT(*) INTO v_count
    FROM public.eleves
    WHERE etablissement_id = NEW.etablissement_id
      AND matricule LIKE v_prefix || '-%';
    
    -- Incrémenter et formater sur 3 chiffres (ex: 012)
    v_seq := lpad((v_count + 1)::VARCHAR, 3, '0');
    
    -- 5. Assigner le matricule généré au nouvel élève (ex: 24C-TER-012)
    NEW.matricule := v_prefix || '-' || v_seq;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà pour éviter les doublons
DROP TRIGGER IF EXISTS trg_generate_matricule ON public.eleves;

-- Créer le trigger qui s'active AVANT chaque insertion
CREATE TRIGGER trg_generate_matricule
BEFORE INSERT ON public.eleves
FOR EACH ROW
EXECUTE FUNCTION public.generate_smart_matricule();
