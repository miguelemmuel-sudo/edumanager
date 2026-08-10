const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const emploiCRUD = `
// --- EMPLOIS DU TEMPS ---
async function fetchAndRenderEmploi() {
    const btnAfficher = document.getElementById('btnAfficherEmploi');
    const classeSelectFiltre = document.getElementById('emploi_classe');
    const creneauClasseSelect = document.getElementById('creneauClasseSelect');
    const creneauProfSelect = document.getElementById('creneauProfSelect');
    
    if (!classeSelectFiltre) return; // Not on the page

    // Load classes for filters if not loaded
    if (classeSelectFiltre.children.length <= 3 && !classeSelectFiltre.dataset.loaded) {
        const { data: classes } = await window.supabase.from('classes').select('id, nom');
        if (classes) {
            const html = classes.map(c => \`<option value="\${c.id}">\${_e(c.nom)}</option>\`).join('');
            classeSelectFiltre.innerHTML = html;
            if(creneauClasseSelect) creneauClasseSelect.innerHTML = '<option value="">Sélectionner...</option>' + html;
            classeSelectFiltre.dataset.loaded = 'true';
        }
    }
    
    // Load profs for modal
    if (creneauProfSelect && creneauProfSelect.children.length <= 1) {
        const { data: profs } = await window.supabase.from('enseignants').select('id, prenom, nom');
        if (profs) {
            creneauProfSelect.innerHTML = '<option value="">Sélectionner...</option>' + profs.map(p => \`<option value="\${p.id}">\${_e(p.prenom)} \${_e(p.nom)}</option>\`).join('');
        }
    }

    const currentClasseId = classeSelectFiltre.value;
    if (!currentClasseId) return;
    
    const tbody = document.getElementById('dynamicBody');
    if (!tbody) return;

    const { data: emplois, error } = await window.supabase.from('emplois_temps').select('*, enseignants(prenom, nom)').eq('classe_id', currentClasseId);
    if (error) return console.error(error);

    // Group by time slot
    const slots = {};
    emplois.forEach(e => {
        const time = e.heure_debut.substring(0,5) + ' - ' + e.heure_fin.substring(0,5);
        if(!slots[time]) slots[time] = { Lundi: null, Mardi: null, Mercredi: null, Jeudi: null, Vendredi: null };
        if(slots[time][e.jour_semaine] === null) {
            slots[time][e.jour_semaine] = e;
        }
    });

    const sortedTimes = Object.keys(slots).sort();
    
    tbody.innerHTML = '';
    
    if (sortedTimes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Aucun créneau pour cette classe</td></tr>';
        return;
    }

    sortedTimes.forEach(time => {
        const s = slots[time];
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        
        let html = \`<tr><td class="fw-bold">\${time}</td>\`;
        days.forEach(d => {
            if(s[d]) {
                const c = s[d];
                const prof = c.enseignants ? c.enseignants.prenom + ' ' + c.enseignants.nom : '';
                html += \`<td><div class="dash-card p-2 position-relative" style="background:rgba(37,99,235,.05); border-left:3px solid var(--primary)">
                    <button class="btn btn-sm text-danger position-absolute top-0 end-0 p-1" onclick="deleteCreneau('\${c.id}')"><i class="fas fa-times"></i></button>
                    <div class="fw-bold" style="font-size:0.85rem">\${_e(c.matiere)}</div>
                    <div class="text-muted" style="font-size:0.75rem">\${_e(prof)}</div>
                    <div class="text-muted" style="font-size:0.75rem">\${_e(c.salle || '-')}</div>
                </div></td>\`;
            } else {
                html += '<td></td>';
            }
        });
        html += '</tr>';
        tbody.innerHTML += html;
    });
}

function setupEmploiModal() {
    const btnAjouter = document.getElementById('btnAjouterCreneau');
    if (btnAjouter) {
        btnAjouter.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('addCreneauModal'));
            
            // Set class in modal to currently selected class in filter
            const fClasse = document.getElementById('emploi_classe');
            const mClasse = document.getElementById('creneauClasseSelect');
            if (fClasse && mClasse) mClasse.value = fClasse.value;
            
            modal.show();
        });
    }

    const btnSaveCreneau = document.getElementById('btnSaveCreneau');
    if (btnSaveCreneau) {
        btnSaveCreneau.addEventListener('click', async () => {
            const data = getFormData('addCreneauModal');
            if (!data.classe_id || !data.jour_semaine || !data.heure_debut || !data.heure_fin || !data.matiere) {
                if(window.showToast) window.showToast('Veuillez remplir les champs obligatoires.', 'warning');
                return;
            }
            
            btnSaveCreneau.disabled = true; btnSaveCreneau.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const { error } = await window.supabase.from('emplois_temps').insert([data]);
            btnSaveCreneau.disabled = false; btnSaveCreneau.innerHTML = 'Ajouter';
            
            if (error) {
                if(window.showToast) window.showToast(error.message, 'danger');
            } else {
                if(window.showToast) window.showToast('Créneau ajouté', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addCreneauModal'));
                if(modal) modal.hide();
                clearFormData('addCreneauModal');
                fetchAndRenderEmploi();
            }
        });
    }

    const btnAfficher = document.getElementById('btnAfficherEmploi');
    if (btnAfficher) {
        btnAfficher.addEventListener('click', () => {
            fetchAndRenderEmploi();
            if(window.showToast) window.showToast('Emploi du temps actualisé', 'info');
        });
    }
}

window.deleteCreneau = async function(id) {
    if(!confirm('Supprimer ce créneau ?')) return;
    await window.supabase.from('emplois_temps').delete().eq('id', id);
    if(window.showToast) window.showToast('Créneau supprimé', 'success');
    fetchAndRenderEmploi();
}
`;

const startIdx = appJs.indexOf('// --- NOTES ---'); // We'll insert it right before Notes

if (startIdx !== -1) {
    appJs = appJs.substring(0, startIdx) + emploiCRUD + '\n\n' + appJs.substring(startIdx);
    
    appJs = appJs.replace('// --- DASHBOARD (STATS GLOBALES) ---', 'fetchAndRenderEmploi();\n    setupEmploiModal();\n\n    // --- DASHBOARD (STATS GLOBALES) ---');
    
    fs.writeFileSync('js/app.js', appJs);
    console.log('Emplois du Temps CRUD logic injected');
} else {
    console.log('Markers not found');
}
