export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, etablissement_id, email, first_name, last_name, phone } = req.body;

    const chariowApiKey = process.env.CHARIOW_API_KEY;
    const merchantId    = process.env.CHARIOW_MERCHANT_ID;
    const origin        = req.headers.origin || 'https://edumanagerpower.com';

    // Montant selon le plan
    const amount = plan === 'premium' ? 35000 : (plan === 'standard' ? 100 : 25000);

    // ─── Normalisation du numéro de téléphone ────────────────────────────────
    // Chariow EXIGE le phone. On normalise vers le format international +237XXXXXXXXX
    let phoneStr = (phone || '').replace(/[\s\-().]/g, '');

    // Retirer le + initial pour traitement
    if (phoneStr.startsWith('+237')) {
      phoneStr = phoneStr.substring(4); // garder les 9 chiffres locaux
    } else if (phoneStr.startsWith('237') && phoneStr.length > 9) {
      phoneStr = phoneStr.substring(3);
    } else if (phoneStr.startsWith('+')) {
      phoneStr = phoneStr.substring(1); // retirer le + uniquement
    }

    // Validation : doit être au moins 8 chiffres
    const phoneIsValid = phoneStr.length >= 8 && /^\d+$/.test(phoneStr);

    // Format final pour Chariow : objet { number, country_code }
    const phonePayload = {
      number: phoneIsValid ? phoneStr : '600000001', // fallback de test si vide
      country_code: 'CM'
    };

    // Générer une référence unique
    const uniqueRef = `CW_${etablissement_id}_${Date.now()}`;

    // URL de succès avec toutes les infos pour la vérification
    const successUrl = `${origin}/payment-verify.html?ref=${encodeURIComponent(uniqueRef)}&gateway=chariow&etablissement_id=${encodeURIComponent(etablissement_id)}&plan=${encodeURIComponent(plan)}`;

    // ─── Payload Chariow ────────────────────────────────────────────────────
    // On envoie le montant directement (pas via product_id qui peut causer des erreurs)
    const payload = {
      amount:      amount,
      currency:    'XAF',
      email:       email      || 'admin@edumanager.com',
      first_name:  first_name || 'Admin',
      last_name:   last_name  || 'EduManager',
      phone:       phonePayload,
      description: `Abonnement EduManager – Plan ${plan}`,
      reference:   uniqueRef,
      metadata: {
        etablissement_id,
        plan,
        reference: uniqueRef
      },
      success_url: successUrl,
      cancel_url:  `${origin}/checkout.html`
    };

    // Si un product_id est configuré, l'ajouter (optionnel selon config Chariow)
    const productId = plan === 'premium'
      ? process.env.CHARIOW_PREMIUM_PLAN_ID
      : process.env.CHARIOW_STANDARD_PLAN_ID;
    if (productId) payload.product_id = productId;

    // Appel API Chariow
    const chariowRes = await fetch('https://api.chariow.com/v1/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chariowApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await chariowRes.json();

    if (!chariowRes.ok) {
      console.error('Chariow API Error:', JSON.stringify(data));
      // Renvoyer l'erreur complète pour diagnostic
      return res.status(400).json({
        error: data.message || data.error || 'Erreur Chariow',
        details: data
      });
    }

    // Extraire l'URL de paiement (Chariow peut la mettre à différents endroits)
    let finalUrl = data.checkout_url
      || data.url
      || data.payment_url
      || data.data?.checkout_url
      || data.data?.url
      || data.data?.payment_url
      || data.data?.payment?.checkout_url
      || data.data?.payment?.url;

    if (!finalUrl) {
      console.error('URL introuvable dans réponse Chariow:', JSON.stringify(data));
      return res.status(400).json({
        error: "URL de paiement non générée",
        details: data
      });
    }

    return res.status(200).json({ paymentUrl: finalUrl, reference: uniqueRef });

  } catch (error) {
    console.error('Chariow checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
