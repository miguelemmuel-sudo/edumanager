const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = "https://ouraqvirmashzzstkqfx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cmFxdmlybWFzaHp6c3RrcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODc5MzEsImV4cCI6MjA5OTk2MzkzMX0.Yu54EsBv23n6UobwOusfEtgMP9EQ18FpQrLfiERYamo";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: years } = await supabase.from("annees_academiques").select("*");
    const { data: classes } = await supabase.from("classes").select("*");
    const { data: inscr } = await supabase.from("inscriptions_annuelles").select("eleve_id, classe_id, annee_academique_id, eleves!inner(id, prenom, nom)").limit(50);
    
    console.log("Years:", JSON.stringify(years, null, 2));
    console.log("Classes:", JSON.stringify(classes.map(c => ({id: c.id, nom: c.nom, annee: c.annee_academique_id})), null, 2));
    console.log("Inscriptions:", JSON.stringify(inscr, null, 2));
}
test();
