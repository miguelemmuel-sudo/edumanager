export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, etablissement_id, email, first_name, last_name, phone } = req.body;

    const chariowApiKey = process.env.CHARIOW_API_KEY;
    const merchantId = process.env.CHARIOW_MERCHANT_ID;
    
    // Sélection du produit en fonction du plan
    const productId = plan === 'premium' 
      ? process.env.CHARIOW_PREMIUM_PLAN_ID
      : process.env.CHARIOW_STANDARD_PLAN_ID;

    const origin = req.headers.origin || 'https://edumanagerpower.com';

    // ─── Traitement du numéro de téléphone ───────────────────────────
    // On normalise le numéro camerounais : on retire l'indicatif pour
    // ne garder que les 9 chiffres locaux (ex: 677123456)
    let phonePayload = undefined; // undefined = ne pas envoyer du tout si invalide
    if (phone) {
      let number = phone.replace(/[\s\-().]/g, ''); // supprimer espaces, tirets, parenth.
      let country_code = 'CM';

      if (number.startsWith('+237')) {
        number = number.substring(4);
      } else if (number.startsWith('237') && number.length > 9) {
        number = number.substring(3);
      } else if (number.startsWith('+')) {
        // Indicatif étranger — on tente d'extraire le numéro local
        const match = number.match(/^\+(\d{1,3})(\d{7,})$/);
        if (match) {
          number = match[2];
          country_code = 'CM'; // par défaut on reste CM, Chariow gérera
        } else {
          number = ''; // numéro illisible, on l'ignore
        }
      }

      // Un numéro camerounais valide : 9 chiffres commençant par 6 ou 2
      if (number.length >= 8 && /^\d+$/.test(number)) {
        phonePayload = { number, country_code };
      }
      // Si le numéro est invalide on n'envoie pas le champ phone du tout
    }

    // Générer une référence unique pour ce paiement
    const uniqueRef = `CW_${etablissement_id}_${Date.now()}`;

    const payload = {
      product_id: productId,
      store: merchantId,
      email: email || 'admin@edumanager.com',
      first_name: first_name || 'Admin',
      last_name: last_name || 'EduManager',
      metadata: {
        etablissement_id: etablissement_id,
        plan: plan,
        reference: uniqueRef
      },
      // Rediriger vers la page de vérification (pas directement le dashboard)
      success_url: `${origin}/payment-verify.html?ref=${encodeURIComponent(uniqueRef)}&gateway=chariow`,
      cancel_url: `${origin}/checkout.html`
    };

    // N'ajouter phone que s'il est valide
    if (phonePayload) {
      payload.phone = phonePayload;
    }

    // Appel à l'API Chariow pour créer une session de paiement (checkout)
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
      console.error('Chariow API Error:', data);
      return res.status(400).json({ error: data.message || data.error || 'Erreur lors de la création du paiement Chariow' });
    }

    // Récupérer l'URL de paiement dans la réponse Chariow
    let finalUrl = data.checkout_url || data.url || data.payment_url;
    if (!finalUrl && data.data) {
      finalUrl = data.data.checkout_url || data.data.url || data.data.payment_url;
      if (!finalUrl && data.data.payment) {
        finalUrl = data.data.payment.checkout_url || data.data.payment.url;
      }
    }

    if (!finalUrl) {
      console.error('URL de paiement introuvable dans la réponse:', data);
      return res.status(400).json({ error: "L'URL de paiement n'a pas pu être générée. Détails: " + JSON.stringify(data) });
    }

    return res.status(200).json({ paymentUrl: finalUrl, reference: uniqueRef });

  } catch (error) {
    console.error('Internal Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
