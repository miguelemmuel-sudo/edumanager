export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, etablissement_id, email, first_name, last_name, phone } = req.body;

    const notchPayPublicKey = process.env.NOTCH_PAY_PUBLIC_KEY || 'pk.pS5OEv0VDdsbHJ4I9ym0u5nbHrJp2MmEr0DOGS1a4TwOAD1UBdUmeL7xHLlFkwoFD3DIj1pSKfpzuKoRIGjpQGBM2Qe3B7xQbuflDJZXd4wnX6luLOUXO3hcBvr1Q';
    
    // Déterminer le montant en fonction du plan (100 FCFA pour standard en test)
    const amount = plan === 'premium' ? 35000 : (plan === 'standard' ? 100 : 25000);
    
    const origin = req.headers.origin || 'https://edumanagerpower.com';

    // Format phone if needed
    let customerPhone = phone || "";

    // Génère une référence unique pour éviter l'erreur "Reference already existing"
    const uniqueRef = `${etablissement_id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payload = {
      amount: amount,
      currency: "XAF",
      reference: uniqueRef, // Référence unique par tentative de paiement
      description: `Paiement du plan ${plan} - EduManager`,
      customer: {
        email: email || "contact@etablissement.com",
        name: `${first_name || 'Admin'} ${last_name || 'Edu'}`.trim(),
        phone: customerPhone
      },
      // Métadonnées pour le webhook (récupération de etablissement_id)
      metadata: {
        etablissement_id: etablissement_id,
        plan: plan
      },
      // Redirige vers une page de vérification intermédiaire, pas directement le dashboard
      callback: `${origin}/payment-verify.html?ref=${uniqueRef}&gateway=notchpay`
    };

    // Appel à l'API Notch Pay pour créer une session de paiement
    const notchRes = await fetch('https://api.notchpay.co/payments/initialize', {
      method: 'POST',
      headers: {
        'Authorization': notchPayPublicKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await notchRes.json();

    if (!notchRes.ok) {
      console.error("Notch Pay API Error:", data);
      return res.status(400).json({ error: data.message || data.error || 'Erreur lors de la création du paiement Notch Pay' });
    }

    let finalUrl = data.authorization_url;

    if (!finalUrl) {
      console.error("URL de paiement introuvable dans la réponse Notch Pay:", data);
      return res.status(400).json({ error: "L'URL de paiement n'a pas pu être générée par Notch Pay." });
    }

    // Retourner aussi la référence pour que le frontend puisse la stocker
    return res.status(200).json({ paymentUrl: finalUrl, reference: uniqueRef });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
