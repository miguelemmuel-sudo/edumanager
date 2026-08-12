const URL = 'https://ouraqvirmashzzstkqfx.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cmFxdmlybWFzaHp6c3RrcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODc5MzEsImV4cCI6MjA5OTk2MzkzMX0.Yu54EsBv23n6UobwOusfEtgMP9EQ18FpQrLfiERYamo';

async function fetchSupabase(table, select) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });
  const text = await res.text();
  console.log(`Response for ${table}:`, text);
}

async function debug() {
  await fetchSupabase('paiements', '*, eleves(nom, prenom, matricule, classes(nom)), auth_users:caissier_id(email)');
}

debug();
