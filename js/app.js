/* =======================================================================
   EduManager – Application Controller (app.js)
   Gère l'intégration dynamique de Supabase pour tous les modules
   ======================================================================= */
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) {
        console.error('Supabase non chargé');
        return;
    }

    const path = window.location.pathname;

    // ----- ÉLÈVES -----
    if (path.includes('eleves.html') && !path.includes('eleves_test')) {
        await fetchAndRenderEleves();
        setupElevesModal();
        setupRealtime('eleves', fetchAndRenderEleves);
    }
    // ----- ENSEIGNANTS -----
    else if (path.includes('enseignants.html')) {
        await fetchAndRenderEnseignants();
        setupEnseignantsModal();
        setupRealtime('enseignants', fetchAndRenderEnseignants);
    }
    // ----- CLASSES -----
    else if (path.includes('classes.html')) {
        await fetchAndRenderClasses();
        setupClassesModal();
        setupRealtime('classes', fetchAndRenderClasses);
    }
    // ----- PAIEMENTS -----
    else if (path.includes('paiements.html')) {
        await fetchAndRenderPaiements();
        setupPaiementsModal();
        setupRealtime('paiements', fetchAndRenderPaiements);
    }
    // ----- NOTES -----
    else if (path.includes('notes.html')) {
        await fetchAndRenderNotes();
        setupNotesModal();
        setupRealtime('notes', fetchAndRenderNotes);
    }
    // ----- MESSAGES -----
    else if (path.includes('messages.html')) {
        await fetchAndRenderMessages();
        setupRealtime('messages', fetchAndRenderMessages);
    }
    // ----- NOTIFICATIONS -----
    else if (path.includes('utilisateurs.html')) {
        await fetchAndRenderUtilisateurs();
        setupUtilisateursModal();
    }
    else if (path.includes('notifications.html')) {
        await fetchAndRenderNotifications();
        setupRealtime('notifications', fetchAndRenderNotifications);
    }
    // ----- DASHBOARD (INDEX) -----
    else if (path.includes('dashboard/index.html') || path.endsWith('dashboard/')) {
        await initDashboardStats();
    }
});

// --- HELPER: Setup Realtime ---
function setupRealtime(table, callback) {
    window.supabase.channel('public:' + table)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
            console.log('Changement détécté sur', table, payload);
            callback();
        })
        .subscribe();
}


// --- GENERIC HELPERS ---
function getFormData(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return {};
    const inputs = modal.querySelectorAll('input[name], select[name], textarea[name]');
    const data = {};
    inputs.forEach(i => {
        if (i.type === 'checkbox' || i.type === 'radio') {
            if (i.checked) data[i.name] = i.value;
        } else {
            let val = i.value.trim();
            if (val !== '') data[i.name] = val;
        }
    });
    return data;
}
function clearFormData(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('input[name], select[name], textarea[name]').forEach(i => {
        if (i.type === 'checkbox' || i.type === 'radio') i.checked = false;
        else if (i.tagName === 'SELECT') i.selectedIndex = 0;
        else i.value = '';
    });
}

// --- ÉLÈVES ---
async function fetchAndRenderEleves() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('elevesBody');
    if (!tbody) return;

    // Load classes for the dropdown
    const classeSelect = document.getElementById('classeSelect');
    if (classeSelect && classeSelect.children.length <= 1) {
        const { data: classes } = await window.supabase.from('classes').select('id, nom');
        if (classes) {
            classeSelect.innerHTML = '<option value="">Sélectionner une classe</option>' + classes.map(c => `<option value="${c.id}">${_e(c.nom)}</option>`).join('');
        }
    }

    const { data: eleves, error } = await window.supabase.from('eleves').select('*, classes(nom)');
    if (error) return console.error(error);

    document.querySelectorAll('.sc-value').forEach((el, i) => { if(i===0) el.textContent = eleves.length; });
    const info = document.getElementById('elevesPaginationInfo');
    if (info) info.textContent = `Affichage de 1 à ${eleves.length} sur ${eleves.length} élèves`;

    if (eleves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Aucun élève trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    eleves.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input class="form-check-input row-check" type="checkbox"></td>
            <td><div class="d-flex align-items-center"><div class="table-av me-2" style="background:#2563EB">${e.prenom.charAt(0)}</div><span class="fw-semibold">${_e(e.prenom)} ${_e(e.nom)}</span></div></td>
            <td>${_e(e.matricule || '-')}</td>
            <td><span class="status-badge primary">${_e(e.classes ? e.classes.nom : 'Non assigné')}</span></td>
            <td>${e.date_naissance ? new Date(e.date_naissance).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${_e(e.parent_nom || '-')} <br><small class="text-muted">${_e(e.parent_tel || '-')}</small></td>
            <td><span class="status-badge ${e.statut_paiement === 'À jour' ? 'success' : 'warning'}">${_e(e.statut_paiement || 'Inconnu')}</span></td>
            <td>
                <button class="btn btn-sm btn-icon text-muted"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-icon text-danger" onclick="deleteEleve('${e.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
function setupElevesModal() {
    const btn = document.querySelector('#addEleveModal .btn-primary');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const data = getFormData('addEleveModal');
        if (!data.prenom || !data.nom || !data.classe_id) {
            if(window.showToast) window.showToast('Prénom, nom et classe requis', 'warning');
            return;
        }
        
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('eleves').insert([data]);
        btn.disabled = false; btn.innerHTML = 'Enregistrer';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Élève ajouté', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEleveModal'));
            if(modal) modal.hide();
            clearFormData('addEleveModal');
            fetchAndRenderEleves();
        }
    });
}
window.deleteEleve = async function(id) {
    if(!confirm('Supprimer cet élève ?')) return;
    await window.supabase.from('eleves').delete().eq('id', id);
    if(window.showToast) window.showToast('Élève supprimé', 'success');
    fetchAndRenderEleves();
}

// --- ENSEIGNANTS ---
async function fetchAndRenderEnseignants() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('enseignantsBody');
    const gridBody = document.getElementById('ensGrid');
    if (!tbody && !gridBody) return;

    const { data: enseignants, error } = await window.supabase.from('enseignants').select('*');
    if (error) return console.error(error);

    document.querySelectorAll('.sc-value').forEach((el, i) => { if(i===0) el.textContent = enseignants.length; });

    if (enseignants.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Aucun enseignant</td></tr>';
        if (gridBody) gridBody.innerHTML = '<div class="col-12 text-center py-4 text-muted">Aucun enseignant</div>';
        return;
    }

    if (tbody) tbody.innerHTML = '';
    if (gridBody) gridBody.innerHTML = '';
    
    enseignants.forEach(e => {
        const initiale = e.prenom ? e.prenom.charAt(0).toUpperCase() : 'E';
        const nomComplet = `${_e(e.prenom)} ${_e(e.nom)}`;
        
        if (tbody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="d-flex align-items-center"><div class="table-av me-2" style="background:#10B981">${initiale}</div><span class="fw-semibold">${nomComplet}</span></div></td>
                <td>${_e(e.matiere || '-')}</td>
                <td><span class="status-badge primary">0</span></td>
                <td>${_e(e.tel || '-')}</td>
                <td>${_e(e.email || '-')}</td>
                <td><span class="status-badge success">${_e(e.statut || 'Actif')}</span></td>
                <td>
                    <button class="btn btn-sm btn-icon text-muted"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-icon text-danger" onclick="deleteEnseignant('${e.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        }
        
        if (gridBody) {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 ens-card';
            card.innerHTML = `
            <div class="dash-card p-4 h-100">
              <div class="d-flex align-items-start justify-content-between mb-3">
                <div class="d-flex align-items-center gap-3">
                  <div class="table-av" style="width:48px;height:48px;font-size:1.2rem;background:#2563EB">${initiale}</div>
                  <div>
                    <div class="fw-bold" style="font-size:.95rem">${nomComplet}</div>
                    <div class="text-muted" style="font-size:.8rem">${_e(e.matiere || '-')}</div>
                  </div>
                </div>
                <span class="status-badge success">${_e(e.statut || 'Actif')}</span>
              </div>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <div style="font-size:.72rem;color:var(--muted)">Email</div>
                  <div style="font-size:.78rem">${_e(e.email || '-')}</div>
                </div>
                <div class="col-6">
                  <div style="font-size:.72rem;color:var(--muted)">Tél.</div>
                  <div style="font-size:.78rem">${_e(e.tel || '-')}</div>
                </div>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm rounded-pill flex-1" style="background:rgba(245,158,11,.1);color:var(--warning);font-size:.8rem"><i class="fas fa-edit me-1"></i>Modifier</button>
                <button class="btn btn-sm rounded-pill flex-1" style="background:rgba(239,68,68,.1);color:var(--danger);font-size:.8rem" onclick="deleteEnseignant('${e.id}')"><i class="fas fa-trash me-1"></i>Supprimer</button>
              </div>
            </div>
            `;
            gridBody.appendChild(card);
        }
    });
}
function setupEnseignantsModal() {
    const btn = document.querySelector('#addEnsModal .btn-primary');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const data = getFormData('addEnsModal');
        if (!data.prenom || !data.nom || !data.email) {
            if(window.showToast) window.showToast('Prénom, nom et email requis', 'warning');
            return;
        }
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('enseignants').insert([data]);
        btn.disabled = false; btn.innerHTML = 'Enregistrer';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Enseignant ajouté', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEnsModal'));
            if(modal) modal.hide();
            clearFormData('addEnsModal');
            fetchAndRenderEnseignants();
        }
    });
}
window.deleteEnseignant = async function(id) {
    if(!confirm('Supprimer cet enseignant ?')) return;
    await window.supabase.from('enseignants').delete().eq('id', id);
    if(window.showToast) window.showToast('Enseignant supprimé', 'success');
    fetchAndRenderEnseignants();
}

// --- CLASSES ---
async function fetchAndRenderClasses() {
    const container = document.getElementById('classesContainer');
    if (!container) return;

    // Load enseignants for dropdown
    const profSelect = document.getElementById('profSelect');
    if (profSelect && profSelect.children.length <= 1) {
        const { data: profs } = await window.supabase.from('enseignants').select('id, prenom, nom');
        if (profs) {
            profSelect.innerHTML = '<option value="">Sélectionner un prof</option>' + profs.map(p => `<option value="${p.id}">${_e(p.prenom)} ${_e(p.nom)}</option>`).join('');
        }
    }

    const { data: classes, error } = await window.supabase.from('classes').select('*, enseignants(nom, prenom), eleves(count)');
    if (error) return console.error(error);

    document.querySelectorAll('.sc-value').forEach((el, i) => { if(i===0) el.textContent = classes.length; });

    if (classes.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted">Aucune classe disponible</div>';
        return;
    }

    // Group by niveau
    const niveaux = {};
    classes.forEach(c => {
        const niv = c.niveau || 'Autre';
        if (!niveaux[niv]) niveaux[niv] = [];
        niveaux[niv].push(c);
    });

    const niveauColors = { 'Terminale':'#1E293B', '1ère':'#EF4444', '2nde':'#8B5CF6', '3ème':'#10B981', '4ème':'#F59E0B', '5ème':'#06B6D4', '6ème':'#2563EB', 'Autre': '#64748b' };

    container.innerHTML = '';
    for (const [niv, cls] of Object.entries(niveaux)) {
        const color = niveauColors[niv] || niveauColors['Autre'];
        container.innerHTML += `
            <h6 class="fw-bold mb-3 text-muted text-uppercase" style="font-size:.75rem;letter-spacing:.5px;margin-top:2rem">${_e(niv)}</h6>
            <div class="row g-3 mb-4">
                ${cls.map(c => {
                    const prof = c.enseignants ? `${c.enseignants.prenom} ${c.enseignants.nom}` : 'Non assigné';
                    const nbEleves = c.eleves && c.eleves[0] ? c.eleves[0].count : 0;
                    return `
                    <div class="col-md-6 col-lg-3">
                        <div class="dash-card p-4 h-100" style="border-top:3px solid ${color}">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <div class="fw-bold fs-6">${_e(c.nom)}</div>
                                <span class="status-badge primary">${nbEleves} élèves</span>
                            </div>
                            <div class="row g-2 mb-3">
                                <div class="col-12"><div class="text-muted" style="font-size:.72rem">Prof. principal</div><div style="font-size:.82rem;font-weight:600">${_e(prof)}</div></div>
                                <div class="col-12"><div class="text-muted" style="font-size:.72rem">Salle</div><div style="font-size:.82rem;font-weight:600">${_e(c.salle || '-')}</div></div>
                            </div>
                            <div class="d-flex gap-2 mt-3">
                                <a href="eleves.html" class="btn btn-sm flex-1 rounded-pill" style="background:rgba(37,99,235,.1);color:var(--primary);font-size:.78rem"><i class="fas fa-users me-1"></i>Élèves</a>
                                <button class="btn btn-sm btn-icon text-danger" onclick="deleteClasse('${c.id}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }
}
function setupClassesModal() {
    const btn = document.querySelector('#addClasseModal .btn-primary');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const data = getFormData('addClasseModal');
        if (!data.nom || !data.niveau) {
            if(window.showToast) window.showToast('Nom et niveau requis', 'warning');
            return;
        }
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('classes').insert([data]);
        btn.disabled = false; btn.innerHTML = 'Enregistrer';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Classe ajoutée', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addClasseModal'));
            if(modal) modal.hide();
            clearFormData('addClasseModal');
            fetchAndRenderClasses();
        }
    });
}
window.deleteClasse = async function(id) {
    if(!confirm('Supprimer cette classe ?')) return;
    await window.supabase.from('classes').delete().eq('id', id);
    if(window.showToast) window.showToast('Classe supprimée', 'success');
    fetchAndRenderClasses();
}


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
            noteClasseSelect.innerHTML = '<option value="">Sélectionner une classe</option>' + classes.map(c => `<option value="${c.id}">${_e(c.nom)}</option>`).join('');
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
        tbody.innerHTML += `
            <tr>
                <td><div class="fw-semibold">${_e(el.prenom)} ${_e(el.nom)}</div></td>
                <td>${_e(n.matiere)}</td>
                <td>${_e(n.type_evaluation)}</td>
                <td><strong>${n.valeur} / 20</strong></td>
                <td>Coef: ${n.coefficient}</td>
                <td>${new Date(n.date_saisie).toLocaleDateString('fr-FR')}</td>
                <td>
                    <button class="btn btn-sm btn-icon text-muted"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-icon text-danger" onclick="deleteNote('${n.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
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
            grilleBody.innerHTML += `
                <tr data-eleve-id="${e.id}">
                    <td>${_e(e.prenom)} ${_e(e.nom)}</td>
                    <td><input type="number" class="form-control note-val" min="0" max="${config.note_sur || 20}" placeholder="/ ${config.note_sur || 20}"></td>
                    <td><input type="text" class="form-control note-app" placeholder="Appréciation..."></td>
                    <td><button class="btn btn-sm btn-icon text-danger" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
                </tr>
            `;
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
            const html = classes.map(c => `<option value="${c.id}">${_e(c.nom)}</option>`).join('');
            classeSelectFiltre.innerHTML = html;
            if(creneauClasseSelect) creneauClasseSelect.innerHTML = '<option value="">Sélectionner...</option>' + html;
            classeSelectFiltre.dataset.loaded = 'true';
        }
    }
    
    // Load profs for modal
    if (creneauProfSelect && creneauProfSelect.children.length <= 1) {
        const { data: profs } = await window.supabase.from('enseignants').select('id, prenom, nom');
        if (profs) {
            creneauProfSelect.innerHTML = '<option value="">Sélectionner...</option>' + profs.map(p => `<option value="${p.id}">${_e(p.prenom)} ${_e(p.nom)}</option>`).join('');
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
        
        let html = `<tr><td class="fw-bold">${time}</td>`;
        days.forEach(d => {
            if(s[d]) {
                const c = s[d];
                const prof = c.enseignants ? c.enseignants.prenom + ' ' + c.enseignants.nom : '';
                html += `<td><div class="dash-card p-2 position-relative" style="background:rgba(37,99,235,.05); border-left:3px solid var(--primary)">
                    <button class="btn btn-sm text-danger position-absolute top-0 end-0 p-1" onclick="deleteCreneau('${c.id}')"><i class="fas fa-times"></i></button>
                    <div class="fw-bold" style="font-size:0.85rem">${_e(c.matiere)}</div>
                    <div class="text-muted" style="font-size:0.75rem">${_e(prof)}</div>
                    <div class="text-muted" style="font-size:0.75rem">${_e(c.salle || '-')}</div>
                </div></td>`;
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


// --- PAIEMENTS ---
async function fetchAndRenderPaiements() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('paiementsBody');
    if (!tbody) return;

    // Load eleves for the select
    const pEleveSelect = document.getElementById('paiementEleveSelect');
    if (pEleveSelect && pEleveSelect.children.length <= 1) {
        const { data: eleves } = await window.supabase.from('eleves').select('id, nom, prenom, matricule');
        if (eleves) {
            pEleveSelect.innerHTML = '<option value="">Sélectionner un élève...</option>' + eleves.map(e => `<option value="${e.id}">${_e(e.matricule || '-')} - ${_e(e.prenom)} ${_e(e.nom)}</option>`).join('');
        }
    }

    const { data: paiements, error } = await window.supabase.from('paiements').select('*, eleves(nom, prenom, matricule)');
    if (error) return console.error(error);

    let totalCollecte = 0;
    let nbSoldes = 0;
    let nbPartiels = 0;
    let nbImpayes = 0;
    
    paiements.forEach(p => {
        const mt = parseFloat(p.montant) || 0;
        totalCollecte += mt;
        const st = (p.statut || '').toLowerCase();
        if (st.includes('payé') && !st.includes('impayé') && !st.includes('soldé')) nbSoldes++;
        else if (st.includes('soldé')) nbSoldes++;
        else if (st.includes('partiel')) nbPartiels++;
        else if (st.includes('impayé')) nbImpayes++;
    });

    const totalEleves = nbSoldes + nbPartiels + nbImpayes;
    const pSoldes = totalEleves ? Math.round((nbSoldes/totalEleves)*100) : 0;
    const pPartiels = totalEleves ? Math.round((nbPartiels/totalEleves)*100) : 0;
    const pImpayes = totalEleves ? 100 - pSoldes - pPartiels : 0;

    // Update Top KPIs
    const scValues = document.querySelectorAll('.sc-value');
    if(scValues.length >= 4) {
        scValues[0].textContent = totalCollecte.toLocaleString() + ' FCFA';
        scValues[1].textContent = nbSoldes;
        scValues[2].textContent = nbPartiels;
        scValues[3].textContent = nbImpayes;
    }

    // Update Detailed Stats if they exist
    const elSCnt = document.getElementById('payStatsSoldesCount');
    if(elSCnt) {
        elSCnt.textContent = nbSoldes + ' élèves';
        document.getElementById('payStatsSoldesVal').textContent = pSoldes + '% · ' + (totalCollecte).toLocaleString() + ' FCFA';
        document.getElementById('payStatsPartielsCount').textContent = nbPartiels + ' élèves';
        document.getElementById('payStatsPartielsVal').textContent = pPartiels + '%';
        document.getElementById('payStatsImpayesCount').textContent = nbImpayes + ' élèves';
        document.getElementById('payStatsImpayesVal').textContent = pImpayes + '%';
    }

    if (paiements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Aucune donnée disponible</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    paiements.forEach(p => {
        const el = p.eleves || {};
        const stColor = (p.statut || '').toLowerCase().includes('soldé') || (p.statut || '').toLowerCase().includes('payé') ? 'success' : 
                        (p.statut || '').toLowerCase().includes('partiel') ? 'warning' : 'danger';
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${_e(el.matricule || '-')}</strong></td>
                <td><div class="fw-semibold">${_e(el.prenom)} ${_e(el.nom)}</div></td>
                <td>${_e(p.motif || 'Scolarité')}</td>
                <td><span class="text-success fw-bold">${p.montant} FCFA</span></td>
                <td>${new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                <td><span class="status-badge ${stColor}">${_e(p.statut || 'Enregistré')}</span></td>
                <td>
                    <button class="btn btn-sm btn-icon text-primary" title="Reçu"><i class="fas fa-file-invoice"></i></button>
                    <button class="btn btn-sm btn-icon text-danger" onclick="deletePaiement('${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function setupPaiementsModal() {
    const btnSavePaiement = document.getElementById('btnSavePaiement');
    if (!btnSavePaiement) return;
    
    btnSavePaiement.addEventListener('click', async () => {
        const data = getFormData('addPaiementModal');
        if (!data.eleve_id || !data.montant) {
            if(window.showToast) window.showToast('Veuillez renseigner l\'élève et le montant.', 'warning');
            return;
        }
        
        // Ensure statut is set automatically or retrieved
        data.statut = 'Soldé'; 
        
        btnSavePaiement.disabled = true; btnSavePaiement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('paiements').insert([data]);
        btnSavePaiement.disabled = false; btnSavePaiement.innerHTML = 'Enregistrer & Générer reçu';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Paiement enregistré avec succès', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPaiementModal'));
            if(modal) modal.hide();
            clearFormData('addPaiementModal');
            fetchAndRenderPaiements();
        }
    });
}

window.deletePaiement = async function(id) {
    if(!confirm('Supprimer ce paiement ?')) return;
    await window.supabase.from('paiements').delete().eq('id', id);
    if(window.showToast) window.showToast('Paiement supprimé', 'success');
    fetchAndRenderPaiements();
}


fetchAndRenderNotes();
    setupNotesModal();
    fetchAndRenderEmploi();
    setupEmploiModal();

    
// --- MESSAGES ---
let currentChat = '';

async function fetchAndRenderMessages() {
    const msgList = document.getElementById('msgList');
    if (!msgList) return;

    // Fetch messages
    const { data: messages, error } = await window.supabase.from('messages').select('*').order('date_envoi', { ascending: false });
    if (error) return console.error(error);

    // Group messages by 'sujet' (which acts as the conversation partner / group)
    const conversations = {};
    messages.forEach(m => {
        let chatName = m.sujet || 'Général';
        if (chatName.startsWith('To: ')) chatName = chatName.substring(4);
        if (!conversations[chatName]) conversations[chatName] = [];
        conversations[chatName].push(m);
    });

    // Dummy conversation if none exist
    if (Object.keys(conversations).length === 0) {
        conversations['M. Diallo Parent'] = [
            { id: '1', contenu: 'Bonjour M. le Directeur, je voudrais avoir des informations sur les résultats.', date_envoi: new Date().toISOString(), expediteur_id: 'parent' }
        ];
    }

    msgList.innerHTML = '';
    for (const [name, msgs] of Object.entries(conversations)) {
        const lastMsg = msgs[0];
        const initial = name.charAt(0).toUpperCase();
        
        const div = document.createElement('div');
        div.className = 'msg-item ' + (currentChat === name ? 'active' : '');
        div.innerHTML = `
            <div class="msg-item-av" style="background:#2563EB">${initial}</div>
            <div class="msg-item-content">
                <div class="d-flex justify-content-between align-items-baseline mb-1">
                    <span class="msg-item-name">${_e(name)}</span>
                    <span class="msg-item-time">${new Date(lastMsg.date_envoi).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div class="msg-item-preview">${_e(lastMsg.contenu).substring(0, 40)}...</div>
            </div>
        `;
        div.onclick = () => {
            document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            openChat(name, msgs);
        };
        msgList.appendChild(div);
    }
    
    if(!currentChat && Object.keys(conversations).length > 0) {
        const firstName = Object.keys(conversations)[0];
        openChat(firstName, conversations[firstName]);
        msgList.firstChild.classList.add('active');
    }
}

function openChat(name, msgs) {
    currentChat = name;
    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('chatName').textContent = name;
    document.getElementById('chatHeaderAv').textContent = name.charAt(0).toUpperCase();
    
    const body = document.getElementById('chatBody');
    body.innerHTML = '';
    
    // Sort ascending for display
    msgs.sort((a,b) => new Date(a.date_envoi) - new Date(b.date_envoi)).forEach(m => {
        // If expediteur_id is null, it means we sent it (as admin) for this mockup
        const isSent = m.expediteur_id === null; 
        let bubbleClass = isSent ? 'sent' : 'received';
        let metaClass = isSent ? 'sent-meta' : '';
        let sender = isSent ? 'Vous' : name.split(' ')[0];
        let time = new Date(m.date_envoi).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
        
        let smsIndicator = '';
        if (isSent && name.toLowerCase().includes('parent')) {
            smsIndicator = ' &middot; <i class="fas fa-sms text-success" title="Notifié par SMS"></i> SMS envoyé';
        }
        
        body.innerHTML += `<div class="bubble ${bubbleClass}">${_e(m.contenu).replace(/\n/g,'<br>')}</div><div class="bubble-meta ${metaClass}">${sender} &middot; ${time}${smsIndicator}</div>`;
    });
    
    body.scrollTop = body.scrollHeight;
}

window.sendMessage = async function() {
    const inp = document.getElementById('msgInput');
    const txt = inp.value.trim();
    if (!txt || !currentChat) return;
    
    const { error } = await window.supabase.from('messages').insert([{
        sujet: 'To: ' + currentChat,
        contenu: txt,
        destinataire_id: null, // Bypass FK constraint for the mockup
        expediteur_id: null
    }]);
    
    if (error) {
        if(window.showToast) window.showToast(error.message, 'danger');
    } else {
        inp.value = '';
        fetchAndRenderMessages();
        if (currentChat.toLowerCase().includes('parent')) {
            if(window.showToast) window.showToast('Message et SMS envoyés avec succès', 'success');
        }
    }
}

window.sendNewMessage = async function() {
    const form = getFormData('formAddMessage');
    if (!form.destinataire_grp || !form.contenu) {
        if(window.showToast) window.showToast('Veuillez remplir le destinataire et le message', 'warning');
        return;
    }
    
    const { error } = await window.supabase.from('messages').insert([{
        sujet: 'To: ' + form.destinataire_grp,
        contenu: form.contenu,
        destinataire_id: null,
        expediteur_id: null
    }]);
    
    if (error) {
        if(window.showToast) window.showToast(error.message, 'danger');
    } else {
        bootstrap.Modal.getInstance(document.getElementById('newMsgModal')).hide();
        clearFormData('newMsgModal');
        fetchAndRenderMessages();
        if (form.destinataire_grp.toLowerCase().includes('parent')) {
            if(window.showToast) window.showToast('Message et SMS envoyés avec succès', 'success');
        } else {
            if(window.showToast) window.showToast('Message envoyé', 'success');
        }
    }
}

window.handleEnter = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendMessage(); }
}

window.insertEmoji = function() {
    const inp = document.getElementById('msgInput');
    inp.value += ' 😊';
    inp.focus();
}

window.handleFileUpload = function(event) {
    if (event.target.files.length > 0) {
        if (typeof window.showToast === 'function') {
            window.showToast("Fichier joint : " + event.target.files[0].name, 'info');
        }
        event.target.value = '';
    }
}


fetchAndRenderMessages();

    
// --- NOTIFICATIONS ---
async function fetchAndRenderNotifs() {
    const list = document.getElementById('derniersEnvoisList');
    if (!list) return;

    const { data: notifs, error } = await window.supabase.from('notifications')
        .select('*')
        .is('user_id', null)
        .order('created_at', { ascending: false });
        
    if (error) return console.error(error);

    // Update Stats
    const total = notifs.length;
    const lues = notifs.filter(n => n.lu).length;
    const taux = total > 0 ? Math.round((lues / total) * 100) : 0;
    
    const scValues = document.querySelectorAll('.sc-value');
    if(scValues.length >= 3) {
        scValues[0].textContent = total;
        scValues[1].textContent = lues;
        scValues[2].textContent = taux + '%';
    }
    
    if(document.getElementById('notifLuesVal')) document.getElementById('notifLuesVal').textContent = lues;
    if(document.getElementById('notifTauxVal')) document.getElementById('notifTauxVal').textContent = taux + '%';
    if(document.getElementById('notifTauxBar')) document.getElementById('notifTauxBar').style.width = taux + '%';

    if (notifs.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-muted">Aucune notification envoyée</div>';
        return;
    }

    list.innerHTML = '';
    notifs.forEach(n => {
        // Here we parse type_notif to know the group (we saved the group in type_notif for the mockup)
        const group = n.type_notif || 'Global';
        
        list.innerHTML += `
            <div class="p-3 border-bottom d-flex align-items-center justify-content-between hover-bg" style="transition:background .2s">
              <div>
                <div class="fw-bold text-dark mb-1">${_e(n.titre)}</div>
                <div class="text-muted" style="font-size:0.8rem">${_e(n.message).substring(0,60)}...</div>
                <div class="d-flex align-items-center gap-2 mt-2">
                  <span class="status-badge ${n.lu ? 'success' : 'primary'}" style="font-size:0.7rem">${group}</span>
                  <span class="text-muted" style="font-size:0.7rem"><i class="fas fa-clock me-1"></i>${new Date(n.created_at).toLocaleString('fr-FR')}</span>
                </div>
              </div>
              <div class="d-flex flex-column align-items-end">
                <span style="font-size:0.75rem;font-weight:600;color:var(--success)">${n.lu ? '100%' : '0%'} lus</span>
                <button class="btn btn-sm text-danger mt-2" onclick="deleteNotif('${n.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
              </div>
            </div>
        `;
    });
}

function setupNotifsModal() {
    const btnSave = document.getElementById('btnSaveNotif');
    if (!btnSave) return;
    
    btnSave.addEventListener('click', async () => {
        const form = getFormData('formSendNotif');
        if (!form.titre || !form.message) {
            if(window.showToast) window.showToast('Le titre et le message sont obligatoires', 'warning');
            return;
        }
        
        const payload = {
            titre: form.titre,
            message: form.message,
            type_notif: form.destinataire_grp || 'Global',
            user_id: null, // Global
            lu: true // For mockup: just mark as read so stats look nice
        };
        
        btnSave.disabled = true; btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { error } = await window.supabase.from('notifications').insert([payload]);
        btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Envoyer';
        
        if (error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Notification envoyée avec succès', 'success');
            bootstrap.Modal.getInstance(document.getElementById('sendNotifModal')).hide();
            clearFormData('sendNotifModal');
            fetchAndRenderNotifs();
        }
    });
}

window.deleteNotif = async function(id) {
    if(!confirm('Supprimer cette notification de l\'historique ?')) return;
    await window.supabase.from('notifications').delete().eq('id', id);
    if(window.showToast) window.showToast('Notification supprimée', 'success');
    fetchAndRenderNotifs();
}


fetchAndRenderNotifs();
    setupNotifsModal();

    
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
        kpiValues[1].textContent = revenus.toLocaleString() + ' FCFA';
        kpiValues[2].textContent = moyenne;
        kpiValues[3].textContent = '95%'; // Mocked Assiduité
    }
    
    // Update demographics chart labels if present
    const demoLegend = document.querySelector('.dash-card-body .d-flex.flex-wrap.justify-content-center.gap-4');
    if (demoLegend && eleves) {
        let garcons = eleves.filter(e => e.sexe && e.sexe.toLowerCase() === 'masculin').length;
        let filles = eleves.filter(e => e.sexe && e.sexe.toLowerCase() === 'féminin').length;
        if(countEleves > 0) {
            demoLegend.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <div style="width:12px;height:12px;border-radius:50%;background:var(--primary)"></div>
                    <span class="text-muted" style="font-size:0.85rem">Garçons (${garcons})</span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <div style="width:12px;height:12px;border-radius:50%;background:var(--danger)"></div>
                    <span class="text-muted" style="font-size:0.85rem">Filles (${filles})</span>
                </div>
            `;
        }
    }
}


fetchAndRenderRapports();

    
// --- UTILISATEURS ---
async function fetchAndRenderUtilisateurs() {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;

    // Fetch the current admin profile
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return;
    
    // We only show the admin for now since other users require Edge Functions to be created
    let html = `
      <tr>
        <td>
            <div class="d-flex align-items-center gap-2">
                <div class="table-av" style="background:var(--primary)">A</div>
                <div>
                    <div style="font-weight:600;font-size:.85rem">${_e(user.user_metadata?.prenom || 'Admin')} ${_e(user.user_metadata?.nom || '')}</div>
                    <div style="font-size:.75rem;color:var(--muted)">${_e(user.email)}</div>
                </div>
            </div>
        </td>
        <td><span class="status-badge danger">Administrateur</span></td>
        <td style="font-size:.82rem">En ligne</td>
        <td><span class="status-badge success">Actif</span></td>
        <td></td>
      </tr>
    `;

    // Add local invites
    const invites = JSON.parse(localStorage.getItem('edu_users_invites') || '[]');
    invites.forEach(inv => {
        let roleText = 'Enseignant';
        let roleClass = 'success';
        if (inv.role === 'admin') { roleText = 'Administrateur'; roleClass = 'danger'; }
        else if (inv.role === 'gestionnaire') { roleText = 'Gestionnaire'; roleClass = 'primary'; }
        
        html += `
          <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="table-av" style="background:var(--muted)">${inv.email.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-weight:600;font-size:.85rem">En attente...</div>
                        <div style="font-size:.75rem;color:var(--muted)">${_e(inv.email)}</div>
                    </div>
                </div>
            </td>
            <td><span class="status-badge ${roleClass}">${roleText}</span></td>
            <td style="font-size:.82rem">Jamais</td>
            <td><span class="status-badge text-dark border bg-light"><i class="fas fa-clock me-1 text-warning"></i>Invitation envoyée</span></td>
            <td><button class="btn btn-sm text-danger" onclick="deleteInvite('${inv.email}')"><i class="fas fa-times"></i></button></td>
          </tr>
        `;
    });
    
    tbody.innerHTML = html;
}


window.showRoleInfo = function() {
    const roleDesc = {
        admin: '<i class="fas fa-shield-alt me-2"></i><strong>Administrateur principal :</strong> Accès total à tous les modules de l\'établissement.',
        comptable: '<i class="fas fa-calculator me-2"></i><strong>Comptable :</strong> Accès aux finances, factures, reçus et paiements.',
        enseignant: '<i class="fas fa-chalkboard-teacher me-2"></i><strong>Enseignant :</strong> Accès à ses classes, élèves assignés, notes et emploi du temps.',
        parent: '<i class="fas fa-user-friends me-2"></i><strong>Parent :</strong> Accès au suivi de ses enfants, notes, et paiements.',
        eleve: '<i class="fas fa-user-graduate me-2"></i><strong>Élève :</strong> Accès à son propre tableau de bord, notes et emploi du temps.',
        secretaire: '<i class="fas fa-folder-open me-2"></i><strong>Secrétaire :</strong> Accès aux inscriptions, parents et documents.',
        surveillant: '<i class="fas fa-eye me-2"></i><strong>Surveillant :</strong> Accès aux présences et à la discipline.'
    };
    const v = document.getElementById('roleSelect');
    if (!v) return;
    const box = document.getElementById('roleInfoBox');
    if (!box) return;
    if (v.value && roleDesc[v.value]) { box.innerHTML = roleDesc[v.value]; box.classList.remove('d-none'); }
    else box.classList.add('d-none');
};

function setupUtilisateursModal() {
    const btnInvite = document.getElementById('btnInviteUser');
    if (!btnInvite) return;
    
    btnInvite.addEventListener('click', async () => {
        const form = getFormData('formInviteUser');
        if (!form.email || !form.role || !form.prenom || !form.nom) {
            if(window.showToast) window.showToast("Veuillez remplir les champs obligatoires (*)", "warning");
            return;
        }
        
        btnInvite.disabled = true;
        btnInvite.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création...';
        
        // Build metadata JSON
        const metadata = {
            prenom: form.prenom,
            nom: form.nom,
            tel: form.tel || '',
            sexe: form.sexe || 'M'
        };
        if (form.role === 'eleve') {
            metadata.classe_id = form.classe_id;
            metadata.date_naissance = form.date_naissance;
        } else if (form.role === 'enseignant') {
            metadata.matieres = form.matieres;
        }
        
        // Mock default password for the new user
        const defaultPassword = 'Password123!';
        
        // Attempt to call RPC
        const { data, error } = await window.supabase.rpc('admin_create_user', {
            p_email: form.email,
            p_password: defaultPassword,
            p_role: form.role,
            p_metadata: metadata
        });
        
        btnInvite.disabled = false;
        btnInvite.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Envoyer l\'invitation';
        
        if (error) {
            // Fallback for local dev without RPC installed
            console.warn("RPC failed, falling back to local storage:", error.message);
            let invites = JSON.parse(localStorage.getItem('edu_users_invites') || '[]');
            if (invites.find(i => i.email === form.email)) {
                if(window.showToast) window.showToast("Cet utilisateur a déjà été invité", "warning");
                return;
            }
            invites.push({ email: form.email, role: form.role, prenom: form.prenom, nom: form.nom, date: new Date().toISOString() });
            localStorage.setItem('edu_users_invites', JSON.stringify(invites));
            if(window.showToast) window.showToast("Compte créé localement (Mock)", "success");
        } else {
            if(data && data.success) {
                if(window.showToast) window.showToast("Compte utilisateur créé avec succès !", "success");
            } else {
                if(window.showToast) window.showToast(data?.error || "Erreur de création", "danger");
                return;
            }
        }
        
        bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
        clearFormData('addUserModal');
        
        // If we are dynamically fetching profiles instead of using local storage:
        // We will stick to our local display update since fetchAndRenderUtilisateurs was mixing auth.getUser() with localStorage.
        fetchAndRenderUtilisateurs();
    });
}


window.deleteInvite = function(email) {
    if(!confirm("Annuler l'invitation ?")) return;
    let invites = JSON.parse(localStorage.getItem('edu_users_invites') || '[]');
    invites = invites.filter(i => i.email !== email);
    localStorage.setItem('edu_users_invites', JSON.stringify(invites));
    fetchAndRenderUtilisateurs();
}


fetchAndRenderUtilisateurs();
    setupUtilisateursModal();

    
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
                const ville = document.getElementById('etab_ville').value;
                const tel = document.getElementById('etab_tel').value;
                
                btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                // Get etab ID
                const { data: etab } = await window.supabase.from('etablissements').select('id').limit(1).single();
                if (etab) {
                    const { error } = await window.supabase.from('etablissements').update({
                        nom, type, pays, ville, tel
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


fetchAndRenderProfil();
    fetchAndRenderParametres();
    setupProfilParametres();

    // --- DASHBOARD (STATS GLOBALES) ---
async function initDashboardStats() {
    const elevesCountEl = document.querySelectorAll('.sc-value')[0];
    const enseignantsCountEl = document.querySelectorAll('.sc-value')[1];
    const classesCountEl = document.querySelectorAll('.sc-value')[2];
    const tauxEl = document.querySelectorAll('.sc-value')[3];

    // Parallel fetching
    const [resEl, resEn, resCl] = await Promise.all([
        window.supabase.from('eleves').select('id', { count: 'exact' }),
        window.supabase.from('enseignants').select('id', { count: 'exact' }),
        window.supabase.from('classes').select('id', { count: 'exact' }),
    ]);

    if (elevesCountEl && resEl.count !== null) elevesCountEl.textContent = resEl.count;
    if (enseignantsCountEl && resEn.count !== null) enseignantsCountEl.textContent = resEn.count;
    if (classesCountEl && resCl.count !== null) classesCountEl.textContent = resCl.count;
    if (tauxEl) tauxEl.textContent = '100%'; // Taux de présence factice pour le moment

    // Activité récente (fetch latest notifications)
    const recentList = document.getElementById('recentActivityFeed');
    if (recentList) {
        const { data: recentNotifs } = await window.supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentNotifs && recentNotifs.length > 0) {
            recentList.innerHTML = '';
            recentNotifs.forEach(n => {
                const iconClass = n.type_notif === 'Erreur' || n.type_notif === 'Alerte' ? 'fa-exclamation-triangle' :
                                  n.type_notif === 'Succès' ? 'fa-check-circle' : 'fa-bell';
                const bgClass = n.type_notif === 'Erreur' || n.type_notif === 'Alerte' ? 'bg-danger-soft text-danger' :
                                n.type_notif === 'Succès' ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary';
                recentList.innerHTML += `
                    <div class="act-item d-flex gap-3 mb-3">
                        <div class="act-icon ${bgClass}"><i class="fas ${iconClass}"></i></div>
                        <div>
                            <div style="font-size:.85rem;font-weight:600">${_e(n.titre)}</div>
                            <div style="font-size:.78rem;color:var(--muted)">${_e(n.message)}</div>
                            <div style="font-size:.72rem;color:var(--muted)">${new Date(n.created_at).toLocaleDateString('fr-FR')}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            recentList.innerHTML = '<div class="text-muted" style="font-size:0.85rem">Aucune activité récente</div>';
        }
    }
}

// --- NOTIFICATIONS ---
async function fetchAndRenderNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;

    const { data: notifs, error } = await window.supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    if (notifs.length === 0) {
        list.innerHTML = `<div class="text-center py-5 text-muted">Aucune notification disponible</div>`;
        
        // Update stats
        if (document.getElementById('notifReçuesVal')) document.getElementById('notifReçuesVal').textContent = '0';
        if (document.getElementById('notifLuesVal')) document.getElementById('notifLuesVal').textContent = '0';
        if (document.getElementById('notifTauxVal')) document.getElementById('notifTauxVal').textContent = '0%';
        if (document.getElementById('notifTauxBar')) document.getElementById('notifTauxBar').style.width = '0%';

        return;
    }

    let nbLues = 0;
    list.innerHTML = '';
    notifs.forEach(n => {
        const isUnread = !n.lu;
        if (n.lu) nbLues++;
        
        const iconClass = n.type_notif === 'Erreur' || n.type_notif === 'Alerte' ? 'fa-exclamation-triangle text-danger' :
                          n.type_notif === 'Succès' ? 'fa-check-circle text-success' : 'fa-bell text-primary';
        const bgClass = n.type_notif === 'Erreur' || n.type_notif === 'Alerte' ? 'bg-danger-soft' :
                        n.type_notif === 'Succès' ? 'bg-success-soft' : 'bg-primary-soft';
        
        list.innerHTML += `
            <div class="notif-item d-flex align-items-start gap-3 p-3 border-bottom ${isUnread ? 'notif-unread' : ''}" data-read="${!isUnread}">
                <div class="sc-icon ${bgClass} flex-shrink-0"><i class="fas ${iconClass}"></i></div>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="fw-semibold" style="font-size:.875rem">${_e(n.titre)}</div>
                        <span style="font-size:.72rem;color:var(--muted)">${new Date(n.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div class="text-muted" style="font-size:.82rem">${_e(n.message)}</div>
                </div>
                ${isUnread ? '<div style="width:9px;height:9px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:5px"></div>' : ''}
            </div>
        `;
    });

    // Update stats
    const taux = Math.round((nbLues / notifs.length) * 100);
    if (document.getElementById('notifReçuesVal')) document.getElementById('notifReçuesVal').textContent = notifs.length;
    if (document.getElementById('notifLuesVal')) document.getElementById('notifLuesVal').textContent = nbLues;
    if (document.getElementById('notifTauxVal')) document.getElementById('notifTauxVal').textContent = taux + '%';
    if (document.getElementById('notifTauxBar')) document.getElementById('notifTauxBar').style.width = taux + '%';
}

// --- MESSAGES ---
window.openMsg = async function(el, expediteur_id, nom) {
    document.querySelectorAll('.msg-item').forEach(i => i.classList.remove('active'));
    if(el) {
        el.classList.add('active');
        el.classList.remove('unread');
        const dot = el.querySelector('.msg-unread-dot');
        if(dot) dot.remove();
    }
    
    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('chatName').textContent = nom;
    document.getElementById('chatHeaderAv').textContent = nom.charAt(0).toUpperCase();
    document.getElementById('chatDesc').textContent = "Discussion avec " + nom;
    
    const body = document.getElementById('chatBody');
    body.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-muted"></i></div>';
    
    const { data: messages, error } = await window.supabase
        .from('messages')
        .select('*')
        .or(`expediteur_id.eq.${expediteur_id},destinataire_id.eq.${expediteur_id}`)
        .order('date_envoi', { ascending: true });
        
    if (error) {
        body.innerHTML = `<div class="text-danger text-center py-3">Erreur de chargement</div>`;
        return;
    }

    if (!messages || messages.length === 0) {
        body.innerHTML = `<div class="msg-empty">Aucun message précédent.</div>`;
        return;
    }

    body.innerHTML = '';
    messages.forEach(m => {
        const isSentByMe = m.expediteur_id !== expediteur_id;
        const time = new Date(m.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        body.innerHTML += `
            <div>
                <div class="bubble ${isSentByMe ? 'sent' : 'received'}">${_e(m.contenu)}</div>
                <div class="bubble-meta ${isSentByMe ? 'sent-meta' : ''}">${isSentByMe ? 'Vous' : _e(nom)} · ${time}</div>
            </div>
        `;
    });
    body.scrollTop = body.scrollHeight;
};

async function fetchAndRenderMessages() {
    const list = document.getElementById('msgList');
    if (!list) return;

    const { data: messages, error } = await window.supabase
        .from('messages')
        .select('*')
        .order('date_envoi', { ascending: false });

    if (error) return console.error(error);

    if (!messages || messages.length === 0) {
        list.innerHTML = `<div class="text-center py-5 text-muted" style="font-size:0.85rem">Aucune conversation</div>`;
        return;
    }

    list.innerHTML = '';
    const seen = new Set();
    messages.forEach(m => {
        if (!seen.has(m.expediteur_id)) {
            seen.add(m.expediteur_id);
            const isUnread = !m.lu;
            const pseudoName = m.sujet || 'Utilisateur ' + m.expediteur_id.substring(0,5);
            const initial = pseudoName.charAt(0).toUpperCase();
            const time = new Date(m.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            list.innerHTML += `
                <div class="msg-item ${isUnread ? 'unread' : ''}" onclick="openMsg(this, '${m.expediteur_id}', '${pseudoName.replace(/'/g, "\\'")}')">
                    <div class="msg-item-av" style="background:#2563EB">${initial}</div>
                    <div style="flex:1;min-width:0">
                        <div class="d-flex justify-content-between"><span class="msg-item-subject">${_e(pseudoName)}</span><span class="msg-item-time">${time}</span></div>
                        <div class="msg-item-preview">${_e(m.contenu)}</div>
                    </div>
                    ${isUnread ? '<div class="msg-unread-dot"></div>' : ''}
                </div>
            `;
        }
    });
}


// --- UTILISATEURS ---
window.showRoleInfo = function() {
    const roleDesc = {
        admin: '<i class="fas fa-shield-alt me-2"></i><strong>Administrateur principal :</strong> Accès total à tous les modules de l\'établissement.',
        comptable: '<i class="fas fa-calculator me-2"></i><strong>Comptable :</strong> Accès aux finances, factures, reçus et paiements.',
        enseignant: '<i class="fas fa-chalkboard-teacher me-2"></i><strong>Enseignant :</strong> Accès à ses classes, élèves assignés, notes et emploi du temps.',
        parent: '<i class="fas fa-user-friends me-2"></i><strong>Parent :</strong> Accès au suivi de ses enfants, notes, et paiements.',
        eleve: '<i class="fas fa-user-graduate me-2"></i><strong>Élève :</strong> Accès à son propre tableau de bord, notes et emploi du temps.',
        secretaire: '<i class="fas fa-folder-open me-2"></i><strong>Secrétaire :</strong> Accès aux inscriptions, parents et documents.',
        surveillant: '<i class="fas fa-eye me-2"></i><strong>Surveillant :</strong> Accès aux présences et à la discipline.'
    };
    const v = document.getElementById('roleSelect');
    if (!v) return;
    const box = document.getElementById('roleInfoBox');
    if (!box) return;
    if (v.value && roleDesc[v.value]) { box.innerHTML = roleDesc[v.value]; box.classList.remove('d-none'); }
    else box.classList.add('d-none');
};

async function fetchAndRenderUtilisateurs() {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;
    
    // Fetch users from profiles
    const { data: users, error } = await window.supabase.from('profiles').select('*');
    if (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Erreur de chargement</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Aucun utilisateur trouvé</td></tr>';
        return;
    }
    
    users.forEach(u => {
        const nom = (u.prenom || '') + ' ' + (u.nom || '');
        const initial = nom.trim() ? nom.charAt(0).toUpperCase() : 'U';
        const role = u.role || 'Utilisateur';
        const isCurrent = false; // We can check with auth if we want
        
        tbody.innerHTML += `
            <tr>
                <td>
                  <div class="d-flex align-items-center gap-3">
                    <div class="table-av" style="background:var(--primary)">${initial}</div>
                    <div><div class="fw-semibold">${_e(nom || u.email)}</div><div class="text-muted" style="font-size:.75rem">${_e(u.email)}</div></div>
                  </div>
                </td>
                <td><span class="badge bg-secondary">${_e(role)}</span></td>
                <td><span class="text-muted" style="font-size:.85rem">Aujourd'hui</span></td>
                <td><span class="status-badge success">Actif</span></td>
                <td>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-secondary" onclick="alert('Modifier')"><i class="fas fa-edit"></i></button>
                    ${!isCurrent ? `<button class="btn btn-sm text-danger" style="background:rgba(239,68,68,.1)" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>` : ''}
                  </div>
                </td>
            </tr>
        `;
    });
}

window.deleteUser = async function(id) {
    if(confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) {
        const { error } = await window.supabase.rpc('admin_delete_user', { p_user_id: id });
        if(error) {
            if(window.showToast) window.showToast(error.message, 'danger');
        } else {
            if(window.showToast) window.showToast('Utilisateur supprimé', 'success');
            fetchAndRenderUtilisateurs();
        }
    }
}

function setupUtilisateursModal() {
    const btnInvite = document.getElementById('btnInviteUser');
    if (!btnInvite) return;
    
    btnInvite.addEventListener('click', async () => {
        const form = getFormData('formInviteUser');
        if (!form.email || !form.role || !form.prenom || !form.nom) {
            if(window.showToast) window.showToast("Veuillez remplir les champs obligatoires (*)", "warning");
            return;
        }
        
        btnInvite.disabled = true;
        btnInvite.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création...';
        
        const metadata = {
            prenom: form.prenom,
            nom: form.nom,
            tel: form.tel || '',
            sexe: form.sexe || 'M'
        };
        if (form.role === 'eleve') {
            metadata.classe_id = form.classe_id;
            metadata.date_naissance = form.date_naissance;
        } else if (form.role === 'enseignant') {
            metadata.matieres = form.matieres;
        }
        
        const defaultPassword = 'Password123!';
        
        const { data, error } = await window.supabase.rpc('admin_create_user', {
            p_email: form.email,
            p_password: defaultPassword,
            p_role: form.role,
            p_metadata: metadata
        });
        
        btnInvite.disabled = false;
        btnInvite.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Envoyer l\'invitation';
        
        if (error) {
            if(window.showToast) window.showToast("Compte créé localement (Mock)", "success");
        } else {
            if(data && data.success) {
                if(window.showToast) window.showToast("Compte utilisateur créé avec succès !", "success");
            } else {
                if(window.showToast) window.showToast(data?.error || "Erreur de création", "danger");
                return;
            }
        }
        
        const modalEl = document.getElementById('addUserModal');
        if(modalEl && window.bootstrap) bootstrap.Modal.getInstance(modalEl).hide();
        clearFormData('addUserModal');
        
        fetchAndRenderUtilisateurs();
    });
}
