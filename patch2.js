const fs = require('fs');

// 1. Clean HTML
const htmlPath = 'dashboard/parametres.html';
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace('value="Collège Saint-Joseph"', 'value=""');
html = html.replace('value="contact@saint-joseph.ci"', 'value=""');
html = html.replace('value="+225 27 00 00 00"', 'value=""');
html = html.replace('value="Côte d\\'Ivoire"', 'value=""');
html = html.replace('value="Abidjan"', 'value=""');
html = html.replace('value="Cocody, Rue des Jardins"', 'value=""');
html = html.replace('value="https://saint-joseph.ci"', 'value=""');
html = html.replace('value="2025-2026"', 'value=""');

fs.writeFileSync(htmlPath, html);
console.log('HTML fixed');

// 2. Inject JS logic
const jsPath = 'js/app.js';
let appjs = fs.readFileSync(jsPath, 'utf8');

if (!appjs.includes('initParametres')) {
    const trigger = \
    // ----- PARAMETRES -----
    else if (path.includes('parametres.html')) {
        await initParametres();
    }
\;
    appjs = appjs.replace('// ----- DASHBOARD (INDEX) -----', trigger + '\\n    // ----- DASHBOARD (INDEX) -----');

    const func = \
// --- PARAMETRES ---
async function initParametres() {
    let etabId = null;
    try {
        const sessionStr = localStorage.getItem('edu_session');
        if (sessionStr) {
            etabId = JSON.parse(sessionStr).etablissement_id;
        }
    } catch(e) {}
    
    if (!etabId) return;

    // Load Etablissement Data
    const { data: etabData } = await window.supabase.from('etablissements').select('*').eq('id', etabId).single();
    if (etabData) {
        if(document.getElementById('etab_nom')) document.getElementById('etab_nom').value = etabData.nom || '';
        if(document.getElementById('etab_email')) document.getElementById('etab_email').value = etabData.email || '';
        if(document.getElementById('etab_tel')) document.getElementById('etab_tel').value = etabData.telephone || '';
        if(document.getElementById('etab_pays')) document.getElementById('etab_pays').value = etabData.pays || '';
        if(document.getElementById('etab_ville')) document.getElementById('etab_ville').value = etabData.ville || '';
        if(document.getElementById('etab_adresse')) document.getElementById('etab_adresse').value = etabData.adresse || '';
        if(document.getElementById('etab_site')) document.getElementById('etab_site').value = etabData.site_web || '';
        
        if (etabData.type && document.getElementById('etab_type')) document.getElementById('etab_type').value = etabData.type;
        if (etabData.systeme_educatif && document.getElementById('etab_systeme')) document.getElementById('etab_systeme').value = etabData.systeme_educatif;
    }

    // Bind save button
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.onclick = async function() {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';
            
            const updates = {
                nom: document.getElementById('etab_nom').value.trim(),
                email: document.getElementById('etab_email').value.trim(),
                telephone: document.getElementById('etab_tel').value.trim(),
                pays: document.getElementById('etab_pays').value.trim(),
                ville: document.getElementById('etab_ville').value.trim(),
                adresse: document.getElementById('etab_adresse').value.trim(),
                site_web: document.getElementById('etab_site').value.trim(),
                type: document.getElementById('etab_type').value,
                systeme_educatif: document.getElementById('etab_systeme').value
            };
            
            const { error } = await window.supabase.from('etablissements').update(updates).eq('id', etabId);
            
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Enregistrer';
            
            if (error) {
                if(window.showToast) window.showToast(error.message, 'danger');
            } else {
                if(window.showToast) window.showToast('Paramètres enregistrés avec succès', 'success');
                if (window.EduSettings) {
                    window.EduSettings.nom = updates.nom;
                    window.EduSettings.type = updates.type;
                }
            }
        };
    }
}
\;
    appjs += func;
    fs.writeFileSync(jsPath, appjs);
    console.log('JS injected');
} else {
    console.log('JS already patched');
}
