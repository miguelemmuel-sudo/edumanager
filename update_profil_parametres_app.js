const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const profileParamCRUD = `
// --- PROFIL ET PARAMETRES ---
async function fetchAndRenderProfil() {
    const formProfil = document.getElementById('formProfil');
    if (formProfil) {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user) {
            if (formProfil.elements['prenom']) formProfil.elements['prenom'].value = user.user_metadata?.prenom || '';
            if (formProfil.elements['nom']) formProfil.elements['nom'].value = user.user_metadata?.nom || '';
            if (formProfil.elements['tel']) formProfil.elements['tel'].value = user.user_metadata?.tel || '';
            
            const emailInp = document.getElementById('profilEmail');
            if (emailInp) emailInp.value = user.email || '';
            
            const depuis = document.getElementById('profilDepuis');
            if (depuis) depuis.value = new Date(user.created_at).toLocaleDateString('fr-FR');
        }
    }
}

async function fetchAndRenderParametres() {
    const etabNom = document.getElementById('etab_nom');
    if (!etabNom) return; // not on parameters page
    
    // We get the current establishment
    const { data: etab } = await window.supabase.from('etablissements').select('*').limit(1).single();
    if (etab) {
        if(document.getElementById('etab_nom')) document.getElementById('etab_nom').value = etab.nom || '';
        if(document.getElementById('etab_type')) document.getElementById('etab_type').value = etab.type || '';
        if(document.getElementById('etab_pays')) document.getElementById('etab_pays').value = etab.pays || '';
        if(document.getElementById('etab_currency')) document.getElementById('etab_currency').value = etab.devise || 'FCFA';
        if(document.getElementById('etab_ville')) document.getElementById('etab_ville').value = etab.ville || '';
        if(document.getElementById('etab_tel')) document.getElementById('etab_tel').value = etab.tel || '';
    }
}

function setupProfilParametres() {
    // PROFIL SAVE
    const btnSaveProfil = document.getElementById('btnSaveProfil');
    if (btnSaveProfil) {
        btnSaveProfil.addEventListener('click', async (e) => {
            e.preventDefault();
            const form = document.getElementById('formProfil');
            const prenom = form.elements['prenom'].value;
            const nom = form.elements['nom'].value;
            const tel = form.elements['tel'].value;
            
            btnSaveProfil.disabled = true; btnSaveProfil.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const { error } = await window.supabase.auth.updateUser({
                data: { prenom, nom, tel }
            });
            btnSaveProfil.disabled = false; btnSaveProfil.innerHTML = '<i class="fas fa-save me-2"></i>Enregistrer les modifications';
            
            if (error) {
                if(window.showToast) window.showToast(error.message, 'danger');
            } else {
                if(window.showToast) window.showToast('Profil mis à jour', 'success');
            }
        });
    }
    
    // PARAMETRES SAVE
    const btnsSaveParam = document.querySelectorAll('.settings-tab .btn-save');
    btnsSaveParam.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const etabNom = document.getElementById('etab_nom');
            if(etabNom) {
                const nom = etabNom.value;
                const type = document.getElementById('etab_type').value;
                const pays = document.getElementById('etab_pays').value;
                const devise = document.getElementById('etab_currency') ? document.getElementById('etab_currency').value : 'FCFA';
                const ville = document.getElementById('etab_ville').value;
                const tel = document.getElementById('etab_tel').value;
                
                btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                // Get etab ID
                const { data: etab } = await window.supabase.from('etablissements').select('id').limit(1).single();
                if (etab) {
                    const { error } = await window.supabase.from('etablissements').update({
                        nom, type, pays, ville, tel, devise
                    }).eq('id', etab.id);
                    
                    if (error) {
                        if(window.showToast) window.showToast(error.message, 'danger');
                    } else {
                        if(window.showToast) window.showToast('Paramètres mis à jour', 'success');
                    }
                }
                
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-2"></i>Enregistrer';
            }
        });
    });
}
`;

const startIdx = appJs.indexOf('// --- DASHBOARD (STATS GLOBALES) ---');

if (startIdx !== -1) {
    appJs = appJs.substring(0, startIdx) + profileParamCRUD + '\n\n' + appJs.substring(startIdx);
    
    appJs = appJs.replace('// --- DASHBOARD (STATS GLOBALES) ---', 'fetchAndRenderProfil();\n    fetchAndRenderParametres();\n    setupProfilParametres();\n\n    // --- DASHBOARD (STATS GLOBALES) ---');
    
    fs.writeFileSync('js/app.js', appJs);
    console.log('Profil et Parametres CRUD logic injected');
} else {
    console.log('Markers not found');
}
