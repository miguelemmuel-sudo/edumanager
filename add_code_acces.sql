-- Ajout de la colonne code_acces
ALTER TABLE public.eleves ADD COLUMN IF NOT EXISTS code_acces VARCHAR(10);

-- Fonction pour générer un code aléatoire de 6 caractères majuscules/chiffres
CREATE OR REPLACE FUNCTION generate_random_access_code()
RETURNS VARCHAR AS $$
DECLARE
    chars VARCHAR := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Générer un code pour les élèves existants qui n'en ont pas
UPDATE public.eleves SET code_acces = generate_random_access_code() WHERE code_acces IS NULL;

-- S'assurer que le code est unique pour un établissement donné
ALTER TABLE public.eleves DROP CONSTRAINT IF EXISTS eleves_code_acces_etab_key;
ALTER TABLE public.eleves ADD CONSTRAINT eleves_code_acces_etab_key UNIQUE (etablissement_id, code_acces);
