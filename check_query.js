const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = "https://ouraqvirmashzzstkqfx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cmFxdmlybWFzaHp6c3RrcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODc5MzEsImV4cCI6MjA5OTk2MzkzMX0.Yu54EsBv23n6UobwOusfEtgMP9EQ18FpQrLfiERYamo";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: inscr, error } = await supabase.from("inscriptions_annuelles").select("eleve_id, classe_id, annee_academique_id, eleves(id, prenom, nom, matricule)").limit(10);
    console.log(JSON.stringify(inscr, null, 2));
    if (error) console.error(error);
}
test();
