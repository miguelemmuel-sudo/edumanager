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

const startIdx = appJs.indexOf('// --- NOTES ---');
const endIdx = appJs.indexOf('// --- DASHBOARD (STATS GLOBALES) ---');

if (startIdx !== -1 && endIdx !== -1) {
    appJs = appJs.substring(0, startIdx) + notesCRUD + '\n\n' + appJs.substring(endIdx);
    
    // Uncomment setupNotesModal inside DOMContentLoaded
    appJs = appJs.replace('// setupNotesModal();', 'setupNotesModal();');

    fs.writeFileSync('js/app.js', appJs);
    console.log('Notes CRUD logic injected');
} else {
    console.log('Markers not found');
}
