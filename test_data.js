const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://ouraqvirmashzzstkqfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cmFxdmlybWFzaHp6c3RrcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODc5MzEsImV4cCI6MjA5OTk2MzkzMX0.Yu54EsBv23n6UobwOusfEtgMP9EQ18FpQrLfiERYamo';

function fetchSupabase(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'ouraqvirmashzzstkqfx.supabase.co',
            path: '/rest/v1/' + path,
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log("Fetching etablissements...");
        const etabs = await fetchSupabase('etablissements?select=*');
        console.log(etabs);
        
        console.log("\nFetching eleves...");
        const eleves = await fetchSupabase('eleves?select=*');
        console.log(eleves);
    } catch (e) {
        console.error(e);
    }
}

run();
