import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
        console.error("Invalid Notch Pay webhook signature");
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Notch Pay envoie l'événement dans payload.event et les données dans payload.data
    const eventType = payload.event || payload.type;
    
    // Vérifier que l'événement correspond à un paiement réussi
    if (eventType === 'payment.complete' || eventType === 'payment.success') {
      
      // 1. Priorité aux métadonnées (plus fiable avec la nouvelle référence unique)
      let etablissement_id = payload.data?.metadata?.etablissement_id;

      // 2. Fallback : extraire depuis la référence unique "etabId_timestamp_random"
      if (!etablissement_id) {
        const ref = payload.data?.reference || '';
        // La référence est au format: {etablissement_id}_{timestamp}_{random}
        // On extrait la partie avant le premier underscore suivi de chiffres
        const refParts = ref.split('_');
        if (refParts.length >= 1) {
          // L'établissement_id peut lui-même contenir des underscores, on prend tout sauf les 2 dernières parties
          etablissement_id = refParts.slice(0, refParts.length - 2).join('_') || refParts[0];
        }
      }

      if (!etablissement_id) {
        console.error("Missing etablissement_id in Notch Pay webhook payload", payload);
        return res.status(400).json({ error: "Missing etablissement_id" });
      }

      // Récupérer le plan depuis les métadonnées
      const plan = payload.data?.metadata?.plan || 'standard';

      // Initialiser le client Supabase avec la clé Service Role (contourne la RLS)
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase credentials missing");
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Calculer la date d'expiration (30 jours)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Mettre à jour le statut de l'abonnement
      const { error } = await supabase
        .from('etablissements')
        .update({
          statut_abonnement: 'actif',
          plan_abonnement: plan,
          abonnement_expire_le: expiresAt.toISOString()
        })
        .eq('id', etablissement_id);

      if (error) {
        console.error("Error updating database:", error);
        return res.status(500).json({ error: 'Database update failed' });
      }

      console.log(`Notch Pay: Payment successful for etablissement ${etablissement_id}, plan: ${plan}`);
      return res.status(200).json({ received: true });
    }

    // Pour les autres types d'événements (payment.failed, payment.expired, etc.)
    if (eventType === 'payment.failed' || eventType === 'payment.cancelled') {
      console.log(`Notch Pay webhook: payment failed/cancelled - ${eventType}`);
    }

    console.log(`Notch Pay webhook event received: ${eventType}`);
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Notch Pay Webhook Error:", error);
    return res.status(500).json({ error: 'Webhook error' });
  }
}
