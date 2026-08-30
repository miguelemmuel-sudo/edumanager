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

    // ─── Normalisation du numéro de téléphone ─────────────────────────────────
    // L'utilisateur entre un numéro international complet ex: +237677123456
    // ou local ex: 677123456. On extrait les chiffres et l'indicatif pays.
    let phoneStr = (phone || '').replace(/[\s\-().]/g, '');

    let countryCode = 'CM'; // défaut Cameroun
    let localNumber = phoneStr;

    // Si le numéro commence par +, extraire l'indicatif pays
    if (phoneStr.startsWith('+')) {
      const intlMap = {
        '237': 'CM', '33': 'FR', '1': 'US', '44': 'GB',
        '32': 'BE', '41': 'CH', '34': 'ES', '49': 'DE',
        '225': 'CI', '221': 'SN', '223': 'ML', '229': 'BJ',
        '224': 'GN', '228': 'TG', '242': 'CG', '243': 'CD'
      };
      const withoutPlus = phoneStr.substring(1);
      for (const code of ['237','225','221','223','229','224','228','242','243','33','44','49','34','32','41','1']) {
        if (withoutPlus.startsWith(code)) {
          countryCode = intlMap[code] || 'CM';
          localNumber = withoutPlus.substring(code.length);
          break;
        }
      }
      if (localNumber === phoneStr) localNumber = withoutPlus; // pas d'indicatif trouvé
    } else if (phoneStr.startsWith('00')) {
      localNumber = phoneStr.substring(2);
    }

    // Garder uniquement les chiffres
    localNumber = localNumber.replace(/\D/g, '');

    // Validation minimale : 8 chiffres minimum
    const phoneIsValid = localNumber.length >= 8;

    // Format final pour Chariow : objet { number, country_code }
    const phonePayload = {
      number: phoneIsValid ? localNumber : '600000001',
      country_code: countryCode
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
