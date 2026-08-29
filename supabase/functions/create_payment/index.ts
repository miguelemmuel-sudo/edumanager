import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { plan, gateway, etablissement_id } = await req.json()

    // 1. Déterminer le montant selon le plan
    let amount = 0
    if (plan === 'standard') amount = 25000
    if (plan === 'premium') amount = 35000

    if (amount === 0) {
      return new Response(JSON.stringify({ error: "Plan invalide pour le paiement" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    let paymentUrl = ""

    // 2. Traitement Notch Pay
    if (gateway === 'notchpay') {
      const notchPayPublicKey = Deno.env.get('NOTCH_PAY_PUBLIC_KEY') || 'pk.pS5OEv0VDdsbHJ4I9ym0u5nbHrJp2MmEr0DOGS1a4TwOAD1UBdUmeL7xHLlFkwoFD3DIj1pSKfpzuKoRIGjpQGBM2Qe3B7xQbuflDJZXd4wnX6luLOUXO3hcBvr1Q'
      
      const response = await fetch('https://api.notchpay.co/payments', {
        method: 'POST',
        headers: {
          'Authorization': notchPayPublicKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'XAF',
          reference: etablissement_id,
          description: `Paiement pour le plan ${plan}`,
          callback: 'https://edumanagerpower.com/dashboard/index.html?payment=success'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'initialisation du paiement Notch Pay');
      }
      
      paymentUrl = data.authorization_url;
    } 
    // 3. Traitement Chariow
    else if (gateway === 'chariow') {
      const chariowSecret = Deno.env.get('CHARIOW_SECRET_KEY')
      
      // Exemple d'appel API Chariow
      /*
      const response = await fetch('https://api.chariow.com/v1/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chariowSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'XAF',
          reference: etablissement_id,
          success_url: 'https://votredomaine.com/dashboard/index.html?payment=success'
        })
      });
      const data = await response.json();
      paymentUrl = data.checkout_url;
      */
      
      // Simulation pour le moment
      paymentUrl = "https://chariow.com/checkout/sandbox_demo"
    }

    return new Response(JSON.stringify({ paymentUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
