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
        // setupClassesModal();
        setupRealtime('classes', fetchAndRenderClasses);
    }
    // ----- PAIEMENTS -----
    else if (path.includes('paiements.html')) {
        await fetchAndRenderPaiements();
        // setupPaiementsModal();
        setupRealtime('paiements', fetchAndRenderPaiements);
    }
    // ----- NOTES -----
    else if (path.includes('notes.html')) {
        await fetchAndRenderNotes();
        // setupNotesModal();
        setupRealtime('notes', fetchAndRenderNotes);
    }
    // ----- NOTIFICATIONS -----
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

// --- ÉLÈVES ---
async function fetchAndRenderEleves() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('elevesBody');
    if (!tbody) return;

    const { data: eleves, error } = await window.supabase
        .from('eleves')
        .select(`*, classes(nom)`);

    if (error) {
        console.error(error);
        return;
    }

    // Mettre à jour le compteur global
    document.querySelectorAll('.sc-value').forEach(el => el.textContent = eleves.length);

    if (eleves.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Aucune donnée disponible</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    eleves.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input class="form-check-input row-check" type="checkbox"></td>
            <td><div class="d-flex align-items-center"><div class="table-av me-2" style="background:#2563EB">${e.prenom.charAt(0)}</div><span class="fw-semibold">${_e(e.prenom)} ${_e(e.nom)}</span></div></td>
            <td>${_e(e.matricule || '-')}</td>
            <td>${_e(e.classes ? e.classes.nom : 'Non assigné')}</td>
            <td>${_e(e.parent_nom || '-')}</td>
            <td>${_e(e.parent_tel || '-')}</td>
            <td><span class="status-badge ${e.statut_paiement === 'À jour' ? 'success' : 'warning'}">${_e(e.statut_paiement || 'Inconnu')}</span></td>
            <td>
                <button class="btn btn-sm btn-icon text-primary"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-icon text-muted"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-icon text-danger" onclick="deleteEleve('${e.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupElevesModal() {
    // Ajouter un élève
    const modal = document.getElementById('addEleveModal');
    if (!modal) return;
    const saveBtn = modal.querySelector('.modal-footer .btn-primary');
    saveBtn.addEventListener('click', async () => {
        const inputs = modal.querySelectorAll('input, select');
        
        const newEleve = {
            prenom: inputs[0].value,
            nom: inputs[1].value,
            // classe (besoin d'ID, simplifié ici)
            date_naissance: inputs[3].value || null,
            sexe: inputs[4].value,
            nationalite: inputs[5].value,
            adresse: inputs[6].value,
            parent_nom: inputs[7].value,
            parent_tel: inputs[8].value,
            parent_email: inputs[9].value,
        };

        const { error } = await window.supabase.from('eleves').insert([newEleve]);
        if (error) {
            alert("Erreur lors de l'ajout : " + error.message);
        } else {
            // Fermer le modal
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
            fetchAndRenderEleves();
        }
    });
}

window.deleteEleve = async function(id) {
    if(!confirm("Supprimer cet élève définitivement ?")) return;
    const { error } = await window.supabase.from('eleves').delete().eq('id', id);
    if(error) alert(error.message);
}

// --- ENSEIGNANTS ---
async function fetchAndRenderEnseignants() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('enseignantsBody');
    const gridBody = document.getElementById('ensBody');
    if (!tbody && !gridBody) return;

    const { data: enseignants, error } = await window.supabase.from('enseignants').select('*');
    
    if (error) {
        console.error(error);
        return;
    }

    document.querySelectorAll('.sc-value').forEach(el => el.textContent = enseignants.length);

    if (enseignants.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Aucune donnée disponible</td></tr>`;
        if (gridBody) gridBody.innerHTML = `<div class="col-12 text-center py-4 text-muted">Aucune donnée disponible</div>`;
        return;
    }

    if (tbody) tbody.innerHTML = '';
    if (gridBody) gridBody.innerHTML = '';
    
    enseignants.forEach(e => {
        const initiale = e.prenom ? e.prenom.charAt(0).toUpperCase() : 'E';
        const nomComplet = `${_e(e.prenom)} ${_e(e.nom)}`;
        
        // Render List
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
        
        // Render Grid
        if (gridBody) {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 ens-card';
            card.dataset.matiere = _e(e.matiere || '');
            card.dataset.name = _e(e.nom || '');
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
              <div style="font-size:.72rem;color:var(--muted)">Classes</div>
              <div style="font-size:.82rem;font-weight:600">-</div>
            </div>
            <div class="col-6">
              <div style="font-size:.72rem;color:var(--muted)">Heures/semaine</div>
              <div style="font-size:.82rem;font-weight:600">-</div>
            </div>
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
            <button class="btn btn-sm rounded-pill flex-1" style="background:rgba(37,99,235,.1);color:var(--primary);font-size:.8rem"><i class="fas fa-eye me-1"></i>Voir</button>
            <button class="btn btn-sm rounded-pill flex-1" style="background:rgba(245,158,11,.1);color:var(--warning);font-size:.8rem"><i class="fas fa-edit me-1"></i>Modifier</button>
          </div>
        </div>
            `;
            gridBody.appendChild(card);
        }
    });
}

window.deleteEnseignant = async function(id) {
    if(!confirm("Supprimer cet enseignant ?")) return;
    await window.supabase.from('enseignants').delete().eq('id', id);
}

function setupEnseignantsModal() {
    const modal = document.getElementById('addEnseignantModal');
    if (!modal) return;
    const saveBtn = modal.querySelector('.modal-footer .btn-primary');
    saveBtn.addEventListener('click', async () => {
        const inputs = modal.querySelectorAll('input, select');
        
        const newE = {
            prenom: inputs[0].value,
            nom: inputs[1].value,
            matiere: inputs[2].value,
            tel: inputs[3].value,
            email: inputs[4].value,
        };

        const { error } = await window.supabase.from('enseignants').insert([newE]);
        if (error) alert("Erreur : " + error.message);
        else {
            bootstrap.Modal.getInstance(modal).hide();
            fetchAndRenderEnseignants();
        }
    });
}


// --- CLASSES ---
async function fetchAndRenderClasses() {
    const container = document.getElementById('classesContainer');
    if (!container) return;

    const { data: classes, error } = await window.supabase
        .from('classes')
        .select(`*, enseignants(nom, prenom)`);
    
    if (error) return console.error(error);

    if (classes.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted">Aucune classe disponible</div>`;
        return;
    }

    container.innerHTML = '<div class="row g-3 mb-4">';
    const row = container.querySelector('.row');

    classes.forEach(c => {
        const prof = c.enseignants ? `${c.enseignants.prenom} ${c.enseignants.nom}` : 'Non assigné';
        row.innerHTML += `
        <div class="col-md-6 col-lg-3">
            <div class="dash-card p-4 h-100" style="border-top:3px solid #2563EB">
            <div class="d-flex align-items-center justify-content-between mb-3">
                <div class="fw-bold fs-6">${_e(c.nom)}</div>
                <span class="status-badge primary">0 élèves</span>
            </div>
            <div class="row g-2 mb-3">
                <div class="col-12"><div class="text-muted" style="font-size:.72rem">Professeur principal</div><div style="font-size:.82rem;font-weight:600">${_e(prof)}</div></div>
                <div class="col-12"><div class="text-muted" style="font-size:.72rem">Niveau</div><div style="font-size:.82rem;font-weight:600">${_e(c.niveau || '-')}</div></div>
            </div>
            <div class="d-flex gap-2 mt-3">
                <a href="eleves.html" class="btn btn-sm flex-1 rounded-pill" style="background:rgba(37,99,235,.1);color:var(--primary);font-size:.78rem"><i class="fas fa-users me-1"></i>Élèves</a>
                <button class="btn btn-sm btn-icon text-danger" onclick="deleteClasse('${c.id}')"><i class="fas fa-trash"></i></button>
            </div>
            </div>
        </div>`;
    });
}
window.deleteClasse = async function(id) {
    if(!confirm("Supprimer cette classe ?")) return;
    await window.supabase.from('classes').delete().eq('id', id);
}

// --- PAIEMENTS ---
async function fetchAndRenderPaiements() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('paiementsBody');
    if (!tbody) return;
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
        if (st.includes('payé') && !st.includes('impayé')) nbSoldes++;
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
        document.getElementById('payStatsSoldesVal').textContent = pSoldes + '% · ' + (totalCollecte).toLocaleString() + ' FCFA'; // Simple approximation for UI
        document.getElementById('payStatsPartielsCount').textContent = nbPartiels + ' élèves';
        document.getElementById('payStatsPartielsVal').textContent = pPartiels + '%';
        document.getElementById('payStatsImpayesCount').textContent = nbImpayes + ' élèves';
        document.getElementById('payStatsImpayesVal').textContent = pImpayes + '%';
    }

    if (paiements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Aucune donnée disponible</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    paiements.forEach(p => {
        const el = p.eleves || {};
        tbody.innerHTML += `
            <tr>
                <td><strong>${_e(el.matricule || '-')}</strong></td>
                <td><div class="fw-semibold">${_e(el.prenom)} ${_e(el.nom)}</div></td>
                <td>${_e(p.motif || 'Scolarité')}</td>
                <td><span class="text-success fw-bold">${p.montant} FCFA</span></td>
                <td>${new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                <td><span class="status-badge success">${_e(p.statut)}</span></td>
                <td>
                    <button class="btn btn-sm btn-icon text-primary" title="Reçu"><i class="fas fa-file-invoice"></i></button>
                </td>
            </tr>
        `;
    });
}

// --- NOTES ---
async function fetchAndRenderNotes() {
    const tbody = document.getElementById('dynamicBody') || document.getElementById('notesBody');
    if (!tbody) return;
    const { data: notes, error } = await window.supabase.from('notes').select('*, eleves(nom, prenom)');
    if (error) return console.error(error);

    if (notes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Aucune donnée disponible</td></tr>`;
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
window.deleteNote = async function(id) {
    if(!confirm("Supprimer cette note ?")) return;
    await window.supabase.from('notes').delete().eq('id', id);
}

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
