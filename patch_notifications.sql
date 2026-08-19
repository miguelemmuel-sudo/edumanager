-- Script to add triggers for automatic notifications and data retention cleanup

-- 1. Notifications Triggers
CREATE OR REPLACE FUNCTION public.notify_on_paiement()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (etablissement_id, titre, message, type_notif)
    VALUES (NEW.etablissement_id, 'Nouveau Paiement', 'Un paiement de ' || NEW.montant || ' a été enregistré.', 'Paiement');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_on_paiement ON public.paiements;
CREATE TRIGGER trigger_notify_on_paiement
AFTER INSERT ON public.paiements
FOR EACH ROW EXECUTE FUNCTION public.notify_on_paiement();

CREATE OR REPLACE FUNCTION public.notify_on_inscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (etablissement_id, titre, message, type_notif)
    VALUES (NEW.etablissement_id, 'Nouvelle Inscription', 'L''élève ' || NEW.prenom || ' ' || NEW.nom || ' a été inscrit.', 'Inscription');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_on_inscription ON public.eleves;
CREATE TRIGGER trigger_notify_on_inscription
AFTER INSERT ON public.eleves
FOR EACH ROW EXECUTE FUNCTION public.notify_on_inscription();

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (etablissement_id, titre, message, type_notif)
    VALUES (NEW.etablissement_id, 'Nouveau Message', 'Un message a été envoyé (Objet: ' || COALESCE(NEW.sujet, '') || ').', 'Message');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_on_message ON public.messages;
CREATE TRIGGER trigger_notify_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();


-- 2. Data Retention Cleanup (Trigger based)
-- Cleans up old notifications (> 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL '24 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_notifications ON public.notifications;
CREATE TRIGGER trigger_cleanup_notifications
AFTER INSERT ON public.notifications
FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_old_notifications();

-- Cleans up old messages (> 48 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_messages()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.messages WHERE date_envoi < NOW() - INTERVAL '48 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_messages ON public.messages;
CREATE TRIGGER trigger_cleanup_messages
AFTER INSERT ON public.messages
FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_old_messages();
