import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Droits/limites par plan EduManager (identique au webhook Chariow)
 */
const PLAN_RIGHTS = {
  // Starter : gratuit, 300 élèves max, 14 jours d'essai
  starter: {
    plan: 'starter',
    max_eleves: 300,
    max_enseignants: 15,
    max_classes: 10,
    fonctionnalites: ['eleves', 'classes', 'notes', 'paiements'],
    duree_jours: 14  // Essai gratuit 14 jours
  },
  // Standard : 25 000 FCFA/mois, 1 000 élèves max, 30 jours
  standard: {
    plan: 'standard',
    max_eleves: 1000,
    max_enseignants: 50,
    max_classes: 30,
    fonctionnalites: ['eleves', 'classes', 'notes', 'paiements', 'emploi_temps', 'notifications', 'messages'],
    duree_jours: 30
  },
  // Premium : 35 000 FCFA/mois, 1 500 élèves max, 30 jours
  premium: {
    plan: 'premium',
    max_eleves: 1500,
    max_enseignants: 100,
    max_classes: 60,
    fonctionnalites: ['eleves', 'classes', 'notes', 'paiements', 'emploi_temps', 'notifications', 'messages', 'rapports', 'portail_parents', 'multi_utilisateurs'],
    duree_jours: 30
  },
  // VIP : Sur devis, assistance sur site, 30 jours renouvelables
  vip: {
    plan: 'vip',
    max_eleves: 99999,
    max_enseignants: 99999,
    max_classes: 99999,
    fonctionnalites: ['all'],
    duree_jours: 30  // Renouvelé chaque mois sur devis
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const signature = req.headers['x-notch-signature'] || req.headers['notch-signature'];
    const webhookHashKey = process.env.NOTCH_PAY_HASH_KEY;

    // Vérification de la signature HMAC Notch Pay
    if (signature && webhookHashKey) {
      const hmac = crypto.createHmac('sha256', webhookHashKey);
      const digest = hmac.update(JSON.stringify(payload)).digest('hex');
      if (digest !== signature) {
        console.error('Invalid Notch Pay webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const eventType = payload.event || payload.type;

    // Événements indiquant un paiement réussi
    if (eventType !== 'payment.complete' && eventType !== 'payment.success') {
      console.log(`Notch Pay webhook event ignoré: ${eventType}`);
      return res.status(200).json({ received: true });
    }

    // ─── Récupérer l'établissement_id ──────────────────────────────
    // Priorité 1 : métadonnées (fiable avec notre nouvelle implémentation)
    let etablissement_id = payload.data?.metadata?.etablissement_id;
    let planChoisi = (payload.data?.metadata?.plan || 'standard').toLowerCase();

    // Priorité 2 : extraire depuis la référence unique "etabId_timestamp_random"
    if (!etablissement_id) {
      const ref = payload.data?.reference || '';
      const parts = ref.split('_');
      if (parts.length >= 3) {
        // L'id peut contenir des underscores — on retire les 2 derniers segments (timestamp + random)
        etablissement_id = parts.slice(0, parts.length - 2).join('_');
      } else if (parts.length >= 1) {
        etablissement_id = parts[0];
      }
    }

    if (!etablissement_id) {
      console.error('Missing etablissement_id in Notch Pay webhook:', JSON.stringify(payload));
      return res.status(400).json({ error: 'Missing etablissement_id' });
    }

    const rights = PLAN_RIGHTS[planChoisi] || PLAN_RIGHTS.standard;

    // Initialiser Supabase avec la clé Service Role
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + rights.duree_jours);

    // ─── Activer l'établissement avec tous ses droits ───────────────
    const { error: updateError } = await supabase
      .from('etablissements')
      .update({
        statut_abonnement: 'actif',
        plan: rights.plan,
        abonnement_expire_le: expiresAt.toISOString(),
        max_eleves: rights.max_eleves,
        max_enseignants: rights.max_enseignants,
        max_classes: rights.max_classes,
        fonctionnalites: rights.fonctionnalites,
        updated_at: new Date().toISOString()
      })
      .eq('id', etablissement_id);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ error: 'Database update failed' });
    }

    console.log(`✅ Notch Pay: Compte activé — établissement ${etablissement_id}, plan: ${rights.plan}, expire le: ${expiresAt.toISOString()}`);
    return res.status(200).json({ received: true, etablissement_id, plan: rights.plan });

  } catch (error) {
    console.error('Notch Pay Webhook Error:', error);
    return res.status(500).json({ error: 'Webhook error' });
  }
}
