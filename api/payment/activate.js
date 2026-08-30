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

  const { etablissement_id, plan, gateway } = req.body;

  if (!etablissement_id || !plan) {
    return res.status(400).json({ success: false, error: 'etablissement_id et plan requis' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const planKey = (plan || 'standard').toLowerCase();
    const rights  = PLAN_RIGHTS[planKey] || PLAN_RIGHTS.standard;

    // ─── Lire l'état actuel de l'établissement ────────────────────────────────
    const { data: etab } = await supabase
      .from('etablissements')
      .select('statut_abonnement, plan, abonnement_expire_le, nom')
      .eq('id', etablissement_id)
      .single();

    const previousPlan   = etab?.plan || 'starter';
    const isUpgrade      = previousPlan !== planKey;
    const wasExpired     = etab?.statut_abonnement === 'expired' || etab?.statut_abonnement === 'trial';

    // ─── Si déjà actif avec le BON plan → retourner succès immédiatement ─────
    if (etab && etab.statut_abonnement === 'actif' && etab.plan === planKey) {
      return res.status(200).json({
        success:      true,
        upgrade:      false,
        plan:         etab.plan,
        previous_plan: previousPlan,
        expires:      etab.abonnement_expire_le,
        message:      'Compte déjà actif'
      });
    }

    // ─── Calcul de la nouvelle date d'expiration ──────────────────────────────
    // Pour une mise à niveau (upgrade), on repart de maintenant.
    // Toutes les données (élèves, classes, notes, paiements) sont CONSERVÉES.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + rights.duree_jours);

    // ─── Mise à niveau / Activation ────────────────────────────────────────────
    // UPDATE : seuls les champs du plan sont modifiés.
    // Les données métier (élèves, classes, notes, etc.) ne sont PAS touchées.
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
        // Réinitialiser la date d'essai si c'était un compte trial
        date_fin_essai:       planKey === 'starter' ? expiresAt.toISOString() : null,
        updated_at:           new Date().toISOString()
      })
      .eq('id', etablissement_id);

    if (updateError) {
      console.error('Supabase activation error:', updateError);
      return res.status(500).json({ success: false, error: 'Activation failed' });
    }

    const action = isUpgrade ? 'Mise à niveau' : (wasExpired ? 'Renouvellement' : 'Activation');
    console.log(`✅ ${action} - établissement: ${etablissement_id} | ${previousPlan} → ${planKey} | expire: ${expiresAt.toISOString()}`);

    return res.status(200).json({
      success:       true,
      upgrade:       isUpgrade,
      renewal:       !isUpgrade && wasExpired,
      plan:          planKey,
      previous_plan: previousPlan,
      expires:       expiresAt.toISOString(),
      message:       isUpgrade
        ? `Mise à niveau réussie : ${previousPlan} → ${planKey}`
        : wasExpired
          ? `Abonnement renouvelé : ${planKey}`
          : `Compte activé : ${planKey}`
    });

  } catch (error) {
    console.error('Activate endpoint error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
