export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ref } = req.query;

    if (!ref) {
      return res.status(400).json({ error: 'Référence manquante', status: 'error' });
    }

    const chariowApiKey = process.env.CHARIOW_API_KEY;

    // Chariow: vérification d'une session de checkout par référence ou ID
    // On essaie d'abord via /v1/checkout/{ref}, sinon /v1/payments/{ref}
    let data = null;
    let found = false;

    const endpoints = [
      `https://api.chariow.com/v1/checkout/${encodeURIComponent(ref)}`,
      `https://api.chariow.com/v1/payments/${encodeURIComponent(ref)}`
    ];

    for (const url of endpoints) {
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${chariowApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (r.ok) {
        data = await r.json();
        found = true;
        break;
      }
    }

    if (!found || !data) {
      return res.status(404).json({ error: 'Session de paiement introuvable', status: 'not_found' });
    }

    // Récupérer le statut Chariow (peut varier selon la réponse)
    const rawStatus = (
      data.status ||
      data.data?.status ||
      data.payment?.status ||
      data.checkout?.status ||
      'unknown'
    ).toLowerCase();

    // Chariow statuts possibles: 'paid', 'completed', 'success', 'pending', 'failed', 'cancelled', 'expired'
    const isSuccess = ['paid', 'completed', 'success', 'successful'].includes(rawStatus);
    const isPending = ['pending', 'processing', 'initiated', 'created'].includes(rawStatus);
    const isFailed  = ['failed', 'cancelled', 'expired', 'rejected'].includes(rawStatus);

    // Récupérer les métadonnées pour identifier l'établissement
    const metadata = data.metadata || data.data?.metadata || {};

    return res.status(200).json({
      status: rawStatus,
      success: isSuccess,
      pending: isPending,
      failed: isFailed,
      etablissement_id: metadata.etablissement_id || null,
      plan: metadata.plan || null,
      reference: ref
    });

  } catch (error) {
    console.error('Chariow verify error:', error);
    return res.status(500).json({ error: error.message, status: 'error' });
  }
}
