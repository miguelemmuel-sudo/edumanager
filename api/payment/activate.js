import { createClient } from '@supabase/supabase-js';

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

  const { etablissement_id, plan } = req.body;

  if (!etablissement_id || !plan) {
    return res.status(400).json({ success: false, error: 'etablissement_id et plan requis' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier si déjà actif (webhook déjà traité)
    const { data: etab } = await supabase
      .from('etablissements')
      .select('statut_abonnement, plan, abonnement_expire_le')
      .eq('id', etablissement_id)
      .single();

    if (etab && etab.statut_abonnement === 'actif') {
      return res.status(200).json({
        success: true,
        plan: etab.plan,
        expires: etab.abonnement_expire_le
      });
    }

    // ─── Activation directe ─────────────────────────────────────────────────
    // On fait confiance à la redirection de la passerelle de paiement.
    // La passerelle ne redirige vers success_url/callback qu'après validation.
    // Le webhook mettra aussi à jour la base, mais pour l'UX on active immédiatement.
    const planKey = (plan || 'standard').toLowerCase();
    const rights  = PLAN_RIGHTS[planKey] || PLAN_RIGHTS.standard;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + rights.duree_jours);

    const { error: updateError } = await supabase
      .from('etablissements')
      .update({
        statut_abonnement:    'actif',
        plan:                 planKey,
        abonnement_expire_le: expiresAt.toISOString(),
        max_eleves:           rights.max_eleves,
        max_enseignants:      99999,
        max_classes:          99999,
        fonctionnalites:      ['all'],
        updated_at:           new Date().toISOString()
      })
      .eq('id', etablissement_id);

    if (updateError) {
      console.error('Supabase activation error:', updateError);
      return res.status(500).json({ success: false, error: 'Activation failed' });
    }

    console.log(`✅ Compte activé - établissement: ${etablissement_id}, plan: ${planKey}`);
    return res.status(200).json({
      success: true,
      plan: planKey,
      expires: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Activate endpoint error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
