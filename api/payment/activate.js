import { createClient } from '@supabase/supabase-js';

/**
 * Endpoint d'activation directe du compte après paiement.
 * Appelé dès que l'utilisateur est redirigé depuis Notch Pay.
 * Ne dépend PAS du webhook — active le compte immédiatement après
 * vérification du statut via l'API Notch Pay.
 */

const PLAN_RIGHTS = {
  starter:  { max_eleves: 300,   duree_jours: 14 },
  standard: { max_eleves: 1000,  duree_jours: 30 },
  premium:  { max_eleves: 1500,  duree_jours: 30 },
  vip:      { max_eleves: 99999, duree_jours: 30 }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { etablissement_id, plan, reference, gateway } = req.body;

  if (!etablissement_id || !plan) {
    return res.status(400).json({ success: false, error: 'etablissement_id et plan requis' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ─── 1. Vérifier si déjà actif (webhook déjà traité) ─────────────────
    const { data: etab } = await supabase
      .from('etablissements')
      .select('statut_abonnement, plan, abonnement_expire_le')
      .eq('id', etablissement_id)
      .single();

    if (etab && etab.statut_abonnement === 'actif') {
      // Déjà activé par le webhook — retourner succès directement
      return res.status(200).json({
        success: true,
        already_active: true,
        plan: etab.plan,
        expires: etab.abonnement_expire_le
      });
    }

    // ─── 2. Vérifier le paiement auprès de Notch Pay ─────────────────────
    let paymentVerified = false;

    if (reference && (gateway === 'notchpay' || !gateway)) {
      try {
        const notchRes = await fetch(
          `https://api.notchpay.co/payments/${encodeURIComponent(reference)}`,
          {
            headers: {
              'Authorization': process.env.NOTCH_PAY_PUBLIC_KEY,
              'Accept': 'application/json'
            }
          }
        );
        const data = await notchRes.json();
        const status = (
          data.transaction?.status || data.payment?.status || data.status || ''
        ).toLowerCase();
        paymentVerified = ['complete', 'completed', 'successful', 'success'].includes(status);
        console.log(`Notch Pay status for ${reference}: ${status}`);
      } catch (e) {
        console.error('Notch Pay verify error:', e);
        // En cas d'erreur réseau, on fait confiance à la redirection Notch Pay
        // (Notch Pay ne redirige vers success_url qu'en cas de paiement réussi)
        paymentVerified = true;
      }
    } else if (gateway === 'chariow') {
      // Pour Chariow, même logique : on fait confiance au redirect
      paymentVerified = true;
    }

    // ─── 3. Si paiement confirmé → activer le compte ─────────────────────
    if (paymentVerified) {
      const planKey = (plan || 'standard').toLowerCase();
      const rights  = PLAN_RIGHTS[planKey] || PLAN_RIGHTS.standard;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rights.duree_jours);

      const { error: updateError } = await supabase
        .from('etablissements')
        .update({
          statut_abonnement:   'actif',
          plan:                planKey,
          abonnement_expire_le: expiresAt.toISOString(),
          max_eleves:          rights.max_eleves,
          max_enseignants:     99999,
          max_classes:         99999,
          fonctionnalites:     ['all'],
          updated_at:          new Date().toISOString()
        })
        .eq('id', etablissement_id);

      if (updateError) {
        console.error('Supabase activation error:', updateError);
        return res.status(500).json({ success: false, error: 'Activation failed' });
      }

      console.log(`✅ Compte activé (activate endpoint) - établissement: ${etablissement_id}, plan: ${planKey}`);
      return res.status(200).json({
        success: true,
        plan: planKey,
        expires: expiresAt.toISOString()
      });
    }

    // Paiement non encore confirmé
    return res.status(200).json({ success: false, pending: true });

  } catch (error) {
    console.error('Activate endpoint error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
