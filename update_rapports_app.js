const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const rapportsCRUD = `
// --- RAPPORTS ---
async function fetchAndRenderRapports() {
    // Only run if on rapports page (check a specific element)
    const isRapportsPage = document.querySelector('.dash-card-title') && document.querySelector('.dash-card-title').textContent.includes('Évolution des inscriptions');
    if (!isRapportsPage) return;
    
    // 1. Fetch Eleves
    const { data: eleves } = await window.supabase.from('eleves').select('id, sexe, created_at, statut');
    // 2. Fetch Paiements
    const { data: paiements } = await window.supabase.from('paiements').select('montant');
    // 3. Fetch Notes
    const { data: notes } = await window.supabase.from('notes').select('valeur');
    
    const countEleves = eleves ? eleves.length : 0;
    
    let revenus = 0;
    if (paiements) {
        paiements.forEach(p => revenus += parseFloat(p.montant || 0));
    }
    
    let totalNotes = 0;
    if (notes && notes.length > 0) {
        notes.forEach(n => totalNotes += parseFloat(n.valeur || 0));
    }
    const moyenne = notes && notes.length > 0 ? (totalNotes / notes.length).toFixed(1) : '0';
    
    // Update KPI values in the DOM
    const kpiValues = document.querySelectorAll('.stat-card .sc-value');
    if (kpiValues.length >= 3) {
        kpiValues[0].textContent = countEleves;
        kpiValues[1].textContent = revenus.toLocaleString() + ' ' + (window.EduSettings?.currency || 'FCFA');
        kpiValues[2].textContent = moyenne;
        kpiValues[3].textContent = '95%'; // Mocked Assiduité
    }
    
    // Update demographics chart labels if present
    const demoLegend = document.querySelector('.dash-card-body .d-flex.flex-wrap.justify-content-center.gap-4');
    if (demoLegend && eleves) {
        let garcons = eleves.filter(e => e.sexe && e.sexe.toLowerCase() === 'masculin').length;
        let filles = eleves.filter(e => e.sexe && e.sexe.toLowerCase() === 'féminin').length;
        if(countEleves > 0) {
            demoLegend.innerHTML = \`
                <div class="d-flex align-items-center gap-2">
                    <div style="width:12px;height:12px;border-radius:50%;background:var(--primary)"></div>
                    <span class="text-muted" style="font-size:0.85rem">Garçons (\${garcons})</span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <div style="width:12px;height:12px;border-radius:50%;background:var(--danger)"></div>
                    <span class="text-muted" style="font-size:0.85rem">Filles (\${filles})</span>
                </div>
            \`;
        }
    }
}
`;

const startIdx = appJs.indexOf('// --- DASHBOARD (STATS GLOBALES) ---');

if (startIdx !== -1) {
    appJs = appJs.substring(0, startIdx) + rapportsCRUD + '\n\n' + appJs.substring(startIdx);
    
    appJs = appJs.replace('// --- DASHBOARD (STATS GLOBALES) ---', 'fetchAndRenderRapports();\n\n    // --- DASHBOARD (STATS GLOBALES) ---');
    
    fs.writeFileSync('js/app.js', appJs);
    console.log('Rapports CRUD logic injected');
} else {
    console.log('Markers not found');
}
