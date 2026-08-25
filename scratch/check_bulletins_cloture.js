require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase
        .from('bulletins')
        .select('id, eleve_id, moyenne_generale, periodes_evaluation!inner(annee_academique_id, type)')
        .eq('statut', 'Publié')
        .limit(5);
    console.log("Data:", data);
    console.log("Error:", error);
}

test();
