import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ref, etablissement_id } = req.query;

    if (!ref) {
      return res.status(400).json({ error: 'Référence manquante', status: 'error' });
    }

    // ─── ÉTAPE 1 : Vérifier directement dans Supabase ──────────────────────────
    // Si le webhook Notch Pay a déjà traité le paiement, le compte est déjà actif.
    // C'est la méthode la plus fiable et rapide.
    if (etablissement_id) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: etab, error: dbError } = await supabase
        .from('etablissements')
        .select('statut_abonnement, plan, abonnement_expire_le')
        .eq('id', etablissement_id)
        .single();

      if (!dbError && etab && etab.statut_abonnement === 'actif') {
        // ✅ Webhook déjà traité → compte actif → retourner succès immédiatement
        console.log(`✅ Supabase confirm: établissement ${etablissement_id} est actif (plan: ${etab.plan})`);
        return res.status(200).json({
          status: 'complete',
          success: true,
          pending: false,
          failed: false,
          plan: etab.plan,
          etablissement_id,
          source: 'supabase', // Pour debug
          reference: ref
        });
      }
    }

    // ─── ÉTAPE 2 : Interroger l'API Notch Pay ──────────────────────────────────
    // Si Supabase n'est pas encore mis à jour (webhook en attente), on vérifie Notch Pay.
    const notchPayPublicKey = process.env.NOTCH_PAY_PUBLIC_KEY;

    const notchRes = await fetch(`https://api.notchpay.co/payments/${encodeURIComponent(ref)}`, {
      method: 'GET',
      headers: {
        'Authorization': notchPayPublicKey,
        'Accept': 'application/json'
      }
    });

    const data = await notchRes.json();

    if (!notchRes.ok) {
      console.error('Notch Pay verify error:', data);
      // Ne pas bloquer : retourner pending pour réessayer plus tard
      return res.status(200).json({
        status: 'pending',
        success: false,
        pending: true,
        failed: false,
        reference: ref
      });
    }

    // Notch Pay statuts : 'complete', 'pending', 'failed', 'cancelled', 'expired'
    const rawStatus = (
      data.transaction?.status ||
      data.payment?.status ||
      data.status ||
      'unknown'
    ).toLowerCase();

    const isSuccess = ['complete', 'completed', 'successful', 'success'].includes(rawStatus);
    const isPending = ['pending', 'processing', 'initiated'].includes(rawStatus);
    const isFailed  = ['failed', 'cancelled', 'expired', 'rejected'].includes(rawStatus);

    // Récupérer le plan depuis les métadonnées Notch Pay si disponible
    const planFromMeta = data.transaction?.metadata?.plan || data.payment?.metadata?.plan || null;

    // Si Notch Pay dit "complete" mais Supabase n'est pas encore mis à jour,
    // on déclenche manuellement la mise à jour du compte
    if (isSuccess && etablissement_id) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const PLAN_RIGHTS = {
        starter:  { max_eleves: 300,   duree_jours: 14 },
        standard: { max_eleves: 1000,  duree_jours: 30 },
        premium:  { max_eleves: 1500,  duree_jours: 30 },
        vip:      { max_eleves: 99999, duree_jours: 30 }
      };

      const plan = (planFromMeta || 'standard').toLowerCase();
      const rights = PLAN_RIGHTS[plan] || PLAN_RIGHTS.standard;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rights.duree_jours);

      await supabase.from('etablissements').update({
        statut_abonnement: 'actif',
        plan: plan,
        abonnement_expire_le: expiresAt.toISOString(),
        max_eleves: rights.max_eleves,
        max_enseignants: 99999,
        max_classes: 99999,
        fonctionnalites: ['all'],
        updated_at: new Date().toISOString()
      }).eq('id', etablissement_id);

      console.log(`✅ Verify fallback: compte activé via verify pour établissement ${etablissement_id}`);
    }

    return res.status(200).json({
      status: rawStatus,
      success: isSuccess,
      pending: isPending,
      failed: isFailed,
      plan: planFromMeta,
      etablissement_id: etablissement_id || null,
      source: 'notchpay',
      reference: ref
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    // En cas d'erreur réseau, ne pas bloquer l'utilisateur - retourner pending
    return res.status(200).json({
      status: 'pending',
      success: false,
      pending: true,
      failed: false,
      error: error.message,
      reference: req.query.ref
    });
  }
}
