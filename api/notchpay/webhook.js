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
      
      // Le reference est l'etablissement_id passé lors de l'initialisation
      const etablissement_id = payload.data?.reference || payload.data?.metadata?.etablissement_id;

      if (!etablissement_id) {
        console.error("Missing etablissement_id (reference) in Notch Pay webhook payload");
        return res.status(400).json({ error: "Missing etablissement_id" });
      }

      // Initialiser le client Supabase avec la clé Service Role (contourne la RLS)
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase credentials missing");
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Mettre à jour le statut de l'abonnement
      const { error } = await supabase
        .from('etablissements')
        .update({ statut_abonnement: 'actif' })
        .eq('id', etablissement_id);

      if (error) {
        console.error("Error updating database:", error);
        return res.status(500).json({ error: 'Database update failed' });
      }

      console.log(`Notch Pay: Payment successful for etablissement ${etablissement_id}`);
      return res.status(200).json({ received: true });
    }

    // Pour les autres types d'événements (payment.failed, payment.expired, etc.)
    console.log(`Notch Pay webhook event received: ${eventType}`);
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Notch Pay Webhook Error:", error);
    return res.status(500).json({ error: 'Webhook error' });
  }
}
