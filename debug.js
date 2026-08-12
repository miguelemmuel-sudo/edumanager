const URL = 'https://ouraqvirmashzzstkqfx.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cmFxdmlybWFzaHp6c3RrcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODc5MzEsImV4cCI6MjA5OTk2MzkzMX0.Yu54EsBv23n6UobwOusfEtgMP9EQ18FpQrLfiERYamo';

async function fetchSupabase(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=*`, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });
  return res.json();
}

async function debug() {
  const classes = await fetchSupabase('classes');
  console.log('Classes:', classes);
  
  const eleves = await fetchSupabase('eleves');
  console.log('Eleves:', eleves);
  
  const frais = await fetchSupabase('frais_scolaires');
  console.log('Frais:', frais);
}

debug();
