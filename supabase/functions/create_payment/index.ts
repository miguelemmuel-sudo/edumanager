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

    // 2. Traitement Fapshi
    if (gateway === 'fapshi') {
      const fapshiApiUser = Deno.env.get('FAPSHI_API_USER')
      const fapshiApiKey = Deno.env.get('FAPSHI_API_KEY')
      
      // Exemple d'appel API Fapshi (à adapter selon la doc exacte de Fapshi)
      // L'appel génère un lien de paiement
      /* 
      const response = await fetch('https://api.fapshi.com/v1/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiuser': fapshiApiUser,
          'apikey': fapshiApiKey
        },
        body: JSON.stringify({
          amount: amount,
          externalId: etablissement_id,
          redirectUrl: 'https://votredomaine.com/dashboard/index.html?payment=success'
        })
      });
      const data = await response.json();
      paymentUrl = data.link; 
      */
      
      // Simulation pour le moment
      paymentUrl = "https://fapshi.com/pay/sandbox_demo"
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
