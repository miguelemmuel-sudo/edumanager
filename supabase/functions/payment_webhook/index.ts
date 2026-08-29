import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    // Identifiant de l'établissement passé lors du checkout
    const etablissement_id = payload.externalId || payload.reference

    if (!etablissement_id) {
      return new Response("Missing externalId or reference", { status: 400 })
    }

    // Connexion à Supabase avec le rôle Service Role pour bypasser la RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérification de la signature du webhook si applicable (Chariow / Notch Pay)
    // Notch Pay : vérifier le header x-notch-signature avec NOTCH_PAY_HASH_KEY via HMAC SHA256

    // Mise à jour de l'abonnement
    const { error } = await supabaseClient
      .from('etablissements')
      .update({ statut_abonnement: 'actif' })
      .eq('id', etablissement_id)

    if (error) throw error

    return new Response("Webhook traité avec succès", { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
