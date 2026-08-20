import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const signature = req.headers['chariow-signature'] || req.headers['x-chariow-signature'];
    
    const webhookSecret = process.env.CHARIOW_WEBHOOK_SECRET;

    // Facultatif : Vérification de la signature HMAC si la documentation Chariow l'exige
    if (signature && webhookSecret) {
      // Logic de vérification standard (exemple HMAC SHA256)
      // const hmac = crypto.createHmac('sha256', webhookSecret);
      // const digest = Buffer.from(hmac.update(JSON.stringify(payload)).digest('hex'), 'utf8');
      // const checksum = Buffer.from(signature, 'utf8');
      // if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
      //   return res.status(401).json({ error: 'Invalid signature' });
      // }
    }

    // Vérifier que l'événement correspond à un paiement réussi
    const eventType = payload.type || payload.event;
    if (eventType === 'checkout.session.completed' || eventType === 'payment.success') {
      
      const etablissement_id = payload.data?.metadata?.etablissement_id || payload.metadata?.etablissement_id;

      if (!etablissement_id) {
        console.error("Missing etablissement_id in webhook payload");
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

      console.log(`Payment successful for etablissement ${etablissement_id}`);
      return res.status(200).json({ received: true });
    }

    // Pour les autres types d'événements
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: 'Webhook error' });
  }
}
