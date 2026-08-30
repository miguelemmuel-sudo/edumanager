export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ref } = req.query;

    if (!ref) {
      return res.status(400).json({ error: 'Reference manquante' });
    }

    const notchPayPublicKey = process.env.NOTCH_PAY_PUBLIC_KEY || 'pk.pS5OEv0VDdsbHJ4I9ym0u5nbHrJp2MmEr0DOGS1a4TwOAD1UBdUmeL7xHLlFkwoFD3DIj1pSKfpzuKoRIGjpQGBM2Qe3B7xQbuflDJZXd4wnX6luLOUXO3hcBvr1Q';

    // Appel à l'API Notch Pay pour vérifier le statut du paiement
    const notchRes = await fetch(`https://api.notchpay.co/payments/${encodeURIComponent(ref)}`, {
      method: 'GET',
      headers: {
        'Authorization': notchPayPublicKey,
        'Accept': 'application/json'
      }
    });

    const data = await notchRes.json();

    if (!notchRes.ok) {
      console.error("Notch Pay verify error:", data);
      return res.status(400).json({ error: data.message || 'Erreur lors de la vérification du paiement', status: 'error' });
    }

    // Notch Pay retourne le statut dans data.transaction.status ou data.status
    const status = data.transaction?.status || data.payment?.status || data.status || 'unknown';

    // Statuts possibles Notch Pay: 'complete', 'pending', 'failed', 'cancelled', 'expired'
    const isSuccess = status === 'complete' || status === 'successful' || status === 'success';
    const isPending = status === 'pending' || status === 'processing';
    const isFailed  = status === 'failed' || status === 'cancelled' || status === 'expired';

    return res.status(200).json({
      status,
      success: isSuccess,
      pending: isPending,
      failed: isFailed,
      amount: data.transaction?.amount || data.payment?.amount,
      currency: data.transaction?.currency || 'XAF',
      reference: ref
    });

  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ error: error.message, status: 'error' });
  }
}
