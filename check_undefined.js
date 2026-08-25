const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = "https://ouraqvirmashzzstkqfx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cmFxdmlybWFzaHp6c3RrcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODc5MzEsImV4cCI6MjA5OTk2MzkzMX0.Yu54EsBv23n6UobwOusfEtgMP9EQ18FpQrLfiERYamo";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    let yearId = undefined;
    try {
        const { data, error } = await supabase.from("classes").select("id, nom").eq("annee_academique_id", yearId);
        console.log("Data:", data);
        console.log("Error:", error);
    } catch(e) {
        console.log("Exception:", e.message);
    }
}
test();
