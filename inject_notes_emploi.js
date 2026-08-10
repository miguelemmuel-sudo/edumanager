const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const notesCRUD = `
// --- NOTES ---
let currentNoteConfig = {};

async function fetchAndRenderNotes() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('notesBody');
    if (!tbody) return;
    
    // Charger les classes pour le select de configuration
    const noteClasseSelect = document.getElementById('noteClasseSelect');
    if (noteClasseSelect && noteClasseSelect.children.length <= 1) {
        const { data: classes } = await window.supabase.from('classes').select('id, nom');
        if (classes) {
            noteClasseSelect.innerHTML = '<option value="">Sélectionner une classe</option>' + classes.map(c => \`<option value="\${c.id}">\${_e(c.nom)}</option>\`).join('');
        }
    }

    const { data: notes, error } = await window.supabase.from('notes').select('*, eleves(nom, prenom)');
    if (error) return console.error(error);

    if (notes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Aucune donnée disponible</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    notes.forEach(n => {
        const el = n.eleves || {};
        tbody.innerHTML += \`
            <tr>
                <td><div class="fw-semibold">\${_e(el.prenom)} \${_e(el.nom)}</div></td>
                <td>\${_e(n.matiere)}</td>
                <td>\${_e(n.type_evaluation)}</td>
                <td><strong>\${n.valeur} / 20</strong></td>
                <td>Coef: \${n.coefficient}</td>
                <td>\${new Date(n.date_saisie).toLocaleDateString('fr-FR')}</td>
                <td>
                    <button class="btn btn-sm btn-icon text-muted"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-icon text-danger" onclick="deleteNote('\${n.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        \`;
    });
}

function setupNotesModal() {
    const btnContinue = document.getElementById('btnContinueSaisie');
    if (!btnContinue) return;
    
    btnContinue.addEventListener('click', async () => {
        const config = getFormData('addNoteModal');
        if (!config.classe_id || !config.matiere || !config.type_evaluation) {
            if (window.showToast) window.showToast('Veuillez remplir tous les champs obligatoires', 'warning');
            return;
        }
        
        currentNoteConfig = config;
        
        btnContinue.disabled = true; btnContinue.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Fetch eleves for the class
        const { data: eleves, error } = await window.supabase.from('eleves').select('id, prenom, nom').eq('classe_id', config.classe_id);
        
        btnContinue.disabled = false; btnContinue.innerHTML = 'Continuer vers la saisie';
        
        if (error) {
            if (window.showToast) window.showToast(error.message, 'danger');
            return;
        }
        
        if (!eleves || eleves.length === 0) {
            if (window.showToast) window.showToast('Aucun élève trouvé dans cette classe', 'warning');
            return;
        }
        
        // Build grille
        const grilleBody = document.getElementById('grilleSaisieBody');
        grilleBody.innerHTML = '';
        eleves.forEach(e => {
            grilleBody.innerHTML += \`
                <tr data-eleve-id="\${e.id}">
                    <td>\${_e(e.prenom)} \${_e(e.nom)}</td>
                    <td><input type="number" class="form-control note-val" min="0" max="\${config.note_sur || 20}" placeholder="/ \${config.note_sur || 20}"></td>
                    <td><input type="text" class="form-control note-app" placeholder="Appréciation..."></td>
                    <td><button class="btn btn-sm btn-icon text-danger" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
                </tr>
            \`;
        });
        
        bootstrap.Modal.getInstance(document.getElementById('addNoteModal')).hide();
        new bootstrap.Modal(document.getElementById('saisieGrilleModal')).show();
    });
    
    const btnSaveGrille = document.getElementById('btnSaveGrille');
    if (btnSaveGrille) {
        btnSaveGrille.addEventListener('click', async () => {
            const rows = document.querySelectorAll('#grilleSaisieBody tr');
            const notesToInsert = [];
            
            rows.forEach(row => {
                const eleve_id = row.getAttribute('data-eleve-id');
                const val = row.querySelector('.note-val').value;
                if (val !== '') {
                    notesToInsert.push({
                        eleve_id: eleve_id,
                        matiere: currentNoteConfig.matiere,
                        type_evaluation: currentNoteConfig.type_evaluation,
                        valeur: parseFloat(val),
                        coefficient: currentNoteConfig.coefficient ? parseFloat(currentNoteConfig.coefficient) : 1,
                        date_saisie: currentNoteConfig.date_saisie || new Date().toISOString()
                    });
                }
            });
            
            if (notesToInsert.length === 0) {
                if (window.showToast) window.showToast('Aucune note saisie', 'warning');
                return;
            }
            
            btnSaveGrille.disabled = true; btnSaveGrille.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const { error } = await window.supabase.from('notes').insert(notesToInsert);
            btnSaveGrille.disabled = false; btnSaveGrille.innerHTML = '<i class="fas fa-save me-1"></i>Enregistrer les notes';
            
            if (error) {
                if (window.showToast) window.showToast(error.message, 'danger');
            } else {
                if (window.showToast) window.showToast('Notes enregistrées avec succès', 'success');
                bootstrap.Modal.getInstance(document.getElementById('saisieGrilleModal')).hide();
                fetchAndRenderNotes();
            }
        });
    }
}

window.deleteNote = async function(id) {
    if(!confirm('Supprimer cette note ?')) return;
    await window.supabase.from('notes').delete().eq('id', id);
    if(window.showToast) window.showToast('Note supprimée', 'success');
    fetchAndRenderNotes();
}
`;

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
        if(slots[time][e.jour_semaine] === null || slots[time][e.jour_semaine] === undefined) {
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

const insertText = notesCRUD + '\n\n' + emploiCRUD + '\n\n';
appJs = appJs.replace('// --- PAIEMENTS ---', insertText + '// --- PAIEMENTS ---');

appJs = appJs.replace('// --- DASHBOARD (STATS GLOBALES) ---', 'fetchAndRenderNotes();\n    setupNotesModal();\n    fetchAndRenderEmploi();\n    setupEmploiModal();\n\n    // --- DASHBOARD (STATS GLOBALES) ---');

fs.writeFileSync('js/app.js', appJs);
console.log('Notes and Emploi du Temps injected');
