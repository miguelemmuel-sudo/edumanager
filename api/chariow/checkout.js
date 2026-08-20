export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, etablissement_id } = req.body;

    const chariowApiKey = process.env.CHARIOW_API_KEY;
    const merchantId = process.env.CHARIOW_MERCHANT_ID;
    
    // Sélection du produit en fonction du plan
    const productId = plan === 'premium' 
      ? process.env.CHARIOW_PREMIUM_PLAN_ID
      : process.env.CHARIOW_STANDARD_PLAN_ID;

    const origin = req.headers.origin || 'https://edumanager-ten.vercel.app';

    // Appel à l'API Chariow pour créer une session de paiement (checkout)
    const chariowRes = await fetch('https://api.chariow.com/v1/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chariowApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product: productId,
        store: merchantId,
        metadata: {
          etablissement_id: etablissement_id,
          plan: plan
        },
        success_url: `${origin}/dashboard/index.html?payment=success`,
        cancel_url: `${origin}/checkout.html`
      })
    });

    const data = await chariowRes.json();

    if (!chariowRes.ok) {
      console.error("Chariow API Error:", data);
      return res.status(400).json({ error: data.message || 'Erreur lors de la création du paiement Chariow' });
    }

    // On s'attend à recevoir une URL de paiement de Chariow (checkout_url)
    return res.status(200).json({ paymentUrl: data.checkout_url || data.url });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
