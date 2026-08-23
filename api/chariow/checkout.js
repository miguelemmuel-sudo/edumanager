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

    const origin = req.headers.origin || 'https://edumanager-ten.vercel.app';

    // Parse phone number loosely to separate country code if starts with + or 237
    let country_code = "CM"; // Chariow API expects an ISO alpha-2 country code like "CM"
    let number = phone ? phone.replace(/\s+/g, '') : "";
    if (number) {
      if (number.startsWith("+237")) {
         number = number.substring(4);
      } else if (number.startsWith("237") && number.length > 9) {
         number = number.substring(3);
      } else if (number.startsWith("+")) {
         number = number.substring(4);
      }
    }

    const payload = {
      product_id: productId,
      store: merchantId,
      email: email || "admin@edumanager.com",
      first_name: first_name || "Admin",
      last_name: last_name || "Edu",
      metadata: {
        etablissement_id: etablissement_id,
        plan: plan
      },
      success_url: `${origin}/dashboard/index.html?payment=success`,
      cancel_url: `${origin}/checkout.html`
    };

    if (number) {
      payload.phone = {
        number: number,
        country_code: country_code
      };
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
      console.error("Chariow API Error:", data);
      return res.status(400).json({ error: data.message || 'Erreur lors de la création du paiement Chariow' });
    }

    // On s'attend à recevoir une URL de paiement de Chariow (checkout_url)
    let finalUrl = data.checkout_url || data.url || data.payment_url;
    if (!finalUrl && data.data) {
      finalUrl = data.data.checkout_url || data.data.url || data.data.payment_url;
      if (!finalUrl && data.data.payment) {
        finalUrl = data.data.payment.checkout_url || data.data.payment.url;
      }
    }

    if (!finalUrl) {
      console.error("URL de paiement introuvable dans la réponse:", data);
      return res.status(400).json({ error: "L'URL de paiement n'a pas pu être générée par Chariow. Détails: " + JSON.stringify(data) });
    }

    return res.status(200).json({ paymentUrl: finalUrl });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
