import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Droits/limites par plan EduManager
 * Ces limites sont stockées dans la table etablissements
 * et lues par le dashboard pour restreindre les fonctionnalités.
 */
const PLAN_RIGHTS = {
  // Starter : gratuit, 300 élèves max, 14 jours d'essai
  starter: {
    plan: 'starter',
    max_eleves: 300,
    max_enseignants: 99999,
    max_classes: 99999,
    fonctionnalites: ['all'],
    duree_jours: 14  // Essai gratuit 14 jours
  },
  // Standard : 25 000 FCFA/mois, 1 000 élèves max, 30 jours
  standard: {
    plan: 'standard',
    max_eleves: 1000,
    max_enseignants: 99999,
    max_classes: 99999,
    fonctionnalites: ['all'],
    duree_jours: 30
  },
  // Premium : 35 000 FCFA/mois, 1 500 élèves max, 30 jours
  premium: {
    plan: 'premium',
    max_eleves: 1500,
    max_enseignants: 99999,
    max_classes: 99999,
    fonctionnalites: ['all'],
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
    const signature = req.headers['chariow-signature'] || req.headers['x-chariow-signature'];
    const webhookSecret = process.env.CHARIOW_WEBHOOK_SECRET;

    // Vérification de la signature HMAC Chariow
    if (signature && webhookSecret) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = hmac.update(JSON.stringify(payload)).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
        console.error('Invalid Chariow webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Événements Chariow indiquant un paiement réussi
    const eventType = payload.type || payload.event;
    const successEvents = [
      'checkout.session.completed',
      'payment.success',
      'payment.completed',
      'payment.paid'
    ];

    if (!successEvents.includes(eventType)) {
      console.log(`Chariow webhook event ignoré: ${eventType}`);
      return res.status(200).json({ received: true });
    }

    // Récupérer l'établissement_id depuis les métadonnées
    const metadata = payload.data?.metadata || payload.metadata || {};
    const etablissement_id = metadata.etablissement_id;
    const planChoisi = (metadata.plan || 'standard').toLowerCase();

    if (!etablissement_id) {
      console.error('Missing etablissement_id in Chariow webhook:', JSON.stringify(payload));
      return res.status(400).json({ error: 'Missing etablissement_id' });
    }

    const rights = PLAN_RIGHTS[planChoisi] || PLAN_RIGHTS.standard;

    // Initialiser Supabase avec la clé Service Role
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Calculer la date d'expiration selon le plan
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

    console.log(`✅ Chariow: Compte activé — établissement ${etablissement_id}, plan: ${rights.plan}, expire le: ${expiresAt.toISOString()}`);
    return res.status(200).json({ received: true, etablissement_id, plan: rights.plan });

  } catch (error) {
    console.error('Chariow Webhook Error:', error);
    return res.status(500).json({ error: 'Webhook error' });
  }
}
